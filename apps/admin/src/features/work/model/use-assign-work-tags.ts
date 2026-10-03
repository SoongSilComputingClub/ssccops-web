"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { syncSessionOnForbidden } from "@/entities/session";
import { replaceWorkTags, type WorkTagSummary } from "@/entities/work";
import { toWorkTagAssignErrorMessage } from "./work-tag-error";

/*
 * 업무의 태그 지정 — 전체 교체 (#757 · PUT /v1/works/{workId}/tags).
 *
 * 고른 목록을 통째로 보낸다(빈 배열은 «전부 떼기»). 토스트는 띄우지 않고 결과 문구를 돌려준다 —
 * 상세는 그 자리에서 칩을 갈아 끼우고, 등록 흐름은 상세로 옮긴다(호출부마다 다음 행동이 다르다).
 * 중복 제출은 ref로 끊는다(같은 렌더 안의 두 번째 클릭은 상태의 옛 값을 읽는다).
 */

export interface WorkTagAssignment {
  /** 성공하면 서버가 돌려준 지정 결과(이름 포함), 실패·중복 클릭이면 null */
  tags: WorkTagSummary[] | null;
  /** 사용자에게 보여줄 한 줄. 중복 클릭으로 아무것도 보내지 않았으면 빈 문자열 */
  message: string;
}

export interface WorkTagAssignControl {
  pending: boolean;
  assign: (workId: number, tagIds: readonly number[]) => Promise<WorkTagAssignment>;
}

export function useAssignWorkTags(): WorkTagAssignControl {
  const [pending, setPending] = useState(false);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const assign = useCallback(
    async (workId: number, tagIds: readonly number[]): Promise<WorkTagAssignment> => {
      if (inFlightRef.current) return { tags: null, message: "" };
      inFlightRef.current = true;
      setPending(true);
      try {
        const tags = await replaceWorkTags(workId, tagIds);
        return { tags, message: "태그를 저장했습니다" };
      } catch (error: unknown) {
        // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
        syncSessionOnForbidden(error);
        return { tags: null, message: toWorkTagAssignErrorMessage(error) };
      } finally {
        inFlightRef.current = false;
        if (aliveRef.current) setPending(false);
      }
    },
    [],
  );

  return { pending, assign };
}
