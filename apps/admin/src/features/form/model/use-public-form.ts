"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchPublicForm, PUBLIC_FORM_ERROR, type PublicForm } from "@/entities/form";
import {
  fetchMyResponseDraft,
  saveMyResponseDraft,
  submitFormResponse,
  type RspnsCn,
} from "@/entities/response";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";
import {
  reachedPageSeqs,
  toRspnsCn,
  validateAnswers,
} from "./public-form-answers";
import {
  toDraftSaveErrorMessage,
  toPublicFormLoadErrorMessage,
  toSubmitErrorMessage,
} from "./public-form-error";
import type { FormSaveStatus } from "./use-form-editor";

/*
 * 응답자 화면의 상태 — 폼 조회 · 초안 복원 · 자동 저장 · 제출.
 *
 * ── 자동 저장의 뼈대는 폼 편집기(use-form-editor)와 같다 ────────
 * 같은 구조를 두 번 만들 것이 아니라 **같은 이유로 같은 구조**를 쓴다.
 * - 저장 요청을 하나의 프라미스 체인에 줄 세운다 → 동시에 두 개가 날지 않으므로 늦게 도착한
 *   이전 응답이 최신 상태를 덮어쓸 여지 자체가 없다. 여기서는 **제출도 같은 줄에 세운다** —
 *   제출 직후 도착한 자동 저장이 이미 SUBMITTED가 된 행을 건드리는 경합이 사라진다.
 * - "더러움" 플래그 대신 **보낼 본문을 직렬화한 문자열(payloadKey)** 과 **마지막으로 저장에
 *   성공한 본문의 문자열(savedKey)** 을 비교한다. 값을 고쳤다 되돌리면 저장할 것이 없어지고,
 *   이펙트 본문에서 setState 할 일도 없다 (react-hooks/set-state-in-effect).
 * - 실제로 보내는 순간의 본문은 언제나 최신 스냅샷(contextRef)에서 읽는다. 디바운스 타이머가
 *   잡아 둔 옛 클로저의 값을 보내면 기다리는 동안 더 쓴 내용이 옛 내용으로 덮인다.
 *
 * ── 편집기와 다른 점 ────────────────────────────────────────
 * - **자동 저장은 검증하지 않는다.** 편집기에는 '보류(blocked)' 상태가 있지만 여기에는 없다 —
 *   작성 중에 필수가 비어 있고 형식이 어긋나 있는 것이 정상이고, 서버도 자동 저장에서는 그
 *   셋을 보지 않는다. 검증은 '다음'과 '제출'에서만 돈다.
 * - 초안 조회(GET .../draft)가 실패하면 **화면 전체를 오류로 끊는다.** 조회 실패를 "초안 없음"
 *   으로 넘기면, 실제로는 서버에 있는 초안 위로 자동 저장이 빈 본문을 덮어써 작성 중이던 답이
 *   통째로 사라진다. 복원할 수 없으면 아예 쓰지 않는 편이 낫다.
 *
 * ── 화면이 갈리는 지점 ──────────────────────────────────────
 * 접수 불가는 문항을 뺀 200이 아니라 **409 FORM_NOT_ACCEPTING**으로 온다. 그래서 이 훅은
 * '문항은 있는데 못 쓰는 상태'를 만들지 않는다 — 폼 객체가 있으면 곧 답을 낼 수 있다는 뜻이다.
 *
 * ── 다중 응답 폼 (ssccops-server #143) ──────────────────────
 * **여기에 분기를 더하지 않았다.** 서버가 alreadySubmitted의 뜻을 "냈는가"에서 "더 낼 수
 * 없는가"로 좁혀, 다중 응답 폼은 이미 낸 뒤에도 false로 온다 — 이 훅은 그대로 ready를
 * 유지하고 작성 화면이 계속 뜬다. 웹이 `mltplRspnsYn && ...` 같은 판정을 따로 두면 같은
 * 규칙이 두 벌이 되고, 서버가 "낼 수 있는가"를 다시 정할 때 한쪽만 바뀐다.
 *
 * 초안은 폼 종류와 무관하게 언제나 1건이라 자동 저장 경로(GET·PUT .../responses/draft)는
 * 그대로다 — 다중 응답 폼에서는 제출로 그 자리가 빈 뒤에 다음 초안이 시작된다.
 */

/** 마지막 변경 이후 이 시간만큼 조용하면 저장한다 (이슈 권장 500~1000ms) */
const AUTOSAVE_DEBOUNCE_MS = 700;

/** 실패 후 자동 재시도 간격(ms). 다 쓰면 수동 재시도로 넘긴다 */
const RETRY_DELAYS_MS = [1_500, 3_000, 6_000, 12_000];

export type PublicFormStatus =
  | "loading"
  /** 답을 쓸 수 있다 */
  | "ready"
  /** 409 FORM_NOT_ACCEPTING — DRAFT·마감·기간 밖. **문항을 그리면 안 된다** */
  | "not-accepting"
  /**
   * 이 회원이 **더 낼 수 없다** (ssccops-server #143에서 뜻이 좁아졌다).
   *
   * 1건 폼에서 제출을 마친 경우다. 다중 응답 폼은 이미 낸 뒤에도 또 내는 것이 정상이라
   * 이 상태로 오지 않고 계속 `ready`다 — 서버의 alreadySubmitted가 그렇게 판정한다.
   */
  | "already-submitted"
  | "not-found"
  | "error";

export type PublicFormSubmitOutcome =
  /** 제출됐다 (또는 이미 제출돼 있었다) — 완료 화면으로 */
  | "submitted"
  /** 검증에 걸렸다 — errors가 채워졌고 firstInvalidPage로 이동하면 된다 */
  | "invalid"
  /** 그 사이 접수가 끝났다 — 화면이 not-accepting으로 바뀐다 */
  | "not-accepting"
  /** 폼 문항이 바뀌었다 — 새로고침을 권한다 */
  | "stale"
  | "failed";

export interface PublicFormController {
  status: PublicFormStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;
  /** status가 ready·already-submitted일 때만 있다 */
  form: PublicForm | null;
  /** 진입 시 서버에 작성 중이던 답이 있었는가 — "이어서 작성 중입니다" 안내의 기준 */
  restored: boolean;
  answers: RspnsCn;
  setAnswer: (qitemId: string, value: string | string[]) => void;
  /** qitemId → 인라인 오류 문구 */
  errors: Record<string, string>;
  setErrors: (errors: Record<string, string>) => void;
  /** 자동 저장 표시 — 편집기와 같은 상태 표시줄(FormSaveStatusBar)을 쓴다 */
  save: FormSaveStatus;
  retrySave: () => void;
  submitting: boolean;
  /** 문항에 붙이지 못한 제출 오류 한 줄 */
  submitMessage: string;
  submit: () => Promise<PublicFormSubmitOutcome>;
}

/** 조회 결과 + 그 결과를 만든 요청의 식별자 (use-form-list.ts의 파생 로딩 패턴) */
interface LoadedPublicForm {
  key: string;
  outcome: Exclude<PublicFormStatus, "loading">;
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
 * 다시 보내 볼 가치가 있는 실패인가.
 *
 * 400·413은 본문이 그대로인 한 몇 번을 보내도 같은 답이 온다 — 재시도하면 화면만 계속
 * "저장 실패"를 깜빡인다. 반대로 **RESPONSE_SAVE_CONFLICT(409)는 서버가 명시적으로 재시도를
 * 요구하는 유일한 409**다(첫 저장이 동시에 도착해 부딪힌 경우).
 */
function isRetryableSave(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true;
  if (error.code === API_ERROR.NETWORK_ERROR) return true;
  if (error.code === API_ERROR.CONFIG_MISSING) return false;
  if (error.code === PUBLIC_FORM_ERROR.RESPONSE_SAVE_CONFLICT) return true;
  return error.status >= 500;
}

/** 폼 + 초안을 함께 읽는다. 초안 조회는 폼이 접수 가능할 때만 의미가 있어 순서를 지킨다 */
async function loadPublicForm(
  formId: number,
  key: string,
): Promise<Omit<LoadedPublicForm, "errorMessage"> & { savedAt: number }> {
  const form = await fetchPublicForm(formId);

  /*
   * 더 낼 수 없는 경우 초안을 묻지 않는다. 서버는 그 경우에도 "작성 중인 것 없음"(data: null)을
   * 돌려주므로 물어도 되지만, 물을 이유가 없는 왕복을 하나 줄인다.
   *
   * 다중 응답 폼은 이미 몇 건을 냈어도 여기 걸리지 않는다(alreadySubmitted가 false다) —
   * 초안을 물어 이어 쓰던 답을 복원하는 것이 그 폼에서는 정상적인 진입이다.
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
    // 서버가 찍은 마지막 저장 시각을 그대로 이어받는다 — 재접속 직후에도 "언제 저장됐는지"가 보인다
    savedAt: draft?.mdfcnDt ? toEpochMs(draft.mdfcnDt) : 0,
  };
}

/** 로드 실패·접수 불가 상태에서도 화면이 옵셔널 체이닝으로 뒤덮이지 않게 자리를 채워 둔다 */
function placeholder(
  key: string,
  outcome: Exclude<PublicFormStatus, "loading" | "ready">,
  errorMessage: string,
): LoadedPublicForm {
  return { key, outcome, errorMessage, form: null, answers: EMPTY_ANSWERS, restored: false };
}

export function usePublicForm(formId: number): PublicFormController {
  /* URL의 formId는 손으로 고칠 수 있다. 숫자가 아니면 서버까지 갈 것 없이 없는 폼으로 끊는다 */
  const loadableFormId = Number.isInteger(formId) && formId > 0 ? formId : null;

  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${formId}|${reloadKey}`;

  const [loaded, setLoaded] = useState<LoadedPublicForm | null>(null);
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
   * 그 사이 디바운스 타이머가 터지면 이미 SUBMITTED가 된 행에 PUT이 나간다.
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

    if (loadableFormId === null) {
      // 잘못된 URL — 조회 없이 끝낸다. 이펙트 본문이 아닌 마이크로태스크에서 반영한다
      void Promise.resolve().then(() => {
        if (alive) setLoaded(placeholder(requestKey, "not-found", ""));
      });
      return () => {
        alive = false;
      };
    }

    loadPublicForm(loadableFormId, requestKey)
      .then((result) => {
        if (!alive) return;

        /*
         * 불러온 그대로는 이미 서버에 있는 내용이다 — 진입만 하고 나가도 PUT이 나가면 안 된다.
         * 서버가 정리해 돌려준 값을 그대로 다시 직렬화하므로 키가 일치한다.
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

        const code = error instanceof ApiError ? error.code : "";
        if (code === PUBLIC_FORM_ERROR.FORM_NOT_ACCEPTING) {
          setLoaded(placeholder(requestKey, "not-accepting", ""));
          return;
        }
        if (code === PUBLIC_FORM_ERROR.FORM_NOT_FOUND) {
          setLoaded(placeholder(requestKey, "not-found", ""));
          return;
        }
        setLoaded(placeholder(requestKey, "error", toPublicFormLoadErrorMessage(error)));
      });

    return () => {
      alive = false;
    };
  }, [loadableFormId, requestKey]);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: PublicFormStatus = current?.outcome ?? "loading";
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
  const contextRef = useRef({ formId: loadableFormId, payloadKey, draftBody, form, answers });
  useEffect(() => {
    contextRef.current = { formId: loadableFormId, payloadKey, draftBody, form, answers };
  });

  /* ── 자동 저장 ────────────────────────────────────────────── */

  const sendLatest = useCallback(async (): Promise<void> => {
    const { formId: targetFormId, payloadKey: key, draftBody: body } = contextRef.current;
    if (targetFormId === null || sealedRef.current) return;
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
          message: toDraftSaveErrorMessage(error),
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

  /*
   * 디바운스. 본문이 바뀔 때마다 이 이펙트가 다시 돌면서 이전 타이머를 지우므로 결과적으로
   * "마지막 변경 이후 조용해진 뒤 1회"가 된다. 이펙트 본문은 타이머만 걸고 setState 하지 않는다.
   */
  const sameFailure = failure?.key === payloadKey ? failure : null;
  const retryExhausted =
    sameFailure !== null &&
    (!sameFailure.retryable || sameFailure.attempts >= RETRY_DELAYS_MS.length);

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
   * 남아 있다. 지원서를 다시 쓰게 만드는 것보다 확인 창 하나가 낫다.
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

  const sendSubmit = useCallback(async (): Promise<PublicFormSubmitOutcome> => {
    const { formId: targetFormId, form: targetForm, answers: current } = contextRef.current;
    if (targetFormId === null || targetForm === null) return "failed";

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
        setSubmitMessage("입력을 확인해주세요");
      }
      return "invalid";
    }

    try {
      // 도달하지 않은 페이지의 답은 싣지 않는다 — 근거는 toRspnsCn 주석
      await submitFormResponse(
        targetFormId,
        toRspnsCn(composition, current, { reachedOnly: true }),
      );
      sealedRef.current = true;
      return "submitted";
    } catch (error: unknown) {
      const code = error instanceof ApiError ? error.code : "";

      switch (code) {
        /*
         * 이미 낸 응답이 있다. 다른 창에서 제출했거나 버튼이 두 번 눌린 경우인데, 응답자가
         * 도달하려던 상태(제출됨)에는 이미 도달해 있으므로 오류가 아니라 완료로 다룬다.
         */
        case PUBLIC_FORM_ERROR.RESPONSE_ALREADY_SUBMITTED:
          sealedRef.current = true;
          return "submitted";

        case PUBLIC_FORM_ERROR.FORM_NOT_ACCEPTING:
          sealedRef.current = true;
          if (aliveRef.current) {
            setLoaded((prev) =>
              prev === null ? prev : { ...prev, outcome: "not-accepting", errorMessage: "" },
            );
          }
          return "not-accepting";

        case PUBLIC_FORM_ERROR.UNKNOWN_QUESTION_ITEM:
        case PUBLIC_FORM_ERROR.INVALID_ANSWER_VALUE:
          if (aliveRef.current) setSubmitMessage(toSubmitErrorMessage(error));
          return "stale";

        /*
         * 서버가 어느 문항인지 알려주지 않으므로(public-form-error.ts 주석) 웹 검증을 한 번 더
         * 돌려 붙일 수 있으면 붙인다. 웹과 서버 규칙이 어긋난 경우에는 아무것도 못 찾을 수
         * 있는데, 그때도 위쪽 한 줄 문구는 남으므로 화면이 조용히 아무 일 없는 척하지는 않는다.
         */
        case PUBLIC_FORM_ERROR.REQUIRED_ANSWER_MISSING:
        case PUBLIC_FORM_ERROR.ANSWER_PATTERN_MISMATCH:
        case PUBLIC_FORM_ERROR.ANSWER_SELECTION_LIMIT_EXCEEDED:
          if (aliveRef.current) {
            setErrors(validateAnswers(composition, current, reached));
            setSubmitMessage(toSubmitErrorMessage(error));
          }
          return "invalid";

        default:
          if (aliveRef.current) setSubmitMessage(toSubmitErrorMessage(error));
          return "failed";
      }
    }
  }, []);

  /*
   * 중복 제출 차단은 두 겹이다. `submitting`은 버튼을 비활성화해 두 번째 클릭을 막고,
   * `sealedRef`는 이미 제출이 끝난 뒤(완료 화면으로 넘어가는 몇 프레임 동안)의 호출을 막는다.
   * 그래도 뚫린다면 서버가 409 RESPONSE_ALREADY_SUBMITTED로 끊고 그것도 완료로 다룬다.
   *
   * 자동 저장과 **같은 줄(chainRef)** 에 세우므로, 진행 중인 PUT이 끝난 뒤에 POST가 나간다.
   */
  const submit = useCallback(async (): Promise<PublicFormSubmitOutcome> => {
    if (sealedRef.current) return "submitted";
    setSubmitting(true);
    try {
      return await enqueue(sendSubmit);
    } finally {
      if (aliveRef.current) setSubmitting(false);
    }
  }, [enqueue, sendSubmit]);

  /* ── 저장 상태 표시 ───────────────────────────────────────── */

  const save = useMemo<FormSaveStatus>(() => {
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
