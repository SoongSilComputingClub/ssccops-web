"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { syncSessionOnForbidden } from "@/entities/session";
import {
  REJECT_REASON_MAX_LENGTH,
  transitionSubWork,
  voteOnSubWork,
  type SubWorkTransitionResult,
  type SubWorkVoteResult,
  type VoteChoice,
} from "@/entities/sub-work";
import { toSubWorkActionErrorMessage } from "@/features/sub-work";
import { toApprovalVoteErrorMessage } from "./approval-error";

/*
 * 승인함 카드의 처리 훅 (OPS-015 투표 · OPS-010 승인·반려 · ssccops-web#45).
 *
 * features/sub-work의 useSubWorkActions와 달리 **단일 subWorkId에 묶이지 않는다** — 승인함은
 * 한 화면에 카드가 여러 장이고 카드마다 다른 하위 업무를 다루므로, 훅이 특정 ID를 들고 있으면
 * 카드 수만큼 훅을 만들어야 한다. 대신 호출마다 대상 ID를 받고, 지금 처리 중인 ID 하나만
 * `pendingSubWorkId`로 노출해 그 카드의 버튼만 잠근다(동시에 여러 카드를 처리하는 화면이
 * 아니다).
 *
 * 승인·반려는 하위 업무 상세와 같은 전이 API(POST /transitions)를 그대로 쓴다 — 승인함
 * 전용 엔드포인트가 없다(서버 ApprovalController 주석: "승인·반려는 여기 있지 않다").
 * 투표는 정족수 유형에서만 뜻이 있어 화면이 대기 탭 + quorum.needed일 때만 버튼을 그린다.
 *
 * 토스트를 여기서 띄우지 않고 결과 문구를 돌려준다 — 성공 뒤 목록을 다시 부를지는 호출부가
 * 정한다(sub-work 도메인과 같은 규칙).
 */

export interface ApprovalDecisionOutcome<T> {
  /** 성공했을 때의 서버 응답. 실패·중복 클릭이면 null */
  result: T | null;
  /** 사용자에게 보여줄 한 줄. 중복 클릭으로 아무것도 보내지 않았으면 빈 문자열 */
  message: string;
}

export interface ApprovalDecisionControl {
  /** 지금 처리 중인 하위 업무 ID — 그 카드의 버튼만 잠그는 데 쓴다. 없으면 null */
  pendingSubWorkId: number | null;
  vote: (
    subWorkId: number,
    choice: VoteChoice,
  ) => Promise<ApprovalDecisionOutcome<SubWorkVoteResult>>;
  /** action은 승인함 카드가 그리는 두 전이(완료 승인·반려)로 좁힌다 */
  decide: (
    subWorkId: number,
    action: "APPROVE_COMPLETE" | "REJECT",
    reason?: string | null,
  ) => Promise<ApprovalDecisionOutcome<SubWorkTransitionResult>>;
}

const BUSY = { result: null, message: "" } as const;

const DONE_MESSAGE: Record<"AGREE" | "DISAGREE", string> = {
  AGREE: "동의를 등록했습니다",
  DISAGREE: "부동의를 등록했습니다",
};

export function useApprovalDecisions(): ApprovalDecisionControl {
  const [pendingSubWorkId, setPendingSubWorkId] = useState<number | null>(null);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const run = useCallback(
    async <T,>(
      subWorkId: number,
      send: () => Promise<T>,
      doneMessage: string,
      toMessage: (error: unknown) => string,
    ): Promise<ApprovalDecisionOutcome<T>> => {
      if (inFlightRef.current) return BUSY;
      inFlightRef.current = true;
      setPendingSubWorkId(subWorkId);

      try {
        return { result: await send(), message: doneMessage };
      } catch (error: unknown) {
        // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
        syncSessionOnForbidden(error);
        return { result: null, message: toMessage(error) };
      } finally {
        inFlightRef.current = false;
        if (aliveRef.current) setPendingSubWorkId(null);
      }
    },
    [],
  );

  const vote = useCallback(
    (subWorkId: number, choice: VoteChoice) =>
      run(
        subWorkId,
        () => voteOnSubWork(subWorkId, choice),
        DONE_MESSAGE[choice],
        toApprovalVoteErrorMessage,
      ),
    [run],
  );

  const decide = useCallback(
    (subWorkId: number, action: "APPROVE_COMPLETE" | "REJECT", reason: string | null = null) => {
      // 반려 사유 선검사 — 서버도 막지만(422 REASON_REQUIRED · 400 VALIDATION_FAILED) 왕복을
      // 기다릴 이유가 없다(features/sub-work의 useSubWorkActions와 같은 규칙)
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
        subWorkId,
        () => transitionSubWork(subWorkId, action, reason),
        action === "APPROVE_COMPLETE" ? "완료 승인했습니다" : "반려했습니다",
        toSubWorkActionErrorMessage,
      );
    },
    [run],
  );

  return { pendingSubWorkId, vote, decide };
}
