"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { replaceOperationTags, type OperationTagSummary } from "@/entities/operation-tag";
import { syncSessionOnForbidden } from "@/entities/session";
import { toOperationTagAssignErrorMessage, type OperationTagSubject } from "./operation-tag-error";

/*
 * 운영 건의 태그 지정 — 전체 교체 (#757 · #771 · PUT /v1/operations/{operationId}/tags).
 *
 * 업무·하위 업무·회의가 같은 경로를 쓴다 — 넘기는 값은 각 상세 응답의 `operationId`다(업무·하위
 * 업무·회의 id가 아니다). 고른 목록을 통째로 보낸다(빈 배열은 «전부 떼기»). 토스트는 띄우지 않고
 * 결과 문구를 돌려준다 — 상세는 그 자리에서 칩을 갈아 끼우고, 등록 흐름은 상세로 옮긴다(호출부마다
 * 다음 행동이 다르다). 중복 제출은 ref로 끊는다(같은 렌더 안의 두 번째 클릭은 상태의 옛 값을 읽는다).
 */

export interface OperationTagAssignment {
  /** 성공하면 서버가 돌려준 지정 결과(이름 포함), 실패·중복 클릭이면 null */
  tags: OperationTagSummary[] | null;
  /** 사용자에게 보여줄 한 줄. 중복 클릭으로 아무것도 보내지 않았으면 빈 문자열 */
  message: string;
}

export interface OperationTagAssignControl {
  pending: boolean;
  /** `subject`는 404 문구에 쓸 대상 이름(«업무»·«하위 업무»·«회의») */
  assign: (
    operationId: number,
    tagIds: readonly number[],
    subject: OperationTagSubject,
  ) => Promise<OperationTagAssignment>;
}

export function useAssignOperationTags(): OperationTagAssignControl {
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
    async (
      operationId: number,
      tagIds: readonly number[],
      subject: OperationTagSubject,
    ): Promise<OperationTagAssignment> => {
      if (inFlightRef.current) return { tags: null, message: "" };
      inFlightRef.current = true;
      setPending(true);
      try {
        const tags = await replaceOperationTags(operationId, tagIds);
        return { tags, message: "태그를 저장했습니다" };
      } catch (error: unknown) {
        // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
        syncSessionOnForbidden(error);
        return { tags: null, message: toOperationTagAssignErrorMessage(error, subject) };
      } finally {
        inFlightRef.current = false;
        if (aliveRef.current) setPending(false);
      }
    },
    [],
  );

  return { pending, assign };
}
