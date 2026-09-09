"use client";

import { useCallback, useEffect, useState } from "react";
import { shareTargetRule } from "@ssccops/share-meta";
import {
  type LmsShareTargetType,
  type ShareLink,
  ShareOriginMissingError,
  fetchShareLink,
  issueShareLink,
  revokeShareLink,
} from "@/entities/share";
import { ApiError } from "@/shared/api/client";

/*
 * 공유 링크 상태 (ssccops#253 · ADR-0016 · ADR-0017).
 *
 * `apps/admin/src/features/share/model/use-share-link.ts`에서 옮겨 왔다. 상태 기계는 같다 —
 * **화면이 그리는 것은 두 상태뿐이다**(공유 전 / 공유 중). 만료가 없어(ADR-0016) '곧 죽는
 * 링크' 같은 세 번째 상태가 없다.
 *
 * ── 어드민과 갈리는 것: 알림을 스스로 들고 있는다 ─────────────
 * 어드민은 결과를 전역 토스트(`flash`)로 띄운다. **이 앱에는 전역 토스트라는 것이 없다** —
 * 화면마다 `Notice`나 `useState` 문구로 안내한다. 그래서 이 훅은 실패를 `error`로 올릴 뿐
 * 아니라 성공 안내(`notice`)까지 값으로 돌려주고, 버튼이 그것을 자기 옆에 한 줄로 그린다.
 * 어드민의 `delivery`(무엇으로 건넸는가)를 그대로 두지 않고 문구까지 만들어 주는 것도 그래서다
 * — 부르는 쪽이 하나라 문구를 두 벌로 나눌 이유가 없다.
 *
 * 안내는 잠시 뒤 스스로 사라진다. 토스트가 없는 화면에서 문구가 계속 남아 있으면 사용자는
 * 그것이 방금 한 일의 결과인지 원래 있던 안내인지 알 수 없다.
 */

const NOTICE_MS = 4000;

interface Loaded {
  targetType: LmsShareTargetType;
  targetId: number;
  link: ShareLink | null;
}

interface ShareLinkState {
  link: ShareLink | null;
  /** 이 대상에 대한 최초 조회가 끝났는가. 끝나기 전에는 두 버튼 중 무엇도 그리지 않는다 */
  ready: boolean;
  pending: boolean;
  /** 실패 안내 — 누른 순간의 실패만 담는다(최초 조회 실패는 담지 않는다) */
  error: string | null;
  /** 성공 안내 — 잠시 뒤 스스로 사라진다 */
  notice: string | null;
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

function messageOf(error: unknown, targetType: LmsShareTargetType): string {
  /*
   * 착지 오리진 설정이 비어 있다. 서버 실패가 아니라 배포 설정 문제라 "잠시 후 다시"로
   * 안내하면 사람이 영영 다시 눌러 본다.
   */
  if (error instanceof ShareOriginMissingError) {
    return "공개 링크 주소가 설정되지 않았습니다 — 운영진에게 문의해주세요";
  }
  if (error instanceof ApiError) {
    const rule = shareTargetRule(targetType);
    switch (error.code) {
      case "CLIENT_UNAUTHENTICATED":
      case "UNAUTHENTICATED":
        return "로그인이 풀렸습니다 — 다시 로그인한 뒤 시도해주세요";
      case "FORBIDDEN":
      case "AUTHORITY_REQUIRED":
        return `공유 링크를 만들 권한이 없습니다 — ${rule.readAuthority} 권한이 필요합니다`;
      case "NOT_FOUND":
        return `${withObjectParticle(rule.label)} 찾을 수 없습니다 — 이미 지워졌을 수 있습니다`;
      default:
        return "공유 링크를 처리하지 못했습니다 — 잠시 후 다시 시도해주세요";
    }
  }
  return "공유 링크를 처리하지 못했습니다 — 잠시 후 다시 시도해주세요";
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
 *
 * 돌려주는 것은 곧바로 안내 문구다. 무엇으로 건넸는지에 따라 문구가 갈린다 — 복사인데
 * "공유했습니다"라고 하면 사용자는 이미 보낸 줄 알고, 공유 시트를 띄웠는데 "복사했습니다"라고
 * 하면 붙여넣을 곳을 찾는다.
 */
async function deliver(link: ShareLink, title: string): Promise<string> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, url: link.url });
      return "공유 링크를 전달했습니다";
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) throw error;
      // 사용자가 시트를 닫았다 — 실패가 아니므로 복사로 떨어져 링크는 손에 쥐어 준다
    }
  }
  await navigator.clipboard.writeText(link.url);
  return "공유 링크를 복사했습니다 — 메신저에 붙여 넣으세요";
}

export function useShareLink(
  targetType: LmsShareTargetType,
  targetId: number,
  title: string,
): ShareLinkState {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  /* 안내는 스스로 사라진다 — 토스트가 없는 화면이라 남아 있으면 언제 것인지 알 수 없다 */
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

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
      setNotice(await deliver(issued, title));
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
      setNotice("공유를 중지했습니다 — 이 링크로는 더 이상 열리지 않습니다");
    } catch (e) {
      setError(messageOf(e, targetType));
    } finally {
      setPending(false);
    }
  }, [targetType, targetId]);

  return { link, ready, pending, error, notice, share, revoke };
}
