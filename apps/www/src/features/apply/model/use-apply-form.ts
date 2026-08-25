"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  reachedPageSeqs,
  toRspnsCn,
  validateAnswers,
  type RspnsCn,
} from "@ssccops/form-renderer";
import {
  FORM_ERROR,
  fetchMyResponseDraft,
  fetchPublicForm,
  saveMyResponseDraft,
  submitFormResponse,
  type PublicForm,
} from "@/entities/form";
import { isSignupRequired, isUnauthenticated } from "@/shared/api/auth-error";
import { API_ERROR, ApiError } from "@/shared/api/client";
import { applyLoadErrorMessage, draftSaveErrorMessage, submitErrorMessage } from "./apply-error";

/*
 * 신청서 작성 화면의 상태 — 폼 조회 · 초안 복원 · 자동 저장 · 제출.
 *
 * ── 이 훅이 패키지에 없는 이유 (#152) ─────────────────────────
 * 답의 모양·분기·검증은 `@ssccops/form-renderer`가 갖는다. **여기 있는 것은 전송 계층뿐이다** —
 * 이 앱은 브라우저에서 Supabase 세션의 토큰을 꺼내 호출하고(`shared/api/browser-client`)
 * 401·403에 리다이렉트를 걸지 않는다. 어드민의 같은 훅은 리다이렉트까지 끝내는 클라이언트 위에
 * 서 있어, 훅째 옮기면 두 앱 중 한쪽은 반드시 틀린다.
 *
 * ── 검증 규칙을 여기 다시 적지 않는다 ────────────────────────
 * 필수 판정·형식·최대 선택 수·분기 경로는 전부 패키지 함수를 부른다. 한 줄이라도 여기서 다시
 * 판정하면 서버 `ResponseAnswerValidator`와 맞춰 둔 규칙이 두 벌이 된다.
 *
 * ── 자동 저장의 뼈대 (어드민 응답자 화면과 같은 구조) ──────────
 * - 저장 요청을 **하나의 프라미스 체인**에 줄 세운다. 동시에 두 개가 날지 않으므로 늦게 도착한
 *   이전 응답이 최신 상태를 덮어쓸 여지가 없다. 제출도 같은 줄에 세워, 제출 직후 도착한 자동
 *   저장이 이미 제출된 행을 건드리는 경합을 없앤다.
 * - "더러움" 플래그 대신 **보낼 본문을 직렬화한 문자열**과 **마지막으로 저장에 성공한 문자열**을
 *   비교한다. 고쳤다 되돌리면 저장할 것이 없어지고, 이펙트 본문에서 setState 할 일도 없다.
 * - 실제로 보내는 순간의 본문은 언제나 최신 스냅샷에서 읽는다. 디바운스 타이머가 잡아 둔 옛
 *   클로저의 값을 보내면 기다리는 동안 더 쓴 내용이 옛 내용으로 덮인다.
 * - **자동 저장은 검증하지 않는다.** 작성 중에 필수가 비어 있는 것은 정상이고, 여기서 걸면 다
 *   채우기 전까지 아무것도 저장되지 않는다. 서버도 자동 저장에서는 그것들을 보지 않는다.
 * - 초안 조회가 실패하면 **화면 전체를 오류로 끊는다.** 실패를 "초안 없음"으로 넘기면 서버에
 *   있는 초안 위로 빈 본문이 덮여 작성 중이던 답이 사라진다.
 */

/** 마지막 변경 이후 이 시간만큼 조용하면 저장한다 */
const AUTOSAVE_DEBOUNCE_MS = 700;

/** 실패 후 자동 재시도 간격(ms). 다 쓰면 수동 재시도로 넘긴다 */
const RETRY_DELAYS_MS = [1_500, 3_000, 6_000, 12_000];

export type ApplyFormStatus =
  | "loading"
  /** 답을 쓸 수 있다 */
  | "ready"
  /** 접수 기간이 아니거나 아직 열리지 않았다. **문항을 그리면 안 된다** */
  | "not-accepting"
  /** 이 회원은 더 낼 수 없다 — 이미 낸 신청이 있다 */
  | "already-submitted"
  /** 연결된 신청서가 없다 */
  | "not-found"
  /** 토큰이 죽었다 — 화면이 다시 로그인을 권한다 */
  | "unauthenticated"
  /** 인증은 됐지만 아직 회원이 아니다 — 화면이 가입 단계로 되돌린다 */
  | "signup-required"
  | "error";

export type ApplySubmitOutcome =
  /** 접수됐다(또는 이미 접수돼 있었다) — 완료 화면으로 */
  | "submitted"
  /** 검증에 걸렸다 — errors가 채워졌다 */
  | "invalid"
  /** 그 사이 접수가 끝났다 — 화면이 not-accepting으로 바뀐다 */
  | "not-accepting"
  /** 문항이 바뀌었다 — 새로고침을 권한다 */
  | "stale"
  | "failed";

/** 자동 저장 표시 */
export interface ApplySaveStatus {
  state: "clean" | "pending" | "saving" | "saved" | "failed";
  /** "HH:mm" — 아직 저장된 적이 없으면 빈 문자열 */
  savedAt: string;
  message: string;
  /** 실패했지만 아직 자동으로 다시 시도할 여지가 있는가 */
  retrying: boolean;
}

export interface ApplyFormController {
  status: ApplyFormStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;
  form: PublicForm | null;
  /** 진입 시 서버에 작성 중이던 답이 있었는가 — "이어서 작성 중입니다" 안내의 기준 */
  restored: boolean;
  answers: RspnsCn;
  setAnswer: (qitemId: string, value: string | string[]) => void;
  errors: Record<string, string>;
  setErrors: (errors: Record<string, string>) => void;
  save: ApplySaveStatus;
  retrySave: () => void;
  submitting: boolean;
  /** 문항에 붙이지 못한 제출 오류 한 줄 */
  submitMessage: string;
  submit: () => Promise<ApplySubmitOutcome>;
}

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedForm {
  key: string;
  outcome: Exclude<ApplyFormStatus, "loading">;
  errorMessage: string;
  form: PublicForm | null;
  answers: RspnsCn;
  restored: boolean;
}

interface SavedMark {
  key: string;
  /** epoch ms. 0이면 "서버에서 불러온 그대로"라 저장 시각을 표시하지 않는다 */
  at: number;
}

interface SaveFailure {
  key: string;
  message: string;
  retryable: boolean;
  attempts: number;
}

const EMPTY_ANSWERS: RspnsCn = {};
const NO_ERRORS: Record<string, string> = {};

/** epoch ms → "HH:mm" (보는 사람의 시계 기준 — 방금 저장됐는지만 알면 되는 자리다) */
function formatClock(at: number): string {
  const date = new Date(at);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** 서버가 준 일시 문자열 → epoch ms. 못 읽으면 지금 시각으로 떨어진다 */
function toEpochMs(value: string | null): number {
  if (!value) return Date.now();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

/**
 * 다시 보내 볼 가치가 있는 실패인가.
 *
 * 400·413은 본문이 그대로인 한 몇 번을 보내도 같은 답이 온다 — 재시도하면 화면만 계속 "저장
 * 실패"를 깜빡인다. 반대로 **저장 충돌(409)은 서버가 명시적으로 재시도를 요구하는 유일한 409다.**
 */
function isRetryableSave(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true;
  if (error.code === API_ERROR.NETWORK_ERROR) return true;
  if (error.code === API_ERROR.CONFIG_MISSING) return false;
  if (error.code === FORM_ERROR.RESPONSE_SAVE_CONFLICT) return true;
  return error.status >= 500;
}

/** 조회 실패 → 화면이 갈리는 지점. 문구로 끝나지 않는 것들을 먼저 걸러 낸다 */
function outcomeOf(error: unknown): Exclude<ApplyFormStatus, "loading" | "ready"> {
  if (isUnauthenticated(error)) return "unauthenticated";
  if (isSignupRequired(error)) return "signup-required";
  if (error instanceof ApiError) {
    if (error.code === FORM_ERROR.FORM_NOT_ACCEPTING) return "not-accepting";
    if (error.code === FORM_ERROR.FORM_NOT_FOUND || error.status === 404) return "not-found";
  }
  return "error";
}

/** 폼 + 초안을 이어서 읽는다. 초안 조회는 폼이 접수 가능할 때만 뜻이 있어 순서를 지킨다 */
async function loadApplyForm(
  formId: number,
  key: string,
): Promise<Omit<LoadedForm, "errorMessage"> & { savedAt: number }> {
  const form = await fetchPublicForm(formId);

  /*
   * 더 낼 수 없으면 초안을 묻지 않는다 — 서버도 "작성 중인 것 없음"을 돌려주므로 물어도 되지만,
   * 물을 이유가 없는 왕복을 하나 줄인다.
   */
  if (form.alreadySubmitted) {
    return {
      key,
      outcome: "already-submitted",
      form,
      answers: EMPTY_ANSWERS,
      restored: false,
      savedAt: 0,
    };
  }

  const draft = await fetchMyResponseDraft(formId);
  return {
    key,
    outcome: "ready",
    form,
    answers: draft?.rspnsCn ?? EMPTY_ANSWERS,
    restored: draft !== null,
    // 서버가 찍은 마지막 저장 시각을 이어받는다 — 다시 열어도 언제 저장됐는지가 보인다
    savedAt: draft?.mdfcnDt ? toEpochMs(draft.mdfcnDt) : 0,
  };
}

/** 문항을 그리지 않는 상태에서도 화면이 옵셔널 체이닝으로 뒤덮이지 않게 자리를 채워 둔다 */
function placeholder(
  key: string,
  outcome: Exclude<ApplyFormStatus, "loading" | "ready">,
  errorMessage: string,
): LoadedForm {
  return { key, outcome, errorMessage, form: null, answers: EMPTY_ANSWERS, restored: false };
}

export function useApplyForm(formId: number): ApplyFormController {
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${formId}|${reloadKey}`;

  const [loaded, setLoaded] = useState<LoadedForm | null>(null);
  const [saved, setSaved] = useState<SavedMark | null>(null);
  const [failure, setFailure] = useState<SaveFailure | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>(NO_ERRORS);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const aliveRef = useRef(true);
  /** 마지막으로 저장에 성공한 본문 키 — 저장 함수는 상태가 아니라 이 값을 본다(동기 갱신) */
  const savedKeyRef = useRef("");
  const attemptsRef = useRef<{ key: string; count: number }>({ key: "", count: 0 });
  /** 진행 중인 요청의 줄 — 자동 저장과 제출을 여기에 이어 붙여 직렬화한다 */
  const chainRef = useRef<Promise<unknown>>(Promise.resolve());
  /**
   * 제출을 마친 뒤로는 자동 저장을 봉인한다. 완료 화면으로 넘어가기까지 몇 프레임이 남아 있고,
   * 그 사이 디바운스 타이머가 터지면 이미 제출된 행에 저장 요청이 나간다.
   */
  const sealedRef = useRef(false);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  /* ── 로드 ─────────────────────────────────────────────────── */

  useEffect(() => {
    let alive = true;
    sealedRef.current = false;

    loadApplyForm(formId, requestKey)
      .then((result) => {
        if (!alive) return;

        /*
         * 불러온 그대로는 이미 서버에 있는 내용이다 — 들어왔다 나가기만 해도 저장이 나가면 안
         * 된다. 서버가 정리해 돌려준 값을 같은 방식으로 직렬화하므로 키가 일치한다.
         */
        const restoredKey = result.form
          ? JSON.stringify(toRspnsCn(result.form.qitemCpstCn, result.answers))
          : "";
        savedKeyRef.current = restoredKey;
        setSaved({ key: restoredKey, at: result.savedAt });
        setFailure(null);
        setErrors(NO_ERRORS);
        setSubmitMessage("");
        setLoaded({ ...result, errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        const outcome = outcomeOf(error);
        setLoaded(
          placeholder(requestKey, outcome, outcome === "error" ? applyLoadErrorMessage(error) : ""),
        );
      });

    return () => {
      alive = false;
    };
  }, [formId, requestKey]);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: ApplyFormStatus = current?.outcome ?? "loading";
  const form = current?.form ?? null;
  const answers = current?.answers ?? EMPTY_ANSWERS;

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const setAnswer = useCallback((qitemId: string, value: string | string[]) => {
    setLoaded((prev) =>
      prev?.outcome === "ready"
        ? { ...prev, answers: { ...prev.answers, [qitemId]: value } }
        : prev,
    );
    // 고치는 순간 그 문항의 오류는 지운다 — 고쳤는데 붉게 남아 있으면 무엇이 문제인지 흐려진다
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
    () => (form ? toRspnsCn(form.qitemCpstCn, answers) : EMPTY_ANSWERS),
    [form, answers],
  );
  const payloadKey = useMemo(() => JSON.stringify(draftBody), [draftBody]);
  const dirty = status === "ready" && payloadKey !== saved?.key;

  /*
   * 저장·제출 함수가 실행 시점에 읽을 최신값. 렌더마다 갱신한다(의존성 배열 없음) — 디바운스
   * 타이머가 만들어질 때가 아니라 **터질 때**의 값을 보내야 한다.
   */
  const contextRef = useRef({ formId, payloadKey, draftBody, form, answers });
  useEffect(() => {
    contextRef.current = { formId, payloadKey, draftBody, form, answers };
  });

  /* ── 자동 저장 ────────────────────────────────────────────── */

  const sendLatest = useCallback(async (): Promise<void> => {
    const { formId: targetFormId, payloadKey: key, draftBody: body } = contextRef.current;
    if (sealedRef.current) return;
    // 줄을 서 있는 동안 앞 요청이 같은 내용을 이미 저장했을 수 있다
    if (key === savedKeyRef.current) return;

    if (aliveRef.current) setSaving(true);
    try {
      const draft = await saveMyResponseDraft(targetFormId, body);
      savedKeyRef.current = key;
      attemptsRef.current = { key: "", count: 0 };
      if (aliveRef.current) {
        setSaved({ key, at: toEpochMs(draft.mdfcnDt) });
        setFailure(null);
      }
    } catch (error: unknown) {
      const count = attemptsRef.current.key === key ? attemptsRef.current.count + 1 : 1;
      attemptsRef.current = { key, count };
      if (aliveRef.current) {
        setFailure({
          key,
          message: draftSaveErrorMessage(error),
          retryable: isRetryableSave(error),
          attempts: count,
        });
      }
    } finally {
      if (aliveRef.current) setSaving(false);
    }
  }, []);

  /** 요청을 한 줄로 세운다 — 자동 저장과 제출이 같은 줄을 쓰므로 순서가 뒤집히지 않는다 */
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

  /*
   * 디바운스. 본문이 바뀔 때마다 이 이펙트가 다시 돌며 이전 타이머를 지우므로 결과적으로
   * "마지막 변경 이후 조용해진 뒤 1회"가 된다. 이펙트 본문은 타이머만 걸고 setState 하지 않는다.
   */
  useEffect(() => {
    if (status !== "ready" || !dirty || retryExhausted) return;

    const delay =
      sameFailure === null
        ? AUTOSAVE_DEBOUNCE_MS
        : RETRY_DELAYS_MS[Math.min(sameFailure.attempts, RETRY_DELAYS_MS.length) - 1];

    const timer = setTimeout(() => void enqueue(sendLatest), delay);
    return () => clearTimeout(timer);
  }, [status, dirty, payloadKey, sameFailure, retryExhausted, enqueue, sendLatest]);

  /*
   * 이탈 경고. 자동 저장이 있어도 마지막 타이핑 직후·저장 실패 중에는 아직 서버에 없는 답이
   * 남아 있다. 신청서를 다시 쓰게 만드는 것보다 확인 창 하나가 낫다.
   */
  useEffect(() => {
    if (!dirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  /* ── 제출 ─────────────────────────────────────────────────── */

  const sendSubmit = useCallback(async (): Promise<ApplySubmitOutcome> => {
    const { formId: targetFormId, form: targetForm, answers: current } = contextRef.current;
    if (targetForm === null) return "failed";

    const composition = targetForm.qitemCpstCn;
    const reached = reachedPageSeqs(composition, current);

    /*
     * 화면 검증을 **도달한 페이지 전체**에 다시 돌린다. '다음'은 그때 보고 있던 페이지만 보므로,
     * 뒤로 돌아가 답을 지운 뒤 다른 분기로 빠져나온 경우 그 페이지가 검사되지 않은 채 남는다.
     */
    const issues = validateAnswers(composition, current, reached);
    if (Object.keys(issues).length > 0) {
      if (aliveRef.current) {
        setErrors(issues);
        setSubmitMessage("입력을 확인해 주세요");
      }
      return "invalid";
    }

    try {
      // 도달하지 않은 페이지의 답은 싣지 않는다 — 근거는 패키지의 toRspnsCn 주석
      await submitFormResponse(targetFormId, toRspnsCn(composition, current, { reachedOnly: true }));
      sealedRef.current = true;
      return "submitted";
    } catch (error: unknown) {
      const code = error instanceof ApiError ? error.code : "";

      switch (code) {
        /*
         * 이미 낸 신청이 있다. 다른 창에서 제출했거나 버튼이 두 번 눌린 경우인데, 신청자가
         * 도달하려던 상태(접수됨)에는 이미 도달해 있으므로 오류가 아니라 완료로 다룬다.
         */
        case FORM_ERROR.RESPONSE_ALREADY_SUBMITTED:
          sealedRef.current = true;
          return "submitted";

        /*
         * 받아들여지지 않은 신청을 다시 낸 경우는 **완료로 다루지 않는다.** 완료 화면으로 보내면
         * 접수되지 않은 신청을 접수됐다고 말하게 된다 — default로 떨어뜨려 사유를 남긴다.
         */

        case FORM_ERROR.FORM_NOT_ACCEPTING:
          sealedRef.current = true;
          if (aliveRef.current) {
            setLoaded((prev) =>
              prev === null ? prev : { ...prev, outcome: "not-accepting", errorMessage: "" },
            );
          }
          return "not-accepting";

        case FORM_ERROR.UNKNOWN_QUESTION_ITEM:
        case FORM_ERROR.INVALID_ANSWER_VALUE:
          if (aliveRef.current) setSubmitMessage(submitErrorMessage(error));
          return "stale";

        /*
         * 서버는 어느 문항이 문제인지 알려주지 않는다. 같은 규칙의 웹 검증을 한 번 더 돌려
         * 붙일 수 있으면 붙이고, 못 찾아도 위쪽 한 줄은 남으므로 화면이 조용하지는 않다.
         */
        case FORM_ERROR.REQUIRED_ANSWER_MISSING:
        case FORM_ERROR.ANSWER_PATTERN_MISMATCH:
        case FORM_ERROR.ANSWER_SELECTION_LIMIT_EXCEEDED:
          if (aliveRef.current) {
            setErrors(validateAnswers(composition, current, reached));
            setSubmitMessage(submitErrorMessage(error));
          }
          return "invalid";

        default:
          if (aliveRef.current) setSubmitMessage(submitErrorMessage(error));
          return "failed";
      }
    }
  }, []);

  /*
   * 중복 제출 차단은 두 겹이다. `submitting`은 버튼을 잠가 두 번째 클릭을 막고, `sealedRef`는
   * 이미 제출이 끝난 뒤(완료 화면으로 넘어가는 몇 프레임)의 호출을 막는다. 그래도 뚫리면
   * 서버가 409로 끊고 그것도 완료로 다룬다.
   */
  const submit = useCallback(async (): Promise<ApplySubmitOutcome> => {
    if (sealedRef.current) return "submitted";
    setSubmitting(true);
    try {
      return await enqueue(sendSubmit);
    } finally {
      if (aliveRef.current) setSubmitting(false);
    }
  }, [enqueue, sendSubmit]);

  /* ── 저장 상태 표시 ───────────────────────────────────────── */

  const save = useMemo<ApplySaveStatus>(() => {
    const savedAt = saved?.at ? formatClock(saved.at) : "";

    if (saving) return { state: "saving", savedAt, message: "", retrying: false };
    if (sameFailure) {
      return {
        state: "failed",
        savedAt,
        message: sameFailure.message,
        retrying: !retryExhausted,
      };
    }
    if (dirty) return { state: "pending", savedAt, message: "", retrying: false };
    if (savedAt) return { state: "saved", savedAt, message: "", retrying: false };
    return { state: "clean", savedAt: "", message: "", retrying: false };
  }, [saving, dirty, sameFailure, retryExhausted, saved]);

  return {
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
    form,
    restored: current?.restored ?? false,
    answers,
    setAnswer,
    errors,
    setErrors,
    save,
    retrySave,
    submitting,
    submitMessage,
    submit,
  };
}
