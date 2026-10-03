"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { syncSessionOnForbidden } from "@/entities/session";
import { transitionWork, WORK_ERROR, type WorkTransition } from "@/entities/work";
import { ApiError } from "@/shared/lib/api/client";
import { toWorkTransitionErrorMessage } from "./work-error";

/*
 * 상위 업무 상태 전이 훅 (#755 · 서버 #622 · POST /v1/works/{workId}/transitions).
 *
 * 모양은 하위 업무의 useSubWorkActions·학술 프로그램의 useProgramTransition과 같다 — 전이 하나만
 * 보내고 결과 문구를 돌려준다. 성공 뒤 화면 갱신은 호출부가 한다. 전이 응답에는 상태뿐인데 업무
 * 상세는 배지·버튼·하위 업무 표를 함께 그리므로 상세를 다시 부른다(AGENTS.md «부분 갱신과
 * 재조회를 가른다»).
 *
 * `stale`은 «화면이 낡았다»는 거절(409 두 코드 · 404)이다. 그때도 상세를 다시 불러야 버튼과
 * 남은 하위 업무 수가 서버와 맞는다. 네트워크·5xx에서는 다시 부르지 않는다 — 재조회도 실패해
 * 상세 전체가 오류 화면으로 바뀐다.
 *
 * 중복 클릭은 ref로 끊는다 — 상태만 보면 같은 렌더 안의 두 번째 클릭이 옛 값(`false`)을 읽는다.
 */

export interface WorkTransitionOutcome {
  /** 서버가 받아들였다 */
  done: boolean;
  /** 거절이 «화면이 낡았다»는 뜻이다 — 호출부가 상세를 다시 부른다 */
  stale: boolean;
  /** 사용자에게 보여줄 한 줄. 중복 클릭으로 아무것도 보내지 않았으면 빈 문자열 */
  message: string;
}

export interface WorkTransitionControl {
  pending: boolean;
  run: (transition: WorkTransition) => Promise<WorkTransitionOutcome>;
}

/** 전이 성공 문구 */
const DONE_MESSAGE: Record<WorkTransition, string> = {
  START: "착수했습니다",
  REQUEST_REVIEW: "검토를 요청했습니다",
  COMPLETE: "완료했습니다",
  REVERT_REVIEW: "검토를 되돌렸습니다",
  REOPEN: "재개했습니다",
};

const STALE_CODES: ReadonlySet<string> = new Set([
  WORK_ERROR.TRANSITION_NOT_ALLOWED,
  WORK_ERROR.SUB_WORK_UNFINISHED,
  WORK_ERROR.WORK_NOT_FOUND,
]);

export function useWorkTransition(workId: number): WorkTransitionControl {
  const [pending, setPending] = useState(false);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const run = useCallback(
    async (transition: WorkTransition): Promise<WorkTransitionOutcome> => {
      if (inFlightRef.current) return { done: false, stale: false, message: "" };
      inFlightRef.current = true;
      setPending(true);
      try {
        await transitionWork(workId, transition);
        return { done: true, stale: false, message: DONE_MESSAGE[transition] };
      } catch (error: unknown) {
        // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
        syncSessionOnForbidden(error);
        return {
          done: false,
          stale: error instanceof ApiError && STALE_CODES.has(error.code),
          message: toWorkTransitionErrorMessage(error),
        };
      } finally {
        inFlightRef.current = false;
        if (aliveRef.current) setPending(false);
      }
    },
    [workId],
  );

  return { pending, run };
}
