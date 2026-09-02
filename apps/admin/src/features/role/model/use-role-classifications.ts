"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ROLE_CLASSIFICATION_ERROR,
  ROLE_CLSF_CD_PATTERN,
  ROLE_CLSF_NM_MAX_LENGTH,
  createRoleClassification,
  deleteRoleClassification,
  fetchRoleClassifications,
  updateRoleClassification,
  type RoleClassification,
  type RoleClassificationCreateInput,
} from "@/entities/role";
import { syncSessionOnForbidden } from "@/entities/session";
import { ApiError } from "@/shared/lib/api/client";
import { toRoleClassificationErrorMessage } from "./role-error";

/*
 * 역할 분류 관리 화면(/members/role-labels)의 조회·생성·수정·삭제 (#49 · 서버 #80).
 *
 * 목록만 필요한 곳(역할 목록의 필터 칩·역할 편집의 분류 칩)은 이 훅을 쓰지 않는다 — 저쪽은
 * 한 번 받아 두면 끝이고 이쪽은 계속 고친다. 한 훅에 합치면 필터 화면까지 관리 화면의 변이
 * 상태를 들고 다니게 된다(features/form 의 use-form-labels ↔ use-form-label-options 와 같은 분리).
 *
 * ── 변이 뒤에는 목록을 다시 받는다 ──────────────────────────────
 * 성공해도 응답으로 배열을 고치지 않는다. `roleCount` 는 서버 집계이고 정렬 순서도 서버가
 * indctSeqno 로 정하는데, 웹이 그걸 흉내 내기 시작하면 화면 숫자와 서버 숫자가 조용히 갈라진다.
 *
 * 단 이때 requestKey 는 **바꾸지 않는다.** 키를 올리면 표 전체가 "불러오는 중" 으로 돌아가,
 * 이름 한 자 고칠 때마다 화면이 통째로 깜빡인다. 사용자가 직접 누르는 재시도(reload)만 로딩
 * 표시를 동반한다. (use-form-labels.ts · use-authority-tree.ts 와 같은 판단)
 */

export type RoleClassificationsStatus = "loading" | "ready" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedClassifications {
  key: number;
  classifications: RoleClassification[];
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

export interface RoleClassificationAdmin {
  classifications: RoleClassification[];
  status: RoleClassificationsStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;

  /** 생성·수정·삭제 중 하나가 진행 중 */
  busy: boolean;
  /** 마지막 변이가 실패한 사유. 비어 있으면 정상 */
  mutationErrorMessage: string;
  /**
   * 그 사유가 짚는 입력란. 서버가 거절한 실패는 **null** 이다.
   *
   * 화면이 `aria-invalid` 를 어디에 걸지 정하는 근거다. 예전에는 이 값이 없어 "오류가 있다"는
   * 사실만으로 코드·이름 두 칸에 모두 걸었고, 코드 형식 하나가 틀려도 보조기술에는 "두 칸이
   * 잘못됐다"로 전달됐다(ssccops#87 D-003). 서버 거절(중복 코드 등)은 어느 칸의 잘못인지
   * 웹이 알 수 없으므로 null 로 두고, 그때는 아무 칸도 잘못됐다고 말하지 않는다.
   */
  mutationErrorField: RoleClassificationField | null;
  clearMutationError: () => void;

  /** 성공하면 true — 화면은 이때만 입력란을 비우고 토스트를 띄운다 */
  create: (input: RoleClassificationCreateInput) => Promise<boolean>;
  update: (roleClsfCd: string, input: RoleClassificationEditInput) => Promise<boolean>;
  remove: (roleClsfCd: string) => Promise<boolean>;
}

/**
 * 인라인 편집 한 벌 — 이름과 표시 순번을 **함께** 보낸다.
 *
 * 순번을 문자열로 받는 것은 입력란이 문자열을 주기 때문이다. 화면에서 숫자로 바꿔 넘기면
 * 빈 칸·`"3a"` 같은 값이 `NaN`이 되어 "안 바꾼 것"과 "잘못 친 것"이 구별되지 않는다.
 * 비어 있으면 서버가 현재 값을 유지하고(본문에 null), 그 밖에는 여기서 형식을 먼저 본다.
 */
export interface RoleClassificationEditInput {
  roleClsfNm: string;
  indctSeqno: string;
}

/** 화면이 입력란과 오류를 묶는 데 쓰는 칸 이름 */
export type RoleClassificationField = "roleClsfCd" | "roleClsfNm" | "indctSeqno";

/** 검증 실패 한 건 — 어느 칸이 왜 틀렸는가. 통과하면 null */
interface FieldError {
  field: RoleClassificationField;
  message: string;
}

/**
 * 서버 400 을 기다리지 않고 입력란 옆에서 먼저 걸러 준다.
 *
 * **최종 판정은 서버다.** 여기를 통과해도 코드 중복(409)처럼 화면 혼자서는 알 수 없는 실패가
 * 남아 있고, 그때는 호출부의 catch 가 서버 코드로 다시 문구를 정한다.
 */
function validateCreate(input: RoleClassificationCreateInput): FieldError | null {
  if (!input.roleClsfCd) {
    return { field: "roleClsfCd", message: "분류 코드를 입력하세요" };
  }
  /*
   * 문장이 **실패 사실로 시작해야 한다**. 예전 문구는 입력란 아래 상시 안내문("분류 코드는
   * 대문자로 시작하고 …")과 앞부분이 글자 단위로 같아, 새로 뜬 오류가 원래 있던 안내로
   * 읽혔다 — QA 가 "아무 안내도 없다"고 본 이유다(ssccops#87 D-003). 규칙 설명은 뒤로 민다.
   */
  if (!ROLE_CLSF_CD_PATTERN.test(input.roleClsfCd)) {
    return {
      field: "roleClsfCd",
      message: `분류 코드 "${input.roleClsfCd}" 는 쓸 수 없는 형식입니다 — 대문자로 시작하고 대문자·숫자·밑줄만 2~20자여야 합니다 (예: PROJECT, TF)`,
    };
  }
  return validateName(input.roleClsfNm);
}

function validateName(roleClsfNm: string): FieldError | null {
  if (!roleClsfNm) {
    return { field: "roleClsfNm", message: "분류명을 입력하세요" };
  }
  if (roleClsfNm.length > ROLE_CLSF_NM_MAX_LENGTH) {
    return {
      field: "roleClsfNm",
      message: `분류명은 ${ROLE_CLSF_NM_MAX_LENGTH}자를 넘을 수 없습니다`,
    };
  }
  return null;
}

/** 표시 순번 상한. 서버는 상한을 두지 않으므로 이 숫자는 오타를 잡기 위한 것이다 */
const INDCT_SEQNO_MAX = 9999;

/**
 * 표시 순번 검증. 빈 칸은 "안 바꾼다"는 뜻이라 오류가 아니다.
 *
 * 서버는 `Integer` 를 그대로 받아 상한도 음수도 보지 않는다 — 목록에서 몇 번째로 그릴지일
 * 뿐이라 무엇도 깨뜨리지 않기 때문이다. 그래도 여기서 거르는 것은 `-1` 이나 `20260816` 이
 * 조용히 저장되면 표가 왜 그 순서로 그려지는지 아무도 설명하지 못하게 되기 때문이다.
 */
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

export function useRoleClassifications(): RoleClassificationAdmin {
  const [loaded, setLoaded] = useState<LoadedClassifications | null>(null);
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

    fetchRoleClassifications()
      .then((classifications) => {
        if (alive) setLoaded({ key: requestKey, classifications, errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (alive) {
          setLoaded({
            key: requestKey,
            classifications: [],
            errorMessage: toRoleClassificationErrorMessage(error),
          });
        }
      });

    return () => {
      alive = false;
    };
  }, [requestKey]);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: RoleClassificationsStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";

  /* 변이 함수가 **실행되는 시점**에 읽을 최신 key. 콜백 자체는 한 번만 만들어 둔다 */
  const keyRef = useRef(requestKey);
  useEffect(() => {
    keyRef.current = requestKey;
  });

  /** 같은 키 위에 결과만 갈아 끼운다 (로딩 표시 없음) */
  const refresh = useCallback(async (): Promise<void> => {
    const key = keyRef.current;
    const classifications = await fetchRoleClassifications();
    if (aliveRef.current) setLoaded({ key, classifications, errorMessage: "" });
  }, []);

  const reload = useCallback(() => setRequestKey((k) => k + 1), []);
  const clearMutationError = useCallback(() => {
    setMutationError(null);
    setServerErrorMessage("");
  }, []);

  // 같은 틱에 두 번 눌린 클릭은 그 사이에 렌더가 없어 상태 값이 아직 갱신되지 않는다
  const busyRef = useRef(false);

  /**
   * 변이 한 번의 공통 절차 — 잠금 · 오류 문구 · 성공 후 재조회를 한곳에 모은다.
   *
   * 재조회 실패를 변이 실패로 보이게 하지 않는다. 이미 서버에는 반영된 뒤라 실패로 알리면
   * 사용자가 같은 조작을 다시 해 409 를 본다.
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
        /*
         * 코드 중복(409)만은 어느 칸의 잘못인지 서버 코드가 말해 준다 — 그 하나는 칸에 묶어
         * 준다. 나머지(권한·사용 중·없는 분류 …)는 특정 칸의 잘못이 아니라 조작 전체가
         * 거절된 것이라 칸 없이 문구만 남긴다.
         */
        if (aliveRef.current) {
          const message = toRoleClassificationErrorMessage(error);
          if (
            error instanceof ApiError &&
            error.code === ROLE_CLASSIFICATION_ERROR.ROLE_CLASSIFICATION_CODE_DUPLICATED
          ) {
            setMutationError({ field: "roleClsfCd", message });
          } else {
            setServerErrorMessage(message);
          }
        }
        /*
         * 없는 분류(404)이거나 다른 사람이 그 사이에 역할을 옮겨 IN_USE 가 됐다면 화면이 들고
         * 있는 목록이 이미 낡았다는 뜻이다 — 그 상태로 두면 사라진 행이나 틀린 숫자를 계속
         * 보게 되므로 조용히 다시 받는다. 재조회까지 실패하면 그냥 둔다(원래 문구가 낫다).
         */
        if (
          error instanceof ApiError &&
          (error.code === ROLE_CLASSIFICATION_ERROR.ROLE_CLASSIFICATION_NOT_FOUND ||
            error.code === ROLE_CLASSIFICATION_ERROR.ROLE_CLASSIFICATION_IN_USE)
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
    async (input: RoleClassificationCreateInput): Promise<boolean> => {
      const trimmed: RoleClassificationCreateInput = {
        // 코드는 대문자만 허용하므로 소문자로 친 것을 올려 준다 — 형식 오류의 대부분이 이것이다
        roleClsfCd: input.roleClsfCd.trim().toUpperCase(),
        roleClsfNm: input.roleClsfNm.trim(),
        indctSeqno: input.indctSeqno,
      };
      const invalid = validateCreate(trimmed);
      if (invalid) {
        setMutationError(invalid);
        setServerErrorMessage("");
        return false;
      }
      return run(() => createRoleClassification(trimmed));
    },
    [run],
  );

  /*
   * 이름과 표시 순번을 함께 보낸다.
   *
   * 예전에는 이름만 보냈다 — 순번을 옮기는 화면이 없어 숫자를 만들어 보낼 근거가 없었기
   * 때문이다. 그 결과 서버가 열어 둔 순번 변경에 웹에서 닿는 길이 아예 없었고, 특히
   * `SYSTEM` 분류는 이름이 잠긴 탓에 편집 진입까지 막혀 순번을 영영 못 바꿨다(ssccops#87
   * D-004). 이제 화면이 순번 칸을 그리므로 사용자가 친 값을 그대로 싣는다.
   *
   * 빈 칸은 여전히 "그대로 두라"이며 본문에 null 로 나간다 — 그 판단은 서버가 한다.
   *
   * `SYSTEM` 의 순번만 옮기는 요청에도 **현재 이름이 그대로 실려 온다.** 서버가 본문의
   * 이름을 @NotBlank 로 요구하고 같은 이름은 이름 변경으로 보지 않으므로 409 가 아니다.
   */
  const update = useCallback(
    async (roleClsfCd: string, input: RoleClassificationEditInput): Promise<boolean> => {
      const roleClsfNm = input.roleClsfNm.trim();
      const indctSeqno = input.indctSeqno.trim();
      const invalid = validateName(roleClsfNm) ?? validateDisplayOrder(indctSeqno);
      if (invalid) {
        setMutationError(invalid);
        setServerErrorMessage("");
        return false;
      }
      return run(() =>
        updateRoleClassification(roleClsfCd, {
          roleClsfNm,
          indctSeqno: indctSeqno ? Number(indctSeqno) : undefined,
        }),
      );
    },
    [run],
  );

  const remove = useCallback(
    (roleClsfCd: string): Promise<boolean> => run(() => deleteRoleClassification(roleClsfCd)),
    [run],
  );

  return {
    classifications: current?.classifications ?? [],
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
