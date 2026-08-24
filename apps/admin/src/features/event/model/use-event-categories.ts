"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createEventCategory,
  deleteEventCategory,
  EVENT_CATEGORY_ERROR,
  EVENT_CLSF_CD_PATTERN,
  EVENT_CLSF_NM_MAX_LENGTH,
  fetchEventCategories,
  updateEventCategory,
  type EventCategory,
  type EventCategoryCreateInput,
} from "@/entities/event";
import { syncSessionOnForbidden } from "@/entities/session";
import { ApiError } from "@/shared/lib/api/client";
import { toEventCategoryErrorMessage } from "./event-error";

/*
 * 행사 분류 관리 화면(/events/categories)의 조회·생성·수정·삭제 (#136 · D13).
 *
 * 구조의 근거는 features/role/model/use-role-classifications.ts와 같다 —
 * - 변이 뒤에는 목록을 다시 받는다(정렬 순서는 서버가 indctSeqno로 정한다). 이때 requestKey는
 *   바꾸지 않아 표 전체가 "불러오는 중"으로 깜빡이지 않는다.
 * - 오류 문구가 짚는 입력란(mutationErrorField)을 함께 돌려줘 화면이 aria-invalid를 틀린
 *   칸에만 건다. 서버가 거절한 실패는 어느 칸의 잘못인지 알 수 없어 null이다.
 *
 * 목록만 필요한 곳(목록 필터 칩·편집기 셀렉트)은 이 훅을 쓰지 않는다 — use-event-category-options.
 */

export type EventCategoriesStatus = "loading" | "ready" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedCategories {
  key: number;
  categories: EventCategory[];
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

export interface EventCategoryAdmin {
  categories: EventCategory[];
  status: EventCategoriesStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;

  /** 생성·수정·삭제 중 하나가 진행 중 */
  busy: boolean;
  /** 마지막 변이가 실패한 사유. 비어 있으면 정상 */
  mutationErrorMessage: string;
  /** 그 사유가 짚는 입력란. 서버가 거절한 실패는 null */
  mutationErrorField: EventCategoryField | null;
  clearMutationError: () => void;

  /** 성공하면 true — 화면은 이때만 입력란을 비우고 토스트를 띄운다 */
  create: (input: EventCategoryCreateInput) => Promise<boolean>;
  update: (eventClsfCd: string, input: EventCategoryEditInput) => Promise<boolean>;
  remove: (eventClsfCd: string) => Promise<boolean>;
}

/**
 * 인라인 편집 한 벌 — 이름과 표시 순번을 함께 보낸다.
 *
 * 순번을 문자열로 받는 것은 입력란이 문자열을 주기 때문이다 — 빈 칸("안 바꾼다")과 잘못 친
 * 값("3a")을 구별해야 한다(역할 분류와 같은 판단).
 */
export interface EventCategoryEditInput {
  eventClsfNm: string;
  indctSeqno: string;
}

/** 화면이 입력란과 오류를 묶는 데 쓰는 칸 이름 */
export type EventCategoryField = "eventClsfCd" | "eventClsfNm" | "indctSeqno";

/** 검증 실패 한 건 — 어느 칸이 왜 틀렸는가. 통과하면 null */
interface FieldError {
  field: EventCategoryField;
  message: string;
}

/**
 * 서버 400을 기다리지 않고 입력란 옆에서 먼저 걸러 준다. **최종 판정은 서버다** —
 * 여기를 통과해도 코드 중복(409)처럼 화면 혼자서는 알 수 없는 실패가 남아 있다.
 */
function validateCreate(input: EventCategoryCreateInput): FieldError | null {
  if (!input.eventClsfCd) {
    return { field: "eventClsfCd", message: "분류 코드를 입력하세요" };
  }
  /* 문장이 실패 사실로 시작해야 한다 — 상시 안내문과 첫 글자부터 갈리게 (ssccops#87 D-003) */
  if (!EVENT_CLSF_CD_PATTERN.test(input.eventClsfCd)) {
    return {
      field: "eventClsfCd",
      message: `분류 코드 "${input.eventClsfCd}" 는 쓸 수 없는 형식입니다 — 대문자로 시작하고 대문자·숫자·밑줄만 2~20자여야 합니다 (예: RECRUIT, SEMINAR)`,
    };
  }
  return validateName(input.eventClsfNm);
}

function validateName(eventClsfNm: string): FieldError | null {
  if (!eventClsfNm) {
    return { field: "eventClsfNm", message: "분류명을 입력하세요" };
  }
  if (eventClsfNm.length > EVENT_CLSF_NM_MAX_LENGTH) {
    return {
      field: "eventClsfNm",
      message: `분류명은 ${EVENT_CLSF_NM_MAX_LENGTH}자를 넘을 수 없습니다`,
    };
  }
  return null;
}

/** 표시 순번 상한 — 서버는 상한을 보지 않으므로 오타를 잡기 위한 값이다 (역할 분류와 같다) */
const INDCT_SEQNO_MAX = 9999;

/** 표시 순번 검증. 빈 칸은 "안 바꾼다"는 뜻이라 오류가 아니다 */
function validateDisplayOrder(indctSeqno: string): FieldError | null {
  if (!indctSeqno) return null;
  if (!/^[0-9]+$/.test(indctSeqno) || Number(indctSeqno) > INDCT_SEQNO_MAX) {
    return {
      field: "indctSeqno",
      message: `표시 순번은 0~${INDCT_SEQNO_MAX} 사이의 숫자여야 합니다 — 비워 두면 지금 순번을 그대로 씁니다`,
    };
  }
  return null;
}

export function useEventCategories(): EventCategoryAdmin {
  const [loaded, setLoaded] = useState<LoadedCategories | null>(null);
  const [requestKey, setRequestKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [mutationError, setMutationError] = useState<FieldError | null>(null);
  /* 서버가 거절한 실패는 어느 칸의 잘못인지 알 수 없어 칸 없이 문구만 남는다 */
  const [serverErrorMessage, setServerErrorMessage] = useState("");

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    fetchEventCategories()
      .then((categories) => {
        if (alive) setLoaded({ key: requestKey, categories, errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (alive) {
          setLoaded({
            key: requestKey,
            categories: [],
            errorMessage: toEventCategoryErrorMessage(error),
          });
        }
      });

    return () => {
      alive = false;
    };
  }, [requestKey]);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: EventCategoriesStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";

  /* 변이 함수가 실행되는 시점에 읽을 최신 key. 콜백 자체는 한 번만 만들어 둔다 */
  const keyRef = useRef(requestKey);
  useEffect(() => {
    keyRef.current = requestKey;
  });

  /** 같은 키 위에 결과만 갈아 끼운다 (로딩 표시 없음) */
  const refresh = useCallback(async (): Promise<void> => {
    const key = keyRef.current;
    const categories = await fetchEventCategories();
    if (aliveRef.current) setLoaded({ key, categories, errorMessage: "" });
  }, []);

  const reload = useCallback(() => setRequestKey((k) => k + 1), []);
  const clearMutationError = useCallback(() => {
    setMutationError(null);
    setServerErrorMessage("");
  }, []);

  // 같은 틱에 두 번 눌린 클릭은 그 사이에 렌더가 없어 상태 값이 아직 갱신되지 않는다
  const busyRef = useRef(false);

  /**
   * 변이 한 번의 공통 절차 — 잠금 · 오류 문구 · 성공 후 재조회.
   * 재조회 실패를 변이 실패로 보이게 하지 않는다(이미 서버에는 반영된 뒤다).
   */
  const run = useCallback(
    async (action: () => Promise<void>): Promise<boolean> => {
      if (busyRef.current) return false;
      busyRef.current = true;
      setBusy(true);
      setMutationError(null);
      setServerErrorMessage("");

      try {
        await action();
        await refresh().catch(() => {});
        return true;
      } catch (error: unknown) {
        // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
        syncSessionOnForbidden(error);
        if (aliveRef.current) {
          setServerErrorMessage(toEventCategoryErrorMessage(error));
        }
        /*
         * 없는 분류(404)이거나 그 사이에 행사가 이 분류를 쓰게 돼 IN_USE가 됐다면 화면이
         * 들고 있는 목록이 낡았다는 뜻이다 — 조용히 다시 받는다(역할 분류와 같은 판단).
         */
        if (
          error instanceof ApiError &&
          (error.code === EVENT_CATEGORY_ERROR.EVENT_CLASSIFICATION_NOT_FOUND ||
            error.code === EVENT_CATEGORY_ERROR.EVENT_CLASSIFICATION_IN_USE)
        ) {
          await refresh().catch(() => {});
        }
        return false;
      } finally {
        busyRef.current = false;
        if (aliveRef.current) setBusy(false);
      }
    },
    [refresh],
  );

  const create = useCallback(
    async (input: EventCategoryCreateInput): Promise<boolean> => {
      const trimmed: EventCategoryCreateInput = {
        // 코드는 대문자만 허용하므로 소문자로 친 것을 올려 준다 — 형식 오류의 대부분이 이것이다
        eventClsfCd: input.eventClsfCd.trim().toUpperCase(),
        eventClsfNm: input.eventClsfNm.trim(),
        indctSeqno: input.indctSeqno,
      };
      const invalid = validateCreate(trimmed);
      if (invalid) {
        setMutationError(invalid);
        setServerErrorMessage("");
        return false;
      }
      return run(() => createEventCategory(trimmed));
    },
    [run],
  );

  const update = useCallback(
    async (eventClsfCd: string, input: EventCategoryEditInput): Promise<boolean> => {
      const eventClsfNm = input.eventClsfNm.trim();
      const indctSeqno = input.indctSeqno.trim();
      const invalid = validateName(eventClsfNm) ?? validateDisplayOrder(indctSeqno);
      if (invalid) {
        setMutationError(invalid);
        setServerErrorMessage("");
        return false;
      }
      return run(() =>
        updateEventCategory(eventClsfCd, {
          eventClsfNm,
          // 빈 칸은 "그대로 두라"이며 본문에 null로 나간다 — 그 판단은 서버가 한다
          indctSeqno: indctSeqno ? Number(indctSeqno) : undefined,
        }),
      );
    },
    [run],
  );

  const remove = useCallback(
    (eventClsfCd: string): Promise<boolean> => run(() => deleteEventCategory(eventClsfCd)),
    [run],
  );

  return {
    categories: current?.categories ?? [],
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
    busy,
    mutationErrorMessage: mutationError?.message ?? serverErrorMessage,
    mutationErrorField: mutationError?.field ?? null,
    clearMutationError,
    create,
    update,
    remove,
  };
}
