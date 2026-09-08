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
 */

/** 링크를 어떻게 건넸는가. 화면 안내 문구가 이 값으로 갈린다 */
export type ShareDelivery = "shared" | "copied" | null;

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
async function deliver(link: ShareLink, title: string): Promise<ShareDelivery> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, url: link.url });
      return "shared";
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        throw error;
      }
      // 사용자가 시트를 닫았다 — 실패가 아니므로 복사로 떨어져 링크는 손에 쥐어 준다
    }
  }
  await navigator.clipboard.writeText(link.url);
  return "copied";
}

export function useShareLink(
  targetType: ShareTargetType,
  targetId: number,
  title: string,
): ShareLinkState {
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
      const issued = link ?? (await issueShareLink(targetType, targetId));
      setLoaded({ targetType, targetId, link: issued });
      setDelivery(await deliver(issued, title));
    } catch (e) {
      setError(messageOf(e, targetType));
    } finally {
      setPending(false);
    }
  }, [link, targetType, targetId, title]);

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
