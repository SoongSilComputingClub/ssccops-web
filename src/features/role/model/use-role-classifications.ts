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
  clearMutationError: () => void;

  /** 성공하면 true — 화면은 이때만 입력란을 비우고 토스트를 띄운다 */
  create: (input: RoleClassificationCreateInput) => Promise<boolean>;
  rename: (roleClsfCd: string, roleClsfNm: string) => Promise<boolean>;
  remove: (roleClsfCd: string) => Promise<boolean>;
}

/**
 * 서버 400 을 기다리지 않고 입력란 옆에서 먼저 걸러 준다.
 *
 * **최종 판정은 서버다.** 여기를 통과해도 코드 중복(409)처럼 화면 혼자서는 알 수 없는 실패가
 * 남아 있고, 그때는 호출부의 catch 가 서버 코드로 다시 문구를 정한다.
 */
function validateCreate(input: RoleClassificationCreateInput): string {
  if (!input.roleClsfCd) return "분류 코드를 입력하세요";
  if (!ROLE_CLSF_CD_PATTERN.test(input.roleClsfCd)) {
    return "분류 코드는 대문자로 시작하고 대문자·숫자·밑줄만 2~20자로 쓸 수 있습니다 (예: PROJECT, TF)";
  }
  return validateName(input.roleClsfNm);
}

function validateName(roleClsfNm: string): string {
  if (!roleClsfNm) return "분류명을 입력하세요";
  if (roleClsfNm.length > ROLE_CLSF_NM_MAX_LENGTH) {
    return `분류명은 ${ROLE_CLSF_NM_MAX_LENGTH}자를 넘을 수 없습니다`;
  }
  return "";
}

export function useRoleClassifications(): RoleClassificationAdmin {
  const [loaded, setLoaded] = useState<LoadedClassifications | null>(null);
  const [requestKey, setRequestKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [mutationErrorMessage, setMutationErrorMessage] = useState("");

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
  const clearMutationError = useCallback(() => setMutationErrorMessage(""), []);

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
      setMutationErrorMessage("");

      try {
        await action();
        await refresh().catch(() => {});
        return true;
      } catch (error: unknown) {
        // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
        syncSessionOnForbidden(error);
        if (aliveRef.current) {
          setMutationErrorMessage(toRoleClassificationErrorMessage(error));
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
        setMutationErrorMessage(invalid);
        return false;
      }
      return run(() => createRoleClassification(trimmed));
    },
    [run],
  );

  /*
   * 이름만 바꾼다. indctSeqno 를 보내지 않으면 서버가 현재 값을 유지한다 — 순번을 옮기는
   * 화면이 없으므로 여기서 숫자를 만들어 보내면 그 값이 어디서 왔는지 아무도 모르게 된다.
   */
  const rename = useCallback(
    async (roleClsfCd: string, roleClsfNm: string): Promise<boolean> => {
      const trimmed = roleClsfNm.trim();
      const invalid = validateName(trimmed);
      if (invalid) {
        setMutationErrorMessage(invalid);
        return false;
      }
      return run(() => updateRoleClassification(roleClsfCd, { roleClsfNm: trimmed }));
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
    mutationErrorMessage,
    clearMutationError,
    create,
    rename,
    remove,
  };
}
