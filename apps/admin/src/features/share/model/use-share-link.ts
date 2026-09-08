"use client";

import { useCallback, useEffect, useState } from "react";
import { type ShareTargetType, shareTargetRule } from "@ssccops/share-meta";
import {
  type ShareLink,
  ShareOriginMissingError,
  fetchShareLink,
  issueShareLink,
  revokeShareLink,
} from "@/entities/share";
import { ApiError } from "@/shared/lib/api/client";

/*
 * 공유 링크 상태 (ssccops#200 · ssccops#250).
 *
 * **화면이 그리는 것은 두 상태뿐이다** — 공유 중이 아니거나(공유하기), 공유 중이거나(링크 복사
 * + 공유 중지). 만료가 없어(ADR-0016) '곧 죽는 링크' 같은 세 번째 상태가 없다.
 *
 * **어느 대상이든 받는다.** 대상별로 갈리는 것(서버 경로 · 오류 문구에 넣을 이름과 권한)은
 * 전부 `@ssccops/share-meta`의 표가 갖고, 이 훅은 그 표를 볼 뿐이다 — 대상이 늘어도 훅이
 * 늘지 않는다(ADR-0017).
 *
 * **한 자리만 대상의 사정을 받는다: `publicUrl`**(ssccops-web#338). 게시된 행사처럼 이미
 * 익명이 여는 주소가 있는 대상은 발급을 부르지 않고 그 주소를 건넨다. 그 판정(게시됐는가)은
 * 표가 아니라 대상을 그리는 화면이 하므로 값으로 받는다 — 표는 대상의 상태를 모른다.
 */

/** 링크를 어떻게 건넸는가 — 공유 시트로 넘겼는가, 클립보드에 복사했는가 */
export type ShareDeliveryHow = "shared" | "copied";

/**
 * 무엇을 건넸는가.
 *
 * **`how`만으로는 부족하다** — 행사처럼 건넬 것이 둘인 대상이 있다(ssccops-web#338).
 * 게시 전이면 토큰 링크(`/s/{token}`)를, 게시됐으면 공개 주소(`/events/{id}`)를 건네는데,
 * 화면이 그 둘을 같은 문구로 알리면 **운영자가 게시 전 링크를 공개 링크로 알고 뿌린다.**
 * 그래서 안내 문구를 정할 값을 여기서 함께 돌려준다.
 *
 * 건넬 것이 하나뿐인 대상(업무·하위 업무·회의)은 언제나 `"token"`이다.
 */
export type ShareDeliveryTarget = "token" | "public";

/** 링크를 건넨 결과. 화면 안내 문구가 이 값으로 갈린다 */
export type ShareDelivery = { how: ShareDeliveryHow; target: ShareDeliveryTarget } | null;

/*
 * 조회 결과를 대상과 **함께** 들고 있다.
 *
 * `ready` 플래그를 따로 두고 효과 안에서 곧바로 false로 되돌리는 쪽이 짧지만, 효과 안의 동기
 * setState는 렌더를 한 번 더 유발한다(린트가 막는 자리다). 대신 "무엇에 대한 결과인가"를 값에
 * 담아 두면 **대상이 바뀐 순간 그 결과는 자동으로 낡은 것이 되어** 따로 지울 필요가 없다.
 */
interface Loaded {
  targetType: ShareTargetType;
  targetId: number;
  link: ShareLink | null;
}

interface ShareLinkState {
  link: ShareLink | null;
  /** 이 대상에 대한 최초 조회가 끝났는가. 끝나기 전에는 두 버튼 중 무엇도 그리지 않는다 */
  ready: boolean;
  pending: boolean;
  error: string | null;
  delivery: ShareDelivery;
  share: () => Promise<void>;
  revoke: () => Promise<void>;
}

/*
 * 대상 이름 뒤에 붙는 목적격 조사.
 *
 * 대상이 늘면 받침이 섞인다("회의를"·"학술 프로그램을") — 표에 조사를 함께 적어 두면 이름을
 * 고칠 때 한쪽만 고쳐지므로 이름에서 구한다. 한글이 아닌 이름은 `를`로 둔다.
 */
function withObjectParticle(label: string): string {
  const code = label.charCodeAt(label.length - 1);
  const isHangulSyllable = code >= 0xac00 && code <= 0xd7a3;
  const hasFinalConsonant = isHangulSyllable && (code - 0xac00) % 28 !== 0;
  return `${label}${hasFinalConsonant ? "을" : "를"}`;
}

function messageOf(error: unknown, targetType: ShareTargetType): string {
  /*
   * 착지가 www인 대상인데 그 오리진 설정이 비어 있다. 서버 실패가 아니라 배포 설정 문제라
   * "잠시 후 다시"로 안내하면 사람이 영영 다시 눌러 본다 — 폼 상세가 죽은 주소를 복사해 주는
   * 대신 안내로 떨어지는 것과 같은 판단이다.
   */
  if (error instanceof ShareOriginMissingError) {
    return "공개 링크 주소가 설정되지 않았습니다 — 운영진에게 문의해 주세요";
  }
  if (error instanceof ApiError) {
    const rule = shareTargetRule(targetType);
    switch (error.code) {
      case "FORBIDDEN":
      case "AUTHORITY_REQUIRED":
        return `공유 링크를 만들 권한이 없습니다 — ${rule.readAuthority} 권한이 필요합니다`;
      case "NOT_FOUND":
        return `${withObjectParticle(rule.label)} 찾을 수 없습니다 — 이미 지워졌을 수 있습니다`;
      /*
       * 게시·보관된 행사에 발급을 요청했다 (ssccops-server#312 · 409).
       *
       * **실패가 아니라 다른 길이 있다는 안내다.** 서버가 막는 이유는 게시된 행사에 이미
       * 익명이 여는 주소가 있어 토큰이 더하는 것이 폐기 기능뿐인데 그 폐기가 원본 공개 URL을
       * 막지 못하기 때문이며, 거절이 아무 수단도 빼앗지 않는다. "잠시 후 다시"로 떨어지면
       * 사람이 영영 다시 눌러 본다.
       *
       * 화면은 이미 상태로 갈라 그리므로(`EventShareButton`) 이 문구가 나오는 것은 화면이
       * 낡았을 때뿐이다 — 열어 둔 사이 다른 운영자가 게시했거나 보관한 경우다. 그래서
       * 다음 행동이 "새로 고치기"이고, 어느 쪽으로 옮겨 갔는지는 단정하지 않는다(보관된
       * 행사는 공개 주소도 열리지 않는다).
       */
      case "EVENT_SHARE_NOT_DRAFT":
        return "게시 전 행사만 공유 링크를 만들 수 있습니다 — 이미 게시됐다면 공개 주소를 그대로 쓰면 됩니다. 화면을 새로 고쳐 주세요";
      default:
        return "공유 링크를 처리하지 못했습니다 — 잠시 후 다시 시도해 주세요";
    }
  }
  return "공유 링크를 처리하지 못했습니다 — 잠시 후 다시 시도해 주세요";
}

/*
 * 링크를 사람에게 건넨다.
 *
 * **모바일은 `navigator.share`, 데스크톱은 클립보드 복사로 갈린다.** 모바일에서 복사만 하면
 * 사용자가 메신저를 직접 열어 붙여야 하고, 데스크톱에서 공유 시트를 부르면 대부분의 브라우저가
 * 지원하지 않아 아무 일도 일어나지 않는다. `navigator.share`는 **사용자 제스처 안에서만** 부를
 * 수 있어 클릭 핸들러에서 곧바로 부른다.
 *
 * 공유 시트를 사용자가 닫으면 `AbortError`가 온다 — 그것은 실패가 아니라 취소라 오류로 알리지
 * 않고, 대신 복사로 떨어져 링크는 손에 남게 한다.
 */
async function deliver(url: string, title: string): Promise<ShareDeliveryHow> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, url });
      return "shared";
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        throw error;
      }
      // 사용자가 시트를 닫았다 — 실패가 아니므로 복사로 떨어져 링크는 손에 쥐어 준다
    }
  }
  await navigator.clipboard.writeText(url);
  return "copied";
}

export interface ShareLinkOptions {
  /**
   * 이 대상이 **이미 익명에게 열려 있는 주소**. 있으면 발급을 부르지 않고 이 주소를 건넨다.
   *
   * 게시된 행사가 그 자리다(ssccops-web#338) — 토큰을 요청해 봐야 서버가 409로 막고, 막는
   * 이유가 "이 주소면 충분하다"이기 때문이다. 값이 `null`인 것은 두 가지 뜻일 수 있어
   * (그런 주소가 없는 대상 · 오리진 설정이 비었다) 무엇을 그릴지는 부르는 화면이 정한다.
   *
   * **조회와 폐기는 이 값과 무관하다.** 게시 전에 발급한 링크는 게시 뒤에도 살아 있으므로
   * 공개 주소를 건네는 상태에서도 '공유 중지'는 그려져야 한다 — 보이지 않으면 폐기할
   * 수단이 없어진다.
   */
  publicUrl?: string | null;
}

export function useShareLink(
  targetType: ShareTargetType,
  targetId: number,
  title: string,
  options: ShareLinkOptions = {},
): ShareLinkState {
  const { publicUrl } = options;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<ShareDelivery>(null);

  useEffect(() => {
    let alive = true;
    fetchShareLink(targetType, targetId)
      .then((link) => {
        if (alive) setLoaded({ targetType, targetId, link });
      })
      .catch(() => {
        /*
         * 조회 실패는 화면에 알리지 않는다 — 공유는 부가 기능이라, 상세를 여는 것만으로 오류
         * 문구가 뜨면 정작 내용을 보러 온 사람에게 방해가 된다. 대신 '공유 중이 아니다'로
         * 두어 버튼은 그려 준다(누르는 순간의 실패는 그때 알린다).
         */
        if (alive) setLoaded({ targetType, targetId, link: null });
      });
    return () => {
      alive = false;
    };
  }, [targetType, targetId]);

  /*
   * 값 하나로 좁힌다. `ready`를 먼저 만들고 그 뒤에 `loaded.link`를 읽으면 타입이 좁혀지지
   * 않는다 — 별개의 boolean이라 컴파일러가 둘을 잇지 못한다. 대신 "지금 대상에 대한 결과"만
   * 남긴 값을 두면 `ready`와 `link`가 그 하나에서 따라 나온다.
   */
  const current =
    loaded && loaded.targetType === targetType && loaded.targetId === targetId ? loaded : null;
  const ready = current !== null;
  const link = current?.link ?? null;

  const share = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      /*
       * 이미 열려 있는 주소가 있으면 그것을 건네고 발급은 부르지 않는다. 살아 있는 토큰이
       * 함께 있을 수도 있지만(게시 전에 발급했다) **건네는 것은 공개 주소다** — 받는 사람이
       * 게시된 행사를 보는 데에 토큰이 필요하지 않고, 뿌린 링크가 폐기로 죽지도 않는다.
       */
      if (publicUrl) {
        setDelivery({ how: await deliver(publicUrl, title), target: "public" });
        return;
      }
      const issued = link ?? (await issueShareLink(targetType, targetId));
      setLoaded({ targetType, targetId, link: issued });
      setDelivery({ how: await deliver(issued.url, title), target: "token" });
    } catch (e) {
      setError(messageOf(e, targetType));
    } finally {
      setPending(false);
    }
  }, [link, publicUrl, targetType, targetId, title]);

  const revoke = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      await revokeShareLink(targetType, targetId);
      setLoaded({ targetType, targetId, link: null });
      setDelivery(null);
    } catch (e) {
      setError(messageOf(e, targetType));
    } finally {
      setPending(false);
    }
  }, [targetType, targetId]);

  return { link, ready, pending, error, delivery, share, revoke };
}
