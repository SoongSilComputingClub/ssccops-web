"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  assignMemberRole,
  fetchMemberRoles,
  updateMemberRole,
  type MemberRoleAssignInput,
  type MemberRoleAssignment,
} from "@/entities/member";
import { fetchRoles, type RoleSummary } from "@/entities/role";
import { fetchAuthSession, syncSessionOnForbidden, useSessionStore } from "@/entities/session";
import { toMemberRoleErrorMessage } from "./member-error";

/*
 * 회원 역할 부여·종료 (#50 · 서버 #81).
 *
 * ── 요구 권한이 회원 상세와 다르다 ──────────────────────────────
 * 회원 상세는 `MEMBER_MANAGE`로 열리지만 이 훅이 부르는 세 경로는 **조회까지 `ROLE_MANAGE`**를
 * 요구한다(서버가 컨트롤러 클래스 전체에 걸었다 · VR-M12). 그래서 `enabled`를 받아 권한이
 * 없으면 **호출조차 하지 않는다** — 어차피 403이고, 회원 상세를 정상적으로 보는 사람이 이
 * 목록만 못 받는 조합이 버그가 아니라 설계다. 그때 무엇을 대신 그릴지는 화면이 정한다
 * (views/member-detail이 회원 상세 응답의 `roles`로 현재 역할만 보여 준다).
 *
 * ── 조작 뒤에는 목록을 다시 받는다 ──────────────────────────────
 * 등급·상태 변경(#48)이 응답으로 화면을 갈아 끼운 것과 갈린다. 그쪽은 응답이 조회와 같은
 * 회원 전체였지만, 여기 응답은 **방금 건드린 배정 한 건**뿐이다. 그런데 서버는 한 조작에서
 * 다른 행도 함께 움직인다 — 대표로 지정하면 기존 대표가 같은 트랜잭션에서 내려가고,
 * `current`는 행마다 서버가 다시 계산하는 파생 값이다. 응답 한 건만 끼워 넣으면 대표가 둘로
 * 보이는 목록이 만들어진다.
 *
 * ── 자기 자신에게 한 조작은 세션까지 다시 받는다 ────────────────
 * **서버는 재로그인을 요구하지 않는다**(BR-M31 · 인가 판정이 요청마다 `mbr_role_rel`을 본다).
 * 그런데 **웹의 `capabilities`는 세션 응답에 한 번 실려 온 값**이라, 자기에게 역할을
 * 부여·종료하고 세션을 다시 받지 않으면 서버는 이미 허용하는데 사이드바 메뉴만 옛 상태로
 * 남는다(반대로 방금 잃은 권한의 메뉴가 계속 보이기도 한다). 그 어긋남을 여기서 끊는다.
 */

export type MemberRolesStatus = "disabled" | "loading" | "ready" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedAssignments {
  key: string;
  assignments: MemberRoleAssignment[];
  errorMessage: string;
}

export interface MemberRoles {
  /**
   * 지금 유효한 배정 — 판정은 **서버의 `current`**다 (BR-M25).
   *
   * `roleEndYmd === null`로 거르지 않는다. 그 기준으로는 종료일이 미래로 채워진 배정(임기가
   * 정해진 국장)이 아직 유효한데도 지난 역할로 밀려나, 화면의 배지와 실제 인가가 갈린다.
   */
  current: MemberRoleAssignment[];
  /** 종료된 배정 — 지난 재임 이력이다. 종료는 삭제가 아니라 `roleEndYmd`가 채워지는 것이다 */
  ended: MemberRoleAssignment[];
  /** 전량 — 겹침 판정({@link overlapsAssignment})은 종료된 것까지 봐야 한다 */
  all: MemberRoleAssignment[];
  status: MemberRolesStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;

  /** 부여·종료 요청이 나가 있는가 — 버튼은 이 동안 잠긴다 */
  saving: boolean;
  /** 마지막 조작이 거절된 사유(서버 문장 포함). 비어 있으면 정상 */
  saveErrorMessage: string;
  clearSaveError: () => void;
  /** 성공하면 만들어진 배정, 실패하면 null (사유는 `saveErrorMessage`) */
  assign: (input: MemberRoleAssignInput) => Promise<MemberRoleAssignment | null>;
  /** 임기를 끝낸다 — 행을 지우지 않고 `roleEndYmd`를 채운다 */
  endAssignment: (
    mbrRoleId: number,
    roleEndYmd: string,
  ) => Promise<MemberRoleAssignment | null>;
  /** 대표 역할로 지정한다 — 사이드바 표시용이며 인가와 무관하다 (BR-M26) */
  setRepresentative: (mbrRoleId: number) => Promise<MemberRoleAssignment | null>;
}

export function useMemberRoles(
  memberId: number,
  options: { enabled: boolean },
): MemberRoles {
  const { enabled } = options;

  const [loaded, setLoaded] = useState<LoadedAssignments | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState("");

  const requestKey = `${memberId}|${reloadKey}`;

  /*
   * 조작 대상이 나 자신인가 — 세션을 다시 받아야 하는지가 여기 달려 있다. 세션의 회원 번호와
   * 견주며, 미로그인·미가입(member === null)이면 false다.
   */
  const isSelf = useSessionStore((s) => s.member?.memberId === memberId);

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  /* URL의 회원 번호는 사용자가 손으로 고칠 수 있다 — /v1/members/NaN/roles 가 나가지 않게 한다 */
  const isFetchable = enabled && Number.isInteger(memberId) && memberId > 0;

  useEffect(() => {
    if (!isFetchable) return;

    let alive = true;

    /* current 를 주지 않는다 — 종료된 배정까지 받아 화면이 지난 재임을 따로 보여 준다 */
    fetchMemberRoles(memberId)
      .then((assignments) => {
        if (alive) setLoaded({ key: requestKey, assignments, errorMessage: "" });
      })
      .catch((error: unknown) => {
        /* 화면이 열린 사이에 ROLE_MANAGE 가 회수됐을 수 있다 — 세션을 맞춰 스스로 잠기게 한다 */
        syncSessionOnForbidden(error);
        if (!alive) return;
        setLoaded({
          key: requestKey,
          assignments: [],
          errorMessage: toMemberRoleErrorMessage(error),
        });
      });

    return () => {
      alive = false;
    };
  }, [memberId, isFetchable, requestKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const clearSaveError = useCallback(() => setSaveErrorMessage(""), []);

  /**
   * 자기 자신에게 한 조작이면 세션을 다시 받아 사이드바가 바로 바뀌게 한다.
   *
   * 실패해도 조용히 넘어간다 — 조작 자체는 이미 성공했고, 사용자가 봐야 할 것은 "세션 재조회에
   * 실패했다"가 아니다(`syncSessionOnForbidden`과 같은 판단). 그때는 다음 새로고침에 맞춰진다.
   */
  const syncOwnSession = useCallback(async () => {
    if (!isSelf) return;
    try {
      useSessionStore.getState().setSession(await fetchAuthSession());
    } catch {
      /* 위 주석 */
    }
  }, [isSelf]);

  // 같은 틱에 두 번 눌린 버튼은 그 사이에 렌더가 없어 saving 이 아직 갱신되지 않는다
  const busyRef = useRef(false);

  /**
   * 세 조작(부여·종료·대표 지정)의 뒤처리가 같아 한 자리에 둔다 — 목록 재조회, 자기 세션
   * 재조회, 권한 회수 감지, 언마운트 뒤 setState 방지가 조작마다 갈릴 이유가 없다.
   */
  const run = useCallback(
    async (
      call: () => Promise<MemberRoleAssignment>,
    ): Promise<MemberRoleAssignment | null> => {
      if (busyRef.current) return null;

      busyRef.current = true;
      setSaving(true);
      setSaveErrorMessage("");

      try {
        const result = await call();

        /*
         * 목록을 다시 받는다(위 주석). 재조회가 실패해도 조작은 성공이므로 오류로 덮지 않고
         * 화면이 들고 있던 목록을 그대로 둔다 — 다음 reload 에 맞춰진다.
         */
        await fetchMemberRoles(memberId)
          .then((assignments) => {
            if (aliveRef.current) {
              setLoaded({ key: requestKey, assignments, errorMessage: "" });
            }
          })
          .catch(() => {});

        await syncOwnSession();
        return result;
      } catch (error: unknown) {
        /* 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 */
        syncSessionOnForbidden(error);
        if (aliveRef.current) setSaveErrorMessage(toMemberRoleErrorMessage(error));
        return null;
      } finally {
        busyRef.current = false;
        if (aliveRef.current) setSaving(false);
      }
    },
    [memberId, requestKey, syncOwnSession],
  );

  const assign = useCallback(
    (input: MemberRoleAssignInput) => run(() => assignMemberRole(memberId, input)),
    [memberId, run],
  );

  const endAssignment = useCallback(
    (mbrRoleId: number, roleEndYmd: string) =>
      /* 대표 여부는 건드리지 않는다 — 생략이 곧 "그대로 두라"다 (PATCH가 부분 수정이다) */
      run(() => updateMemberRole(memberId, mbrRoleId, { roleEndYmd })),
    [memberId, run],
  );

  const setRepresentative = useCallback(
    (mbrRoleId: number) =>
      /* 종료일을 함께 보내지 않는다 — 보내면 표시를 고치려던 조작이 임기를 건드린다 */
      run(() => updateMemberRole(memberId, mbrRoleId, { rprsRoleYn: true })),
    [memberId, run],
  );

  const currentLoaded = loaded?.key === requestKey ? loaded : null;
  const status: MemberRolesStatus = !enabled
    ? "disabled"
    : currentLoaded === null
      ? "loading"
      : currentLoaded.errorMessage
        ? "error"
        : "ready";

  const all = currentLoaded?.assignments ?? [];

  return {
    all,
    current: all.filter((a) => a.current),
    ended: all.filter((a) => !a.current),
    status,
    errorMessage: currentLoaded?.errorMessage ?? "",
    reload,
    saving,
    saveErrorMessage,
    clearSaveError,
    assign,
    endAssignment,
    setRepresentative,
  };
}

/* ── 부여할 역할 선택지 ────────────────────────────────────── */

export interface AssignableRoles {
  roles: RoleSummary[];
  loading: boolean;
  /** 비어 있으면 정상. 채워져 있으면 선택지를 못 받은 것이다 */
  errorMessage: string;
}

/**
 * 부여할 수 있는 역할 전량 (GET /v1/roles · #49 · 서버 #79).
 *
 * ── 왜 목 역할 스토어를 쓰지 않는가 ────────────────────────────
 * 그 배열은 이 브라우저가 들고 있는 시드 데이터일 뿐이라 **`roleId`가 서버의 같은 번호와 아무
 * 관계가 없었다.** 목록에 뜬 이름과 실제로 부여되는 역할이 갈리고, 운 좋게 번호가 비어 있으면
 * 404 `ROLE_NOT_FOUND`로 끝난다 — 담당자 후보 조회(#53)가 같은 이유로 서버 재조회가 됐다.
 * 시드와 스토어 자체는 #54에서 지웠다.
 *
 * ── 왜 features/role 의 `useRoleList`를 부르지 않는가 ────────────
 * features 가 features 를 가져오면 FSD 레이어가 깨진다(entities/session/api/session.ts가 같은
 * 자리에서 겪었다). 그쪽 훅은 분류 목록까지 함께 받는데 시트에는 분류 칩이 없어 필요하지도
 * 않으므로, 엔티티 API를 직접 부르는 이 짧은 훅을 여기 둔다.
 *
 * 역할 목록도 `ROLE_MANAGE`를 요구하므로 부여 시트를 열 수 있는 사람은 언제나 받을 수 있다 —
 * 두 API의 요구 권한이 같은 것이 이 화면이 성립하는 조건이다.
 */
export function useAssignableRoles(enabled: boolean): AssignableRoles {
  const [loaded, setLoaded] = useState<{
    roles: RoleSummary[];
    errorMessage: string;
  } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let alive = true;

    fetchRoles()
      .then((roles) => {
        if (alive) setLoaded({ roles, errorMessage: "" });
      })
      .catch((error: unknown) => {
        syncSessionOnForbidden(error);
        if (alive) setLoaded({ roles: [], errorMessage: toMemberRoleErrorMessage(error) });
      });

    return () => {
      alive = false;
    };
  }, [enabled]);

  return {
    roles: loaded?.roles ?? [],
    loading: enabled && loaded === null,
    errorMessage: loaded?.errorMessage ?? "",
  };
}
