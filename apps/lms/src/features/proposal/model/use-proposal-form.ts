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
import {
  fetchMyResponseDraft,
  saveMyResponseDraft,
} from "@/entities/response/api/response-draft";
import { submitFormResponse } from "@/entities/response/api/response-submit";
import { API_ERROR, ApiError } from "@/shared/api/client";
import {
  newProposalSubmitErrorMessage,
  proposalDraftSaveErrorMessage,
} from "./proposal-error";

/*
 * 기획안 신규 작성 폼의 상태 — 초안 복원 · 자동 저장 · 검증 · 제출 (#185).
 *
 * ── 재제출 훅(#171)과 갈리는 자리: 자동 저장이 있다 ────────────
 * 재제출은 전체 본문 재전송이라 초안이 없다(서버 #177). 신규 작성은 공개 폼의 초안 경로
 * (`GET`·`PUT /v1/forms/{formId}/responses/draft`)를 그대로 쓴다 — 기획안은 장문이라
 * 쓰다 만 내용이 사라지면 처음부터 다시 써야 한다. 자동 저장의 뼈대는 어드민
 * `usePublicForm`과 같은 이유로 같은 구조다:
 * - 저장·제출을 하나의 프라미스 체인(`chainRef`)에 줄 세운다 → 늦게 도착한 이전 저장이
 *   최신 상태를 덮어쓸 여지가 없고, 제출 직후 도착한 자동 저장이 SUBMITTED 행을 건드리는
 *   경합도 사라진다.
 * - "더러움" 플래그 대신 **보낼 본문의 직렬화 문자열(`payloadKey`)** 과 **마지막으로 저장에
 *   성공한 본문 문자열(`savedKeyRef`)** 을 비교한다. 값을 고쳤다 되돌리면 보낼 것이 없어진다.
 * - 실제로 보내는 순간의 본문은 최신 스냅샷(`contextRef`)에서 읽는다 — 디바운스 타이머가
 *   잡아 둔 옛 클로저 값을 보내면 기다리는 동안 더 쓴 내용이 옛 내용으로 덮인다.
 *
 * ── 검증은 `@ssccops/form-renderer`가 한다 ────────────────────
 * 필수·정규식·최대 선택 수·페이지 분기는 전부 패키지 함수를 부른다 — 한 줄이라도 여기서
 * 다시 판정하면 서버 `ResponseAnswerValidator`와 맞춰 둔 규칙이 두 벌이 된다(AGENTS.md).
 * **자동 저장 경로에는 검증을 걸지 않는다**(작성 중에 필수가 비어 있는 것이 정상이고 서버도
 * 초안 저장에서는 보지 않는다). 검증은 '다음'과 '제출'에서만 돈다.
 *
 * ── 폼 마운트 규칙 ─────────────────────────────────────────
 * SSR 로더가 `formId`·문항 구성을 이미 가져왔고, 뷰는 그 결과가 준비된 뒤에야 이 훅을 쓰는
 * 컴포넌트를 마운트한다. 초안(이전에 쓰다 만 답)만 이 훅이 마운트 시점에 한 번 더 부른다 —
 * 초안 조회에는 브라우저 세션 토큰이 필요해 SSR 로더가 함께 가져올 수 없다.
 */

/** 마지막 변경 이후 이 시간만큼 조용하면 저장한다 (AGENTS.md 「700ms」) */
const AUTOSAVE_DEBOUNCE_MS = 700;

/** 실패 후 자동 재시도 간격(ms). 다 쓰면 수동 재시도로 넘긴다 */
const RETRY_DELAYS_MS = [1_500, 3_000, 6_000, 12_000];

export type ProposalSaveState =
  | "clean"
  /** 마지막 변경 이후 아직 저장 전 (디바운스 대기) */
  | "pending"
  | "saving"
  | "saved"
  | "failed";

export interface ProposalSaveStatus {
  state: ProposalSaveState;
  /** "HH:mm" — 마지막 저장 시각. 없으면 빈 문자열 */
  savedAt: string;
  /** state === "failed"일 때만 채워진다 */
  message: string;
  /** 자동 재시도가 아직 남아 있는가 */
  retrying: boolean;
}

export type ProposalSubmitOutcome =
  /** 제출됐다 (또는 이미 제출돼 있었다) — 뷰가 제출 현황으로 보낸다 */
  | "submitted"
  /** 검증에 걸렸다 — `errors`가 채워졌다 */
  | "invalid"
  /** 그 사이 접수가 끝났다 */
  | "not-accepting"
  /** 폼 문항이 바뀌었다 — 새로고침 권유 */
  | "stale"
  | "failed";

export interface ProposalForm {
  /** 초안을 아직 불러오는 중인가 — 폼 마운트 전 스켈레톤 판단 */
  loadingDraft: boolean;
  /** 진입 시 서버에 쓰다 만 답이 있었는가 — "이어서 작성 중입니다" 안내의 기준 */
  restored: boolean;
  answers: RspnsCn;
  setAnswer: (qitemId: string, value: AnswerValue) => void;
  /** qitemId → 인라인 오류 문구 */
  errors: Record<string, string>;
  setErrors: (errors: Record<string, string>) => void;
  save: ProposalSaveStatus;
  retrySave: () => void;
  submitting: boolean;
  /** 문항에 붙이지 못한 제출 오류 한 줄 */
  submitMessage: string;
  submit: () => Promise<ProposalSubmitOutcome>;
}

const EMPTY_ANSWERS: RspnsCn = {};
const NO_ERRORS: Record<string, string> = {};

/** epoch ms → "HH:mm" (사용자 시계 기준) */
function formatClock(at: number): string {
  const date = new Date(at);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** 서버가 준 일시 문자열 → epoch ms. 못 읽으면 지금 시각으로 떨어진다 */
function toEpochMs(value: string | null): number {
  if (!value) return Date.now();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

/**
 * 다시 보내 볼 가치가 있는 저장 실패인가.
 *
 * 400·413은 본문이 그대로인 한 몇 번을 보내도 같은 답이 온다. 반대로
 * `RESPONSE_SAVE_CONFLICT`(409)는 서버가 명시적으로 재시도를 요구하는 유일한 409다.
 */
function isRetryableSave(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true;
  if (error.code === API_ERROR.NETWORK_ERROR) return true;
  if (error.code === API_ERROR.CONFIG_MISSING) return false;
  if (error.code === RESPONSE_ERROR.RESPONSE_SAVE_CONFLICT) return true;
  if (error.code === RESPONSE_ERROR.FORM_NOT_ACCEPTING) return false;
  return error.status >= 500;
}

export function useProposalForm(
  formId: number,
  composition: QitemCpstCn,
): ProposalForm {
  const [answers, setAnswers] = useState<RspnsCn>(EMPTY_ANSWERS);
  const [restored, setRestored] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>(NO_ERRORS);
  /**
   * 마지막으로 저장에 성공한(또는 서버에서 그대로 불러온) 본문의 직렬화 키.
   *
   * `savedKeyRef`와 같은 값을 들고 있다 — ref는 저장 함수가 렌더 밖에서 동기로 읽는 통로이고,
   * 이 state는 렌더가 `dirty`를 파생하는 통로다(ref는 렌더 중 읽을 수 없다 · react-hooks/refs).
   */
  const [savedKey, setSavedKey] = useState("");
  const [savedAt, setSavedAt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<{
    key: string;
    message: string;
    retryable: boolean;
    attempts: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const aliveRef = useRef(true);
  /** `savedKey`의 동기 사본 — 저장 함수가 렌더 밖에서 최신 값을 읽는다(state는 커밋 뒤에야 바뀐다) */
  const savedKeyRef = useRef("");
  const attemptsRef = useRef<{ key: string; count: number }>({ key: "", count: 0 });
  /** 진행 중인 요청의 줄 — 자동 저장과 제출을 여기에 이어 붙여 직렬화한다 */
  const chainRef = useRef<Promise<unknown>>(Promise.resolve());
  /** 제출을 마친 뒤로는 자동 저장을 봉인한다(현황으로 넘어가는 몇 프레임 동안) */
  const sealedRef = useRef(false);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  /* ── 초안 복원 (마운트 1회) ────────────────────────────────── */

  useEffect(() => {
    let alive = true;
    fetchMyResponseDraft(formId)
      .then((draft) => {
        if (!alive) return;
        const initial = draft?.rspnsCn ?? EMPTY_ANSWERS;
        /*
         * 불러온 그대로는 이미 서버에 있는 내용이다 — 진입만 하고 나가도 PUT이 나가면 안 된다.
         * 서버가 정리해 돌려준 값을 그대로 다시 직렬화하므로 키가 일치한다.
         */
        const key = JSON.stringify(toRspnsCn(composition, initial));
        savedKeyRef.current = key;
        setSavedKey(key);
        setAnswers(initial);
        setRestored(draft !== null);
        setSavedAt(draft?.mdfcnDt ? toEpochMs(draft.mdfcnDt) : 0);
        setLoadingDraft(false);
      })
      .catch(() => {
        if (!alive) return;
        /*
         * 초안 조회가 실패하면 빈 답으로 시작하되, `savedKeyRef`를 빈 본문 키로 맞춰 둔다 —
         * 사용자가 한 글자도 안 썼는데 빈 PUT이 나가 서버의 초안을 덮어쓰는 일을 막는다.
         * (어드민은 화면 전체를 끊지만, 이 앱은 SSR 로더가 폼을 이미 그려 둔 뒤라 폼을
         * 열어 두고 자동 저장이 처음 성공할 때 서버 상태와 합류하게 둔다.)
         */
        const key = JSON.stringify(toRspnsCn(composition, EMPTY_ANSWERS));
        savedKeyRef.current = key;
        setSavedKey(key);
        setLoadingDraft(false);
      });
    return () => {
      alive = false;
    };
  }, [formId, composition]);

  const setAnswer = useCallback((qitemId: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [qitemId]: value }));
    setErrors((prev) => {
      if (prev[qitemId] === undefined) return prev;
      const next = { ...prev };
      delete next[qitemId];
      return next;
    });
    setSubmitMessage("");
  }, []);

  /* ── 보낼 본문 · 변경 감지 ────────────────────────────────── */

  const draftBody = useMemo(
    () => toRspnsCn(composition, answers),
    [composition, answers],
  );
  const payloadKey = useMemo(() => JSON.stringify(draftBody), [draftBody]);
  const dirty = !loadingDraft && payloadKey !== savedKey;

  const contextRef = useRef({ formId, payloadKey, draftBody, answers });
  useEffect(() => {
    contextRef.current = { formId, payloadKey, draftBody, answers };
  });

  /* ── 자동 저장 ────────────────────────────────────────────── */

  const sendLatest = useCallback(async (): Promise<void> => {
    const { formId: targetFormId, payloadKey: key, draftBody: body } =
      contextRef.current;
    if (sealedRef.current) return;
    if (key === savedKeyRef.current) return;

    if (aliveRef.current) setSaving(true);
    try {
      const draft = await saveMyResponseDraft(targetFormId, body);
      savedKeyRef.current = key;
      attemptsRef.current = { key: "", count: 0 };
      if (aliveRef.current) {
        setSavedKey(key);
        setSavedAt(toEpochMs(draft.mdfcnDt));
        setFailure(null);
      }
    } catch (error: unknown) {
      const count =
        attemptsRef.current.key === key ? attemptsRef.current.count + 1 : 1;
      attemptsRef.current = { key, count };
      if (aliveRef.current) {
        setFailure({
          key,
          message: proposalDraftSaveErrorMessage(error),
          retryable: isRetryableSave(error),
          attempts: count,
        });
      }
    } finally {
      if (aliveRef.current) setSaving(false);
    }
  }, []);

  const enqueue = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const next = chainRef.current.then(task, task);
    chainRef.current = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }, []);

  const retrySave = useCallback(() => {
    attemptsRef.current = { key: "", count: 0 };
    setFailure(null);
    void enqueue(sendLatest);
  }, [enqueue, sendLatest]);

  const sameFailure = failure?.key === payloadKey ? failure : null;
  const retryExhausted =
    sameFailure !== null &&
    (!sameFailure.retryable || sameFailure.attempts >= RETRY_DELAYS_MS.length);

  useEffect(() => {
    if (loadingDraft || !dirty || retryExhausted) return;

    const delay =
      sameFailure === null
        ? AUTOSAVE_DEBOUNCE_MS
        : RETRY_DELAYS_MS[
            Math.min(sameFailure.attempts, RETRY_DELAYS_MS.length) - 1
          ];

    const timer = setTimeout(() => void enqueue(sendLatest), delay);
    return () => clearTimeout(timer);
  }, [loadingDraft, dirty, payloadKey, sameFailure, retryExhausted, enqueue, sendLatest]);

  /*
   * 이탈 경고 — 마지막 타이핑 직후·저장 실패 중에는 아직 서버에 없는 답이 남아 있다.
   */
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  /* ── 제출 ─────────────────────────────────────────────────── */

  const sendSubmit = useCallback(async (): Promise<ProposalSubmitOutcome> => {
    const { formId: targetFormId, answers: current } = contextRef.current;
    const reached = reachedPageSeqs(composition, current);

    const issues = validateAnswers(composition, current, reached);
    if (Object.keys(issues).length > 0) {
      if (aliveRef.current) {
        setErrors(issues);
        setSubmitMessage("입력을 확인해주세요");
      }
      return "invalid";
    }

    try {
      // 도달하지 않은 페이지의 답은 싣지 않는다
      await submitFormResponse(
        targetFormId,
        toRspnsCn(composition, current, { reachedOnly: true }),
      );
      sealedRef.current = true;
      return "submitted";
    } catch (error: unknown) {
      const code = error instanceof ApiError ? error.code : "";

      if (code === RESPONSE_ERROR.RESPONSE_ALREADY_SUBMITTED) {
        sealedRef.current = true;
        return "submitted";
      }
      if (code === RESPONSE_ERROR.FORM_NOT_ACCEPTING) {
        if (aliveRef.current) {
          setSubmitMessage(newProposalSubmitErrorMessage(error));
        }
        return "not-accepting";
      }
      if (
        code === RESPONSE_ERROR.UNKNOWN_QUESTION_ITEM ||
        code === RESPONSE_ERROR.INVALID_ANSWER_VALUE
      ) {
        if (aliveRef.current) {
          setSubmitMessage(newProposalSubmitErrorMessage(error));
        }
        return "stale";
      }
      if (
        code === RESPONSE_ERROR.REQUIRED_ANSWER_MISSING ||
        code === RESPONSE_ERROR.ANSWER_PATTERN_MISMATCH ||
        code === RESPONSE_ERROR.ANSWER_SELECTION_LIMIT_EXCEEDED
      ) {
        if (aliveRef.current) {
          setErrors(validateAnswers(composition, current, reached));
          setSubmitMessage(newProposalSubmitErrorMessage(error));
        }
        return "invalid";
      }
      if (aliveRef.current) setSubmitMessage(newProposalSubmitErrorMessage(error));
      return "failed";
    }
  }, [composition]);

  const submit = useCallback(async (): Promise<ProposalSubmitOutcome> => {
    if (sealedRef.current) return "submitted";
    setSubmitting(true);
    try {
      return await enqueue(sendSubmit);
    } finally {
      if (aliveRef.current) setSubmitting(false);
    }
  }, [enqueue, sendSubmit]);

  /* ── 저장 상태 표시 ───────────────────────────────────────── */

  const save = useMemo<ProposalSaveStatus>(() => {
    const at = savedAt ? formatClock(savedAt) : "";
    if (saving) return { state: "saving", savedAt: at, message: "", retrying: false };
    if (sameFailure) {
      return {
        state: "failed",
        savedAt: at,
        message: sameFailure.message,
        retrying: !retryExhausted,
      };
    }
    if (dirty) return { state: "pending", savedAt: at, message: "", retrying: false };
    if (at) return { state: "saved", savedAt: at, message: "", retrying: false };
    return { state: "clean", savedAt: "", message: "", retrying: false };
  }, [saving, dirty, sameFailure, retryExhausted, savedAt]);

  return useMemo(
    () => ({
      loadingDraft,
      restored,
      answers,
      setAnswer,
      errors,
      setErrors,
      save,
      retrySave,
      submitting,
      submitMessage,
      submit,
    }),
    [
      loadingDraft,
      restored,
      answers,
      setAnswer,
      errors,
      save,
      retrySave,
      submitting,
      submitMessage,
      submit,
    ],
  );
}
