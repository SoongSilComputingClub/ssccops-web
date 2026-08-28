"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  reachedPageSeqs,
  toRspnsCn,
  validateAnswers,
  type AnswerValue,
  type QitemCpstCn,
  type RspnsCn,
} from "@ssccops/form-renderer";
import { RESPONSE_ERROR } from "@/entities/response";
import { submitFormResponse } from "@/entities/response/api/response-submit";
import { ApiError } from "@/shared/api/client";
import { resubmitProposalErrorMessage } from "./proposal-error";

/*
 * 기획안 재제출 폼의 상태 — 프리필된 답 · 검증 · 제출 (#171).
 *
 * ── usePublicForm(어드민)과 다른 점: 임시저장이 없다 ──────────
 * 서버가 재제출 중 임시저장 경로를 닫아 두었다(서버 #177 결정 2) — 재제출은 전체 본문
 * 재전송이다. 그래서 이 훅에는 디바운스·재시도 큐·초안 복원이 없다. 초깃값은 서버가 준
 * 이전 답(`rspnsCn`)이고, 사용자가 고친 값을 들고 있다가 제출 한 번으로 보낸다.
 *
 * ── 검증은 `@ssccops/form-renderer`가 한다 ────────────────────
 * 필수 판정·정규식·최대 선택 수·페이지 분기는 전부 패키지 함수를 부른다 — 한 줄이라도 여기서
 * 다시 판정하면 서버 `ResponseAnswerValidator`와 맞춰 둔 규칙이 두 벌이 된다(AGENTS.md).
 *
 * ── 폼 마운트 규칙 ─────────────────────────────────────────
 * 뷰가 로더 결과(`ready`)를 받은 뒤에야 이 훅을 쓰는 컴포넌트를 마운트한다 — `useState`
 * 초깃값이 곧 폼 초깃값이라 동기화용 `useEffect`가 필요 없다(#128과 같은 패턴).
 */

export type ResubmitOutcome =
  /** 제출됐다 — 뷰가 목록으로 돌려보낸다 */
  | "submitted"
  /** 검증에 걸렸다 — `errors`가 채워졌다 */
  | "invalid"
  /** 폼 문항이 바뀌었다 — 새로고침 권유 */
  | "stale"
  | "failed";

export interface ResubmitForm {
  answers: RspnsCn;
  setAnswer: (qitemId: string, value: AnswerValue) => void;
  /** qitemId → 인라인 오류 문구 */
  errors: Record<string, string>;
  setErrors: (errors: Record<string, string>) => void;
  submitting: boolean;
  /** 문항에 붙이지 못한 제출 오류 한 줄 */
  submitMessage: string;
  submit: () => Promise<ResubmitOutcome>;
}

const NO_ERRORS: Record<string, string> = {};

export function useResubmitForm(
  formId: number,
  composition: QitemCpstCn,
  initialAnswers: RspnsCn,
): ResubmitForm {
  const [answers, setAnswers] = useState<RspnsCn>(initialAnswers);
  const [errors, setErrors] = useState<Record<string, string>>(NO_ERRORS);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const aliveRef = useRef(true);
  /** 제출을 마친 뒤의 중복 제출을 막는다(완료 화면으로 넘어가는 몇 프레임 동안) */
  const sealedRef = useRef(false);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const setAnswer = useCallback((qitemId: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [qitemId]: value }));
    // 고치는 순간 그 문항의 오류는 지운다 — 고쳤는데 붉게 남아 있으면 무엇이 문제인지 흐려진다
    setErrors((prev) => {
      if (prev[qitemId] === undefined) return prev;
      const next = { ...prev };
      delete next[qitemId];
      return next;
    });
    setSubmitMessage("");
  }, []);

  const submit = useCallback(async (): Promise<ResubmitOutcome> => {
    if (sealedRef.current) return "submitted";

    const reached = reachedPageSeqs(composition, answers);
    /*
     * 도달한 페이지 전체를 검증한다 — 뒤로 돌아가 답을 지운 뒤 다른 분기로 빠져나온 경우
     * 그 페이지가 검사되지 않은 채 남지 않게(어드민 usePublicForm과 같은 규칙).
     */
    const issues = validateAnswers(composition, answers, reached);
    if (Object.keys(issues).length > 0) {
      if (aliveRef.current) {
        setErrors(issues);
        setSubmitMessage("입력을 확인해주세요");
      }
      return "invalid";
    }

    setSubmitting(true);
    try {
      // 도달하지 않은 페이지의 답은 싣지 않는다
      await submitFormResponse(
        formId,
        toRspnsCn(composition, answers, { reachedOnly: true }),
      );
      sealedRef.current = true;
      return "submitted";
    } catch (error: unknown) {
      const code = error instanceof ApiError ? error.code : "";

      if (code === RESPONSE_ERROR.RESPONSE_ALREADY_SUBMITTED) {
        // 다른 창에서 이미 냈거나 버튼이 두 번 눌렸다 — 도달하려던 상태에 이미 도달해 있다
        sealedRef.current = true;
        return "submitted";
      }

      if (
        code === RESPONSE_ERROR.UNKNOWN_QUESTION_ITEM ||
        code === RESPONSE_ERROR.INVALID_ANSWER_VALUE
      ) {
        if (aliveRef.current) setSubmitMessage(resubmitProposalErrorMessage(error));
        return "stale";
      }

      if (
        code === RESPONSE_ERROR.REQUIRED_ANSWER_MISSING ||
        code === RESPONSE_ERROR.ANSWER_PATTERN_MISMATCH ||
        code === RESPONSE_ERROR.ANSWER_SELECTION_LIMIT_EXCEEDED
      ) {
        /*
         * 서버가 어느 문항인지 알려주지 않으므로 웹 검증을 한 번 더 돌려 붙일 수 있으면 붙인다.
         * 웹·서버 규칙이 어긋난 경우 아무것도 못 찾을 수 있는데, 그때도 아래 한 줄은 남는다.
         */
        if (aliveRef.current) {
          setErrors(validateAnswers(composition, answers, reached));
          setSubmitMessage(resubmitProposalErrorMessage(error));
        }
        return "invalid";
      }

      if (aliveRef.current) setSubmitMessage(resubmitProposalErrorMessage(error));
      return "failed";
    } finally {
      if (aliveRef.current) setSubmitting(false);
    }
  }, [formId, composition, answers]);

  return useMemo(
    () => ({
      answers,
      setAnswer,
      errors,
      setErrors,
      submitting,
      submitMessage,
      submit,
    }),
    [answers, setAnswer, errors, submitting, submitMessage, submit],
  );
}
