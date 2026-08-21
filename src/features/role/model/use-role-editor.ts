"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ROLE_NM_MAX_LENGTH,
  createRole,
  fetchRole,
  fetchRoleClassifications,
  updateRole,
  type RoleClassification,
  type RoleDetail,
  type RoleMember,
  type RoleSummary,
  type RoleUpdateInput,
} from "@/entities/role";
import { syncSessionOnForbidden } from "@/entities/session";
import { toRoleErrorMessage } from "./role-error";

/*
 * 역할 추가·수정 화면(/members/roles/new · /members/roles/{roleId}/edit)의 조회·저장
 * (#49 · 서버 #79).
 *
 * 추가와 수정을 한 훅으로 다룬다 — 두 화면은 같은 입력란 두 개(역할명·분류)를 쓰고 저장
 * 메서드만 갈린다. 나누면 "무엇이 바뀌었는가" 판정이 두 벌이 된다.
 *
 * ── 역할 단건과 분류 목록을 함께 받는다 ─────────────────────────
 * 분류 칩을 그려야 저장할 수 있고, 새 역할의 기본 분류도 그 목록의 첫 항목이다. 따로 받으면
 * 분류가 늦게 도착하는 동안 기본값이 비어 있어 저장 버튼이 잠깐 눌리지 않는다.
 *
 * ── 이름 중복을 화면이 판정하지 않는다 ──────────────────────────
 * 예전에는 목 스토어의 목록을 훑어 같은 이름을 찾았다. 그 목록은 이 브라우저가 마지막으로
 * 받은 것이라 그 사이에 만들어진 역할을 알지 못하고, 무엇보다 서버가 어떤 기준으로 '같다' 고
 * 보는지(공백·대소문자)를 웹이 흉내 내야 했다. 판정은 서버의 409 ROLE_NAME_DUPLICATED 하나다.
 */

export type RoleEditorStatus = "loading" | "ready" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedRole {
  key: number;
  /** 새 역할이면 null */
  detail: RoleDetail | null;
  classifications: RoleClassification[];
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

/** 사용자가 고친 값 — 서버에서 받은 값과 비교해 '바뀐 것' 을 가린다 */
interface RoleDraft {
  roleNm: string;
  roleClsfCd: string;
}

export interface RoleEditor {
  /** 수정이면 true. 화면 제목·저장 문구가 갈린다 */
  editing: boolean;
  status: RoleEditorStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;

  roleNm: string;
  setRoleNm: (roleNm: string) => void;
  roleClsfCd: string;
  setRoleClsfCd: (roleClsfCd: string) => void;
  classifications: RoleClassification[];

  /** 서버가 준 재임 회원 (새 역할이면 빈 배열) */
  members: RoleMember[];
  /** 서버 집계 재임자 수. members 는 배정 행 단위라 둘이 갈릴 수 있다 */
  memberCount: number;

  /** 저장된 값과 다른 곳이 있는가 */
  dirty: boolean;
  saving: boolean;
  /** 마지막 저장이 실패한 사유. 비어 있으면 정상 */
  saveErrorMessage: string;
  /** 성공하면 저장된 역할 — 화면은 이때만 목록으로 돌아간다 */
  save: () => Promise<RoleSummary | null>;
}

/**
 * 서버 400 을 기다리지 않고 입력란 옆에서 먼저 걸러 준다.
 *
 * **최종 판정은 서버다.** 여기를 통과해도 이름 중복(409)처럼 화면 혼자서는 알 수 없는 실패가
 * 남아 있고, 그때는 save 의 catch 가 서버 코드로 다시 문구를 정한다.
 */
function validate(draft: RoleDraft): string {
  if (!draft.roleNm) return "역할명을 입력하세요";
  if (draft.roleNm.length > ROLE_NM_MAX_LENGTH) {
    return `역할명은 ${ROLE_NM_MAX_LENGTH}자를 넘을 수 없습니다`;
  }
  if (!draft.roleClsfCd) return "역할 분류를 고르세요";
  return "";
}

export function useRoleEditor(roleId?: number): RoleEditor {
  const [loaded, setLoaded] = useState<LoadedRole | null>(null);
  const [requestKey, setRequestKey] = useState(0);
  const [draft, setDraft] = useState<RoleDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState("");

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    Promise.all([
      roleId === undefined ? Promise.resolve(null) : fetchRole(roleId),
      fetchRoleClassifications(),
    ])
      .then(([detail, classifications]) => {
        if (!alive) return;
        setLoaded({ key: requestKey, detail, classifications, errorMessage: "" });
        /*
         * 초안은 서버 값이 도착한 뒤에 한 번만 채운다. 새 역할의 기본 분류를 목록의 첫
         * 항목으로 두는 것은 서버가 분류를 indctSeqno 순으로 내려주기 때문이다 — 운영진이
         * 맨 앞에 둔 분류가 가장 자주 쓰는 분류다.
         */
        setDraft({
          roleNm: detail?.roleNm ?? "",
          roleClsfCd: detail?.roleClsfCd ?? classifications[0]?.roleClsfCd ?? "",
        });
      })
      .catch((error: unknown) => {
        // 화면이 열린 사이에 권한이 회수됐을 수 있다 — 세션을 맞춰 화면이 스스로 닫히게 한다
        syncSessionOnForbidden(error);
        if (!alive) return;
        setLoaded({
          key: requestKey,
          detail: null,
          classifications: [],
          errorMessage: toRoleErrorMessage(error),
        });
      });

    return () => {
      alive = false;
    };
  }, [roleId, requestKey]);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: RoleEditorStatus =
    current === null || draft === null
      ? "loading"
      : current.errorMessage
        ? "error"
        : "ready";

  const detail = current?.detail ?? null;
  const roleNm = draft?.roleNm ?? "";
  const roleClsfCd = draft?.roleClsfCd ?? "";

  /*
   * 추가 화면에는 비교할 서버 값이 없다 — 이름을 한 자라도 넣으면 저장할 것이 생긴 것으로 본다.
   * 수정 화면은 두 칸 중 하나라도 서버 값과 다를 때만 dirty 다(공백만 다른 것은 아니다).
   */
  const dirty =
    detail === null
      ? roleNm.trim() !== ""
      : roleNm.trim() !== detail.roleNm || roleClsfCd !== detail.roleClsfCd;

  const setRoleNm = useCallback(
    (next: string) => setDraft((d) => (d === null ? d : { ...d, roleNm: next })),
    [],
  );
  const setRoleClsfCd = useCallback(
    (next: string) => setDraft((d) => (d === null ? d : { ...d, roleClsfCd: next })),
    [],
  );

  const reload = useCallback(() => {
    setDraft(null);
    setSaveErrorMessage("");
    setRequestKey((k) => k + 1);
  }, []);

  /* 저장이 **실행되는 시점**에 읽을 최신값. 콜백 자체는 의존성 없이 한 번만 만들어 둔다 */
  const contextRef = useRef({ detail, draft, dirty });
  useEffect(() => {
    contextRef.current = { detail, draft, dirty };
  });

  // 같은 틱에 두 번 눌린 저장은 그 사이에 렌더가 없어 상태 값이 아직 갱신되지 않는다
  const busyRef = useRef(false);

  const save = useCallback(async (): Promise<RoleSummary | null> => {
    const { detail: saved, draft: current, dirty: changed } = contextRef.current;
    if (current === null) return null;
    if (busyRef.current) return null;

    const trimmed: RoleDraft = {
      roleNm: current.roleNm.trim(),
      roleClsfCd: current.roleClsfCd,
    };

    const invalid = validate(trimmed);
    if (invalid) {
      setSaveErrorMessage(invalid);
      return null;
    }
    if (saved !== null && !changed) {
      setSaveErrorMessage("변경된 내용이 없습니다");
      return null;
    }

    busyRef.current = true;
    setSaving(true);
    setSaveErrorMessage("");

    try {
      if (saved === null) {
        /*
         * indctSeqno 를 보내지 않는다 — 서버가 같은 분류 안의 최대값 + 1 로 채운다. 화면에
         * 순번 입력란을 두지 않은 이유는 entities/role/api/roles.ts 의 RoleCreateInput 주석.
         */
        return await createRole({
          roleNm: trimmed.roleNm,
          roleClsfCd: trimmed.roleClsfCd,
        });
      }

      /*
       * 바뀐 필드만 싣는다(PATCH 가 실제로 부분 수정이다). 안 바뀐 값까지 보내면 그 사이에
       * 다른 사람이 고친 값을 되돌린다. 분류를 옮기면서 indctSeqno 를 생략하는 것은 의도한
       * 것이다 — 옛 분류의 순번은 새 분류 안에서 뜻이 없어 서버가 맨 뒤로 다시 매긴다.
       */
      const patch: RoleUpdateInput = {};
      if (trimmed.roleNm !== saved.roleNm) patch.roleNm = trimmed.roleNm;
      if (trimmed.roleClsfCd !== saved.roleClsfCd) patch.roleClsfCd = trimmed.roleClsfCd;
      return await updateRole(saved.roleId, patch);
    } catch (error: unknown) {
      // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
      syncSessionOnForbidden(error);
      if (aliveRef.current) setSaveErrorMessage(toRoleErrorMessage(error));
      return null;
    } finally {
      busyRef.current = false;
      if (aliveRef.current) setSaving(false);
    }
  }, []);

  return {
    editing: roleId !== undefined,
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
    roleNm,
    setRoleNm,
    roleClsfCd,
    setRoleClsfCd,
    classifications: current?.classifications ?? [],
    members: detail?.members ?? [],
    memberCount: detail?.memberCount ?? 0,
    dirty,
    saving,
    saveErrorMessage,
    save,
  };
}
