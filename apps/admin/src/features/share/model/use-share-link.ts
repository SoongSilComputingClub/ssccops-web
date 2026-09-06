"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type ShareLink,
  fetchSubWorkShareLink,
  issueSubWorkShareLink,
  revokeSubWorkShareLink,
} from "@/entities/share";
import { ApiError } from "@/shared/lib/api/client";

/*
 * 하위 업무 공유 링크 상태 (ssccops#200).
 *
 * **화면이 그리는 것은 두 상태뿐이다** — 공유 중이 아니거나(공유하기), 공유 중이거나(링크 복사
 * + 공유 중지). 만료가 없어(ADR-0016) '곧 죽는 링크' 같은 세 번째 상태가 없다.
 */

/** 링크를 어떻게 건넸는가. 화면 안내 문구가 이 값으로 갈린다 */
export type ShareDelivery = "shared" | "copied" | null;

/*
 * 조회 결과를 대상 식별자와 **함께** 들고 있다.
 *
 * `ready` 플래그를 따로 두고 효과 안에서 곧바로 false로 되돌리는 쪽이 짧지만, 효과 안의 동기
 * setState는 렌더를 한 번 더 유발한다(린트가 막는 자리다). 대신 "무엇에 대한 결과인가"를 값에
 * 담아 두면 **대상이 바뀐 순간 그 결과는 자동으로 낡은 것이 되어** 따로 지울 필요가 없다.
 */
interface Loaded {
  subWorkId: number;
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

function messageOf(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "FORBIDDEN":
      case "AUTHORITY_REQUIRED":
        return "공유 링크를 만들 권한이 없습니다 — 업무 조회(WORK_READ) 권한이 필요합니다";
      case "NOT_FOUND":
        return "하위 업무를 찾을 수 없습니다 — 이미 지워졌을 수 있습니다";
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

export function useShareLink(subWorkId: number, title: string): ShareLinkState {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<ShareDelivery>(null);

  useEffect(() => {
    let alive = true;
    fetchSubWorkShareLink(subWorkId)
      .then((link) => {
        if (alive) setLoaded({ subWorkId, link });
      })
      .catch(() => {
        /*
         * 조회 실패는 화면에 알리지 않는다 — 공유는 부가 기능이라, 상세를 여는 것만으로 오류
         * 문구가 뜨면 정작 업무 내용을 보러 온 사람에게 방해가 된다. 대신 '공유 중이 아니다'로
         * 두어 버튼은 그려 준다(누르는 순간의 실패는 그때 알린다).
         */
        if (alive) setLoaded({ subWorkId, link: null });
      });
    return () => {
      alive = false;
    };
  }, [subWorkId]);

  const ready = loaded?.subWorkId === subWorkId;
  const link = ready ? loaded.link : null;

  const share = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      const issued = link ?? (await issueSubWorkShareLink(subWorkId));
      setLoaded({ subWorkId, link: issued });
      setDelivery(await deliver(issued, title));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setPending(false);
    }
  }, [link, subWorkId, title]);

  const revoke = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      await revokeSubWorkShareLink(subWorkId);
      setLoaded({ subWorkId, link: null });
      setDelivery(null);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setPending(false);
    }
  }, [subWorkId]);

  return { link, ready, pending, error, delivery, share, revoke };
}
