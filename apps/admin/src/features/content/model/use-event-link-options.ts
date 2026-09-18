"use client";

import { useEffect, useState } from "react";
import { fetchEvents, type EventSummary } from "@/entities/event";

/*
 * 포스트 편집기의 행사 연결 후보 (#521).
 *
 * 행사 목록은 entities/event에서 온다 — 콘텐츠와 행사 두 엔티티를 함께 다루는 로직이라 features에
 * 둔다(features/event의 useFormLinkOptions와 같은 자리). 행사 목록 API는 페이징이 없어 전부 받고,
 * 고르기는 제목으로 걸러 보여 주는 셀렉트가 한다 — 전용 검색 API도 «행사 고르기» 컴포넌트도 아직
 * 없어서 새로 만들지 않았다(행사 수백 건이 되면 그때 검색 API와 함께 붙인다).
 *
 * 실패해도 편집 화면을 막지 않는다 — 행사 연결 없이도 포스트는 저장된다. 조회 권한이 EVENT_MANAGE라
 * 홍보국원이 그 권한이 없으면 후보가 비는데, 그때는 문구로 무엇이 필요한지 밝힌다.
 */

export interface EventLinkOptions {
  events: EventSummary[];
  loading: boolean;
  /** 비어 있으면 정상 — 행사 연결 칸에만 조용히 표시한다 */
  errorMessage: string;
}

export function useEventLinkOptions(): EventLinkOptions {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let alive = true;

    fetchEvents()
      .then((next) => {
        if (alive) setEvents(next);
      })
      .catch(() => {
        if (alive) {
          setErrorMessage(
            "행사 목록을 불러오지 못했습니다 — 행사 관리(EVENT_MANAGE) 권한이 필요합니다",
          );
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  return { events, loading, errorMessage };
}
