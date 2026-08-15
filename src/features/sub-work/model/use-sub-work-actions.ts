"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { syncSessionOnForbidden } from "@/entities/session";
import {
  REJECT_REASON_MAX_LENGTH,
  transitionSubWork,
  updateSubWorkChecklistItem,
  type SubWorkChecklistUpdate,
  type SubWorkTransition,
  type SubWorkTransitionResult,
} from "@/entities/sub-work";
import { toSubWorkActionErrorMessage } from "./sub-work-error";

/*
 * 하위 업무 수정 훅 (OPS-010 전이 · OPS-013 체크 · #39).
 *
 * 전이와 체크를 한 훅에 둔 것은 둘이 같은 잠금을 나눠 써야 하기 때문이다 — 체크가 날아가는
 * 동안 완료 승인을 누르면 서버는 체크되기 전의 목록으로 판정해 409 COMPLETION_CRITERIA_UNMET을
 * 돌려준다. 사용자 눈에는 방금 다 체크했는데 "완료 조건을 모두 확인해주세요"가 뜨는 상황이다.
 *
 * 토스트를 여기서 띄우지 않고 결과 문구를 돌려준다 — 성공 뒤에 화면을 어떻게 할지(다시 조회할지,
 * 목록으로 갈지)는 뷰가 정한다 (등록 훅 use-create-sub-work와 같은 규칙).
 */

export interface SubWorkActionOutcome<T> {
  /** 성공했을 때의 서버 응답. 실패·중복 클릭이면 null */
  result: T | null;
  /** 사용자에게 보여줄 한 줄. 중복 클릭으로 아무것도 보내지 않았으면 빈 문자열 */
  message: string;
}

export interface SubWorkActionControl {
  pending: boolean;
  transition: (
    action: SubWorkTransition,
    reason?: string | null,
  ) => Promise<SubWorkActionOutcome<SubWorkTransitionResult>>;
  setChecklistItem: (
    checklistItemId: number,
    isCompleted: boolean,
  ) => Promise<SubWorkActionOutcome<SubWorkChecklistUpdate>>;
}

const BUSY = { result: null, message: "" } as const;

/** 전이 성공 문구 — 액션마다 다음에 무엇이 일어났는지를 말해 준다 */
const DONE_MESSAGE: Record<SubWorkTransition, string> = {
  START: "착수했습니다",
  REQUEST_REVIEW: "완료 승인을 요청했습니다",
  APPROVE_COMPLETE: "완료 승인했습니다",
  REJECT: "반려했습니다",
};

export function useSubWorkActions(subWorkId: number): SubWorkActionControl {
  const [pending, setPending] = useState(false);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  /*
   * 요청 하나를 보내고 결과 문구까지 만드는 공통 자리. 전이와 체크가 같은 잠금·같은 403 처리·
   * 같은 오류 문구 규칙을 쓰므로 두 번 적지 않는다.
   */
  const run = useCallback(
    async <T,>(
      send: () => Promise<T>,
      doneMessage: string,
    ): Promise<SubWorkActionOutcome<T>> => {
      if (inFlightRef.current) return BUSY;
      inFlightRef.current = true;
      setPending(true);

      try {
        return { result: await send(), message: doneMessage };
      } catch (error: unknown) {
        // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
        syncSessionOnForbidden(error);
        return { result: null, message: toSubWorkActionErrorMessage(error) };
      } finally {
        inFlightRef.current = false;
        if (aliveRef.current) setPending(false);
      }
    },
    [],
  );

  const transition = useCallback(
    (action: SubWorkTransition, reason: string | null = null) => {
      /*
       * 반려 사유 선검사. 서버도 막지만 코드가 둘로 갈린다 — 누락은 422 REASON_REQUIRED,
       * 500자 초과는 400 VALIDATION_FAILED다. 왕복 한 번을 기다릴 이유가 없는 검사다.
       */
      if (action === "REJECT") {
        const value = reason?.trim() ?? "";
        if (!value) {
          return Promise.resolve({ result: null, message: "반려 사유를 입력해주세요" });
        }
        if (value.length > REJECT_REASON_MAX_LENGTH) {
          return Promise.resolve({
            result: null,
            message: `반려 사유는 ${REJECT_REASON_MAX_LENGTH}자를 넘을 수 없습니다`,
          });
        }
      }
      return run(
        () => transitionSubWork(subWorkId, action, reason),
        DONE_MESSAGE[action],
      );
    },
    [run, subWorkId],
  );

  const setChecklistItem = useCallback(
    (checklistItemId: number, isCompleted: boolean) =>
      run(
        () => updateSubWorkChecklistItem(subWorkId, checklistItemId, isCompleted),
        /*
         * 체크 하나하나에 토스트를 띄우지 않는다 — 체크박스가 즉시 바뀌는 것 자체가 결과다.
         * 실패했을 때만 문구가 필요하고, 그쪽은 catch가 만든다.
         */
        "",
      ),
    [run, subWorkId],
  );

  return { pending, transition, setChecklistItem };
}
