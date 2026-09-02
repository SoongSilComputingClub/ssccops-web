"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createForm,
  fetchForm,
  FORM_ERROR,
  FORM_LABEL_ERROR,
  updateForm,
  type FormLabelRef,
  type FormSaveInput,
} from "@/entities/form";
import { syncSessionOnForbidden } from "@/entities/session";
import { ROUTES } from "@/shared/config/routes";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";
import { emptyFormDraft, toFormDraft, toFormSaveInput, type FormDraft } from "./form-draft";
import { toFormErrorMessage } from "./form-error";
import { validateFormDraft, type FormDraftIssues } from "./form-validation";

/*
 * 폼 편집기 상태 + 자동 저장.
 *
 * ── 무엇을 언제 보내는가 ───────────────────────────────────────
 * 편집기의 모든 조작이 draft를 바꾼다. 그대로 매번 보내면 타이핑 한 글자마다 PUT이 나가므로
 * **마지막 변경 이후 700ms 조용해지면 1회** 보낸다. 500ms는 한글 조합 중에도 요청이 끊겨
 * 나가고, 1000ms는 저장됐다는 확신이 늦게 온다 — 그 사이 값으로 잡았다.
 *
 * ── 무엇을 "변경"으로 볼 것인가 ─────────────────────────────────
 * 상태를 별도로 들고 다니며 "더러움" 플래그를 켜고 끄지 않는다. 대신 **지금 보낼 본문을
 * 직렬화한 문자열(payloadKey)** 과 **마지막으로 저장에 성공한 본문의 문자열(savedKey)** 을
 * 비교한다. 이렇게 하면
 * - 값을 고쳤다가 되돌린 경우 자동으로 저장할 것이 없어진다 (플래그 방식은 계속 켜져 있다)
 * - 저장 대상이 아닌 상태(열려 있는 문항 카드, 현재 페이지 등)는 애초에 키에 들어가지 않는다
 * - 이펙트 본문에서 setState 할 일이 없다 (react-hooks/set-state-in-effect)
 *
 * ── 요청 순서 보장과 첫 저장 잠금 ───────────────────────────────
 * 저장 요청은 **하나의 프라미스 체인에 줄을 세운다.** 동시에 두 개가 날아가지 않으므로 늦게
 * 도착한 이전 응답이 나중 상태를 덮어쓸 여지 자체가 없고, 신규 폼의 첫 저장(POST)이 두 번
 * 나가 폼이 2개 생기는 사고도 같은 장치로 막힌다 — 뒤에 줄 선 요청은 앞의 POST가 끝난 뒤에야
 * 실행되고, 그때는 이미 formId가 잡혀 있어 PUT으로 나간다.
 *
 * 또한 실제로 보내는 순간의 본문은 **항상 최신 스냅샷**(contextRef)에서 읽는다. 디바운스
 * 타이머가 잡아 둔 옛 클로저의 값을 보내면, 기다리는 동안 더 고친 내용이 오래된 내용으로
 * 덮어쓰이기 때문이다.
 *
 * ── 접수 상태 ────────────────────────────────────────────────
 * 자동 저장은 formSttsCd를 **받은 그대로 되돌려 보낸다.** 접수 시작·마감은 별도 API
 * (ssccops-server #33 · 웹 #9)이며, 편집 중 저장이 상태를 바꾸면 접수 중이던 폼이 조용히
 * 닫히거나 열린다.
 */

/** 마지막 변경 이후 이 시간만큼 조용하면 저장한다 */
const AUTOSAVE_DEBOUNCE_MS = 700;

/** 실패 후 자동 재시도 간격(ms). 다 쓰면 수동 재시도로 넘긴다 */
const RETRY_DELAYS_MS = [1_500, 3_000, 6_000, 12_000];

export type FormEditorStatus = "loading" | "ready" | "not-found" | "error";

export type FormSaveState =
  /** 저장할 변경이 없다 (아직 아무것도 안 고침) */
  | "clean"
  /** 변경은 있고 디바운스를 기다리는 중 */
  | "pending"
  | "saving"
  | "saved"
  /** 보내 봐야 거절당할 상태라 보류 중 */
  | "blocked"
  | "failed";

export interface FormSaveStatus {
  state: FormSaveState;
  /** 마지막 저장 성공 시각 "HH:mm". 이번 편집에서 아직 저장한 적이 없으면 "" */
  savedAt: string;
  /** blocked·failed일 때의 사유 */
  message: string;
  /** 자동 재시도가 예약돼 있는가 */
  retrying: boolean;
}

export interface FormEditor {
  status: FormEditorStatus;
  /** status === "error"일 때만 채워진다 */
  loadErrorMessage: string;
  reload: () => void;
  /** 신규 폼은 첫 저장 전까지 null */
  formId: number | null;
  draft: FormDraft;
  labelIds: number[];
  /**
   * 폼을 불러온 시점에 이미 지정돼 있던 라벨(이름 포함).
   *
   * 화면이 라벨 후보를 활성 라벨만 받아 오기 때문에, **비활성화된 뒤에도 이 폼에는 지정돼
   * 있는 라벨**은 후보 목록 어디에도 없어 이름을 알 길이 없다. 그 이름의 유일한 출처가 폼
   * 상세 응답이므로 여기에 그대로 실어 둔다 — 화면은 이 목록으로 "지정된 비활성 라벨" 칩을
   * 그린다. 편집 중 갱신하지 않는 **로드 시점 스냅샷**이다.
   */
  assignedLabels: FormLabelRef[];
  setDraft: (updater: (draft: FormDraft) => FormDraft) => void;
  setLabelIds: (updater: (labelIds: number[]) => number[]) => void;
  issues: FormDraftIssues;
  /**
   * 이미 응답이 달려 삭제하면 서버가 409로 막는 문항 ID들 (응답 없는 폼이면 빈 배열).
   * 화면이 삭제를 **누르는 순간** 경고할 수 있게 노출한다 — 지운 뒤 저장이 보류된 것을
   * 보고 되돌리는 것보다, 지우기 전에 아는 편이 낫다.
   */
  inUseQitemIds: string[];
  /** 시스템 폼인가 (ssccops-server #140) — 편집 화면이 무엇이 잠겼는지 안내하는 근거 */
  sysYn: boolean;
  /**
   * 이미 응답이 들어온 폼인가 (제출 이상만 센다 · 작성 중은 빠진다).
   *
   * **잠그기 위한 값이 아니라 알리기 위한 값이다.** 다중 응답 허용은 접수 중에도 바꿀 수
   * 있고(서버 FormEntity.update) 끄더라도 이미 들어온 응답은 지워지지 않는데, 그 사실을
   * 말해 주지 않으면 운영자는 끄는 것이 지난 응답까지 무르는 조작인 줄 안다.
   */
  hasResponses: boolean;
  /** 지금 저장돼 있는 문항 구성 버전. 서버가 주지 않으면 null */
  qitemVer: number | null;
  /**
   * 시스템이 요구해 지울 수 없는 문항 ID들 — **폼 상세가 실어 준 서버의 계약 그대로다**
   * (ssccops-server #155).
   *
   * 예전에는 400 `SYSTEM_FORM_CONTRACT_VIOLATION`을 받은 저장에서 사라진 문항을 역산했다.
   * 그때는 서버가 계약을 응답에 싣지 않아 그 방법밖에 없었지만, 결과적으로 **잠금이 사후에만
   * 걸렸다** — 운영자는 계약 문항을 지우고 저장이 거절된 뒤에야 못 지운다는 것을 알았다.
   * 지금은 첫 로드부터 잠긴다.
   *
   * 시스템 폼이 아니면 빈 배열이고, 시스템 폼이라도 계약에 없는 문항은 잠기지 않는다.
   */
  systemRequiredQitemIds: string[];
  /**
   * 이 폼이 연결된 학술 활동 id — 일반 폼이면 `null` (ssccops-server #190 · #194).
   *
   * 학술 폼의 접수 기간은 "모집 관리" 화면에서만 설정하므로, 편집 화면은 이 값이 `null`이
   * 아니면 접수 기간 입력란·`저장하고 바로 접수 시작` 버튼을 감춘다. 신규 폼은 언제나 `null`
   * (코드가 폼을 가리키는 자리는 서버 안에만 있다).
   */
  academicProgramId: number | null;
  save: FormSaveStatus;
  /** 디바운스를 건너뛰고 지금 저장한다 — 저장된 formId, 보류·실패면 null */
  saveNow: () => Promise<number | null>;
  /** 실패 표시를 지우고 즉시 다시 시도한다 */
  retry: () => void;
  /** 저장되지 않은 변경이 있는가 (이탈 경고 기준) */
  dirty: boolean;
}

/** 로드 결과 + 그 결과를 만든 요청의 식별자 (use-form-list.ts의 파생 로딩 패턴과 같다) */
interface LoadedEditor {
  key: string;
  outcome: Exclude<FormEditorStatus, "loading">;
  errorMessage: string;
  draft: FormDraft;
  labelIds: number[];
  /** 로드 시점에 지정돼 있던 라벨 — 비활성 라벨의 이름을 아는 유일한 출처다 */
  assignedLabels: FormLabelRef[];
  /** 서버에 이미 저장돼 있는 문항 ID — 삭제 경고(409 QUESTION_ITEM_IN_USE)의 기준 */
  savedQitemIds: string[];
  hasResponses: boolean;
  sysYn: boolean;
  qitemVer: number | null;
  /** 상세 응답이 준 '지울 수 없는 문항' — 로드 시점 그대로다 (FormEditor 주석 참고) */
  systemRequiredQitemIds: string[];
  /** 연결된 학술 활동 id — 일반 폼이면 null (FormEditor 주석 참고) */
  academicProgramId: number | null;
}

interface SavedMark {
  key: string;
  /** epoch ms. 0이면 "서버에서 불러온 그대로"이며 저장 시각을 표시하지 않는다 */
  at: number;
}

interface SaveFailure {
  /** 어떤 본문을 보내다 실패했는가 — 내용이 바뀌면 새 시도로 친다 */
  key: string;
  message: string;
  retryable: boolean;
  attempts: number;
}

/** 로드 실패 상태에서도 draft 자리를 비워 두지 않는다 — 화면이 옵셔널 체이닝으로 뒤덮이지 않게 */
function placeholderEditor(
  key: string,
  outcome: Exclude<FormEditorStatus, "loading" | "ready">,
  errorMessage: string,
): LoadedEditor {
  return {
    key,
    outcome,
    errorMessage,
    draft: emptyFormDraft(),
    labelIds: [],
    assignedLabels: [],
    savedQitemIds: [],
    hasResponses: false,
    sysYn: false,
    qitemVer: null,
    systemRequiredQitemIds: [],
    academicProgramId: null,
  };
}

/** 새로 만드는 폼은 시스템 폼이 될 수 없다 — 코드가 폼을 가리키는 자리는 서버 안에만 있다 */
function newFormEditor(key: string): LoadedEditor {
  return {
    key,
    outcome: "ready",
    errorMessage: "",
    draft: emptyFormDraft(),
    labelIds: [],
    assignedLabels: [],
    savedQitemIds: [],
    hasResponses: false,
    sysYn: false,
    qitemVer: null,
    systemRequiredQitemIds: [],
    // 신규 폼은 학술 활동에 연결될 수 없다 — 연결은 기획안 승인 이관이 서버에서 만든다
    academicProgramId: null,
  };
}

function payloadKeyOf(input: FormSaveInput): string {
  return JSON.stringify(input);
}

/** 로드 전·실패 시 화면이 쓰는 자리표시 초안. 매 렌더 새로 만들면 검증이 계속 다시 돈다 */
const EMPTY_DRAFT: FormDraft = emptyFormDraft();
const EMPTY_LABEL_IDS: number[] = [];
const EMPTY_ASSIGNED_LABELS: FormLabelRef[] = [];
const EMPTY_QITEM_IDS: string[] = [];

/** epoch ms → "HH:mm" (사용자 시계 기준) */
function formatClock(at: number): string {
  const date = new Date(at);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * 다시 보내 볼 가치가 있는 실패인가.
 *
 * 네트워크 단절·서버 오류는 그대로 다시 보내면 성공할 수 있지만, 400·409는 본문이 그대로인 한
 * 몇 번을 보내도 같은 답이 온다 — 재시도하면 화면만 계속 "저장 실패"를 깜빡인다.
 */
function isRetryable(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true;
  if (error.code === API_ERROR.NETWORK_ERROR) return true;
  if (error.code === API_ERROR.CONFIG_MISSING) return false;
  return error.status >= 500;
}

function toSaveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case FORM_ERROR.FORM_NOT_FOUND:
        return "폼을 찾을 수 없습니다 — 이미 삭제된 폼일 수 있습니다";
      case FORM_ERROR.QUESTION_ITEM_IN_USE:
        return "이미 응답이 있어 기존 문항을 삭제·변경할 수 없습니다";
      /*
       * 시스템 폼의 계약 위반(400)은 toFormErrorMessage가 잠금 안내와 같은 문장으로 바꾼다.
       * 여기서 따로 적지 않는 것은 그 문장이 두 벌이 되지 않게 하기 위해서다 — 화면이 미리
       * 잠글 때와 서버가 거절할 때가 같은 말이어야 한다(entities/form/model/display.ts).
       */
      case FORM_ERROR.INVALID_QUESTION_COMPOSITION:
        return `문항 구성이 올바르지 않습니다 — ${error.message}`;
      case FORM_ERROR.INVALID_RECEIPT_PERIOD:
        return "접수 시작·종료 일시가 올바르지 않습니다";
      /*
       * 라벨 지정은 폼 저장 본문(labelIds)으로 나가므로 라벨 오류도 여기로 온다.
       * **새로** 추가한 라벨이 그 사이 비활성화된 경우다 — 이미 지정돼 있던 비활성 라벨을
       * 그대로 다시 보내는 저장은 서버가 통과시킨다(ssccops-server #34).
       */
      case FORM_LABEL_ERROR.FORM_LABEL_NOT_USABLE:
        return "비활성화된 라벨은 새로 지정할 수 없습니다. 라벨 선택을 다시 확인해주세요";
      default:
        return toFormErrorMessage(error);
    }
  }
  return toFormErrorMessage(error);
}

export function useFormEditor(formId?: number): FormEditor {
  /*
   * URL의 formId는 손으로 고칠 수 있다. 숫자가 아니면 서버까지 갈 것 없이 없는 폼으로 끊는다.
   * (use-form-detail.ts와 같은 판단)
   */
  const loadableFormId =
    formId !== undefined && Number.isInteger(formId) && formId > 0 ? formId : null;
  const isNewForm = formId === undefined;

  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${formId ?? "new"}|${reloadKey}`;

  const [loaded, setLoaded] = useState<LoadedEditor | null>(() =>
    isNewForm ? newFormEditor("new|0") : null,
  );

  /*
   * 신규 폼은 "빈 초안 그대로"를 이미 저장된 상태로 친다. 안 그러면 아무것도 입력하지 않은
   * 화면이 처음부터 미저장 변경으로 잡혀 그냥 닫기만 해도 이탈 경고가 뜬다.
   */
  const [saved, setSaved] = useState<SavedMark | null>(() =>
    isNewForm ? { key: payloadKeyOf(toFormSaveInput(emptyFormDraft(), [])), at: 0 } : null,
  );
  const [failure, setFailure] = useState<SaveFailure | null>(null);
  const [saving, setSaving] = useState(false);
  /** 첫 저장(POST)으로 받은 폼 ID. 이후 저장은 이 값으로 PUT 한다 */
  const [createdFormId, setCreatedFormId] = useState<number | null>(null);

  /* ── 비동기 저장이 참조하는 값들 ──────────────────────────── */

  const aliveRef = useRef(true);
  /** 저장 대상 폼 ID. null이면 아직 만들어지지 않은 폼이다 */
  const formIdRef = useRef<number | null>(loadableFormId);
  /** 마지막으로 저장에 성공한 본문 키 — 저장 함수는 상태가 아니라 이 값을 본다(동기 갱신) */
  const savedKeyRef = useRef(saved?.key ?? "");
  const attemptsRef = useRef<{ key: string; count: number }>({ key: "", count: 0 });
  /** 진행 중인 저장의 줄 — 여기에 이어 붙여 요청을 직렬화한다 */
  const chainRef = useRef<Promise<number | null>>(Promise.resolve(null));

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  /* ── 로드 ─────────────────────────────────────────────────── */

  useEffect(() => {
    if (isNewForm) return;

    let alive = true;

    if (loadableFormId === null) {
      // 잘못된 URL — 조회 없이 끝낸다. 이펙트 본문이 아닌 마이크로태스크에서 반영한다
      void Promise.resolve().then(() => {
        if (alive) setLoaded(placeholderEditor(requestKey, "not-found", ""));
      });
      return () => {
        alive = false;
      };
    }

    fetchForm(loadableFormId)
      .then((form) => {
        if (!alive) return;

        const draft = toFormDraft(form);
        const labelIds = form.labels.map((l) => l.formLblId);
        // 불러온 그대로는 이미 저장된 내용이다 — 진입만 하고 나가도 저장이 나가면 안 된다
        savedKeyRef.current = payloadKeyOf(toFormSaveInput(draft, labelIds));
        setSaved({ key: savedKeyRef.current, at: 0 });
        setLoaded({
          key: requestKey,
          outcome: "ready",
          errorMessage: "",
          draft,
          labelIds,
          assignedLabels: form.labels,
          savedQitemIds: form.qitemCpstCn.qitems.map((q) => q.qitemId),
          hasResponses: form.responseCount > 0,
          sysYn: form.sysYn,
          qitemVer: form.qitemVer,
          systemRequiredQitemIds: form.systemRequiredQitemIds,
          academicProgramId: form.academicProgramId,
        });
      })
      .catch((error: unknown) => {
        if (!alive) return;

        const notFound =
          error instanceof ApiError && error.code === FORM_ERROR.FORM_NOT_FOUND;
        setLoaded(
          placeholderEditor(
            requestKey,
            notFound ? "not-found" : "error",
            notFound ? "" : toFormErrorMessage(error),
          ),
        );
      });

    return () => {
      alive = false;
    };
  }, [isNewForm, loadableFormId, requestKey]);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: FormEditorStatus = current?.outcome ?? "loading";

  const draft = current?.draft ?? EMPTY_DRAFT;
  const labelIds = current?.labelIds ?? EMPTY_LABEL_IDS;
  const assignedLabels = current?.assignedLabels ?? EMPTY_ASSIGNED_LABELS;

  /* ── 편집 ─────────────────────────────────────────────────── */

  const setDraft = useCallback((updater: (draft: FormDraft) => FormDraft) => {
    setLoaded((prev) =>
      prev?.outcome === "ready" ? { ...prev, draft: updater(prev.draft) } : prev,
    );
  }, []);

  const setLabelIds = useCallback((updater: (labelIds: number[]) => number[]) => {
    setLoaded((prev) =>
      prev?.outcome === "ready" ? { ...prev, labelIds: updater(prev.labelIds) } : prev,
    );
  }, []);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  /* ── 검증 · 변경 감지 ─────────────────────────────────────── */

  const systemRequiredQitemIds = current?.systemRequiredQitemIds ?? EMPTY_QITEM_IDS;

  const issues = useMemo(
    () =>
      validateFormDraft(draft, {
        savedQitemIds: current?.savedQitemIds ?? [],
        hasResponses: current?.hasResponses ?? false,
        systemRequiredQitemIds,
      }),
    [draft, current?.savedQitemIds, current?.hasResponses, systemRequiredQitemIds],
  );

  const inUseQitemIds = useMemo(
    () => (current?.hasResponses ? (current?.savedQitemIds ?? []) : EMPTY_QITEM_IDS),
    [current?.hasResponses, current?.savedQitemIds],
  );

  const saveInput = useMemo(() => toFormSaveInput(draft, labelIds), [draft, labelIds]);
  const payloadKey = useMemo(() => payloadKeyOf(saveInput), [saveInput]);
  const dirty = status === "ready" && payloadKey !== saved?.key;
  const blockingMessage = issues.blockingMessage;

  /*
   * 저장 함수가 실행 시점에 읽을 최신값. 렌더마다 갱신한다(의존성 배열 없음) — 디바운스
   * 타이머가 만들어질 때의 값이 아니라 **타이머가 실제로 터질 때의 값**을 보내야 한다.
   */
  const contextRef = useRef({ payloadKey, saveInput, blockingMessage });
  useEffect(() => {
    contextRef.current = { payloadKey, saveInput, blockingMessage };
  });

  /* ── 저장 ─────────────────────────────────────────────────── */

  const sendLatest = useCallback(async (): Promise<number | null> => {
    const { payloadKey: key, saveInput: input, blockingMessage: blocked } =
      contextRef.current;

    // 줄을 서 있는 동안 앞 요청이 같은 내용을 이미 저장했을 수 있다
    if (key === savedKeyRef.current) return formIdRef.current;
    if (blocked) return null;

    if (aliveRef.current) setSaving(true);

    try {
      const targetFormId = formIdRef.current;
      const result =
        targetFormId === null
          ? await createForm(input)
          : await updateForm(targetFormId, input);

      if (targetFormId === null) {
        /*
         * 첫 저장 잠금. 이 대입 이후로 이 편집기는 절대 POST를 다시 내지 않는다.
         * (동시 실행 자체는 체인이 막지만, 잠금은 여기서 확정된다)
         */
        formIdRef.current = result.formId;
        if (aliveRef.current) {
          setCreatedFormId(result.formId);
          /*
           * router.replace가 아니라 native History API를 쓴다(Next가 라우터와 동기화한다).
           * router.replace는 /forms/new → /forms/{id}/edit 로 **라우트가 바뀌어 화면이 다시
           * 마운트**되므로, 저장 직후 계속 타이핑하던 사용자의 입력 포커스와 열어 둔 문항
           * 카드가 통째로 사라진다. 새로고침 시점부터는 정상적으로 편집 URL이 열린다.
           */
          window.history.replaceState(null, "", ROUTES.formEdit(result.formId));
        }
      }

      savedKeyRef.current = key;
      attemptsRef.current = { key: "", count: 0 };
      if (aliveRef.current) {
        setSaved({ key, at: Date.now() });
        setFailure(null);
      }
      return result.formId;
    } catch (error: unknown) {
      /*
       * 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다.
       * 자동 저장은 403을 재시도하지 않는다(isRetryable이 5xx만 통과시킨다) — 권한이 없는데
       * 계속 다시 보내면 실패 배너만 깜빡이고 서버에는 403이 쌓인다.
       */
      syncSessionOnForbidden(error);
      const count = attemptsRef.current.key === key ? attemptsRef.current.count + 1 : 1;
      attemptsRef.current = { key, count };
      if (aliveRef.current) {
        setFailure({
          key,
          message: toSaveErrorMessage(error),
          retryable: isRetryable(error),
          attempts: count,
        });
      }
      return null;
    } finally {
      if (aliveRef.current) setSaving(false);
    }
  }, []);

  /** 저장 요청을 한 줄로 세운다 — 동시에 두 개가 나가지 않으므로 응답 순서가 뒤집히지 않는다 */
  const saveNow = useCallback((): Promise<number | null> => {
    const next = chainRef.current.then(sendLatest, sendLatest);
    chainRef.current = next.catch(() => null);
    return next;
  }, [sendLatest]);

  const retry = useCallback(() => {
    attemptsRef.current = { key: "", count: 0 };
    setFailure(null);
    void saveNow();
  }, [saveNow]);

  /*
   * 디바운스. 본문이 바뀔 때마다 이 이펙트가 다시 돌면서 이전 타이머를 지우므로, 결과적으로
   * "마지막 변경 이후 조용해진 뒤 1회"가 된다. 이펙트 본문은 타이머만 걸고 setState 하지 않는다.
   */
  const sameFailure = failure?.key === payloadKey ? failure : null;
  const retryExhausted =
    sameFailure !== null &&
    (!sameFailure.retryable || sameFailure.attempts >= RETRY_DELAYS_MS.length);

  useEffect(() => {
    if (status !== "ready" || !dirty || blockingMessage || retryExhausted) return;

    const delay =
      sameFailure === null
        ? AUTOSAVE_DEBOUNCE_MS
        : RETRY_DELAYS_MS[Math.min(sameFailure.attempts, RETRY_DELAYS_MS.length) - 1];

    const timer = setTimeout(() => void saveNow(), delay);
    return () => clearTimeout(timer);
  }, [status, dirty, blockingMessage, payloadKey, sameFailure, retryExhausted, saveNow]);

  /*
   * 이탈 경고. 자동 저장이 있어도 마지막 변경 직후·저장 실패 중에는 아직 서버에 없는 내용이
   * 남아 있다. 브라우저가 문구를 정하므로 여기서는 "막겠다"는 표시만 한다.
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

  /* ── 저장 상태 표시 ───────────────────────────────────────── */

  const save = useMemo<FormSaveStatus>(() => {
    const savedAt = saved?.at ? formatClock(saved.at) : "";

    if (saving) return { state: "saving", savedAt, message: "", retrying: false };
    if (dirty && blockingMessage) {
      return { state: "blocked", savedAt, message: blockingMessage, retrying: false };
    }
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
  }, [saving, dirty, blockingMessage, sameFailure, retryExhausted, saved]);

  return {
    status,
    loadErrorMessage: current?.errorMessage ?? "",
    reload,
    formId: createdFormId ?? loadableFormId,
    draft,
    labelIds,
    assignedLabels,
    setDraft,
    setLabelIds,
    issues,
    inUseQitemIds,
    sysYn: current?.sysYn ?? false,
    hasResponses: current?.hasResponses ?? false,
    qitemVer: current?.qitemVer ?? null,
    systemRequiredQitemIds,
    academicProgramId: current?.academicProgramId ?? null,
    save,
    saveNow,
    retry,
    dirty,
  };
}
