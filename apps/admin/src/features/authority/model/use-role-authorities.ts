"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchAuthorityTree,
  fetchRoleAuthorities,
  findAuthority,
  previewGrants,
  replaceRoleAuthorities,
  type AuthorityNode,
  type GrantPreview,
  type RoleAuthorities,
} from "@/entities/authority";
import { CAPABILITY, syncSessionOnForbidden, useSessionStore } from "@/entities/session";
import { toRoleAuthorityErrorMessage } from "./authority-error";

/*
 * 역할별 권한 부여 화면(/members/roles/{roleId}/authorities)의 상태 (#32 · 서버 #65).
 *
 * ── 로딩을 setState 하지 않는다 ────────────────────────────────
 * features/form/model/use-form-list.ts 의 결정을 그대로 따른다. SWR·React Query 없이
 * `apiFetch` + `useEffect` 로 가고, 조회 결과에 그 결과를 만든 요청의 key 를 함께 담아 두어
 * loading 을 저장하지 않고 렌더 중에 파생시킨다 — 이펙트 본문에서 setState 를 부르지 않게 되고
 * (react-hooks/set-state-in-effect), 늦게 도착한 이전 요청의 응답이 최신 상태를 덮지 못한다.
 *
 * ── 초안(draft)도 같은 key 를 단다 ─────────────────────────────
 * 사용자가 체크한 상태를 조회 결과에서 **이펙트로 옮겨 심지 않는다.** 초안에 같은 key 를 달아
 * 두고 key 가 맞을 때만 초안을 쓰면, 재조회가 일어나는 순간 초안은 자동으로 "남의 것" 이 되어
 * 서버가 방금 준 값으로 되돌아간다. 초안 seeding 을 이펙트로 하면 그 자체가
 * set-state-in-effect 위반이고, 무엇보다 재조회 때 사용자의 편집이 조용히 살아남는다.
 *
 * ── 트리와 역할 권한을 함께 받는다 ──────────────────────────────
 * 체크박스를 그리려면 트리(모양)와 부여 상태(내용)가 둘 다 있어야 한다. 따로 받아 따로 상태에
 * 넣으면 "트리는 왔고 부여는 아직" 인 중간 렌더가 생겨, 그 한 프레임 동안 모든 체크가 꺼진
 * 트리가 보인다.
 */

export type RoleAuthoritiesStatus = "loading" | "ready" | "error";

/* 아직 트리가 없을 때 쓰는 빈 배열. 렌더마다 `[]`를 새로 만들면 아래 useMemo 가 매번 깨진다 */
const NO_NODES: AuthorityNode[] = [];

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedRoleAuthorities {
  key: string;
  tree: AuthorityNode[];
  role: RoleAuthorities | null;
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

/** 저장 전후 비교 — 이 목록이 그대로 PUT 본문의 차이다 */
export interface GrantDiff {
  authrtCd: string;
  authrtNm: string;
}

export interface RoleAuthoritiesEditor {
  status: RoleAuthoritiesStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;

  /** 서버가 준 이름 — 목 데이터의 역할_명이 아니라 실제 역할 이름이다 */
  roleNm: string;
  tree: AuthorityNode[];

  /** 사용자가 **직접** 체크한 코드. 그대로 PUT 본문이 된다 */
  directCodes: ReadonlySet<string>;
  /** 저장 전 미리 보기 — 표시에만 쓴다 (entities/authority/model/tree.ts) */
  preview: GrantPreview;
  /** 서버가 준 저장된 상태의 펼침 결과. "지금 실제로 열려 있는 권한" 의 유일한 근거 */
  savedEffective: ReadonlySet<string>;

  /** 상위에서 함께 부여되는 자손은 잠근다 — 호출해도 아무 일이 없다 */
  toggle: (authrtCd: string) => void;

  added: GrantDiff[];
  removed: GrantDiff[];
  dirty: boolean;
  /** 초안을 버리고 저장된 상태로 되돌린다 */
  reset: () => void;

  /**
   * 이 저장이 **자기 자신의 ROLE_MANAGE 를 회수하는 조작**인가.
   *
   * 서버도 409 로 막지만, 저장을 눌러 거절당하고 나서야 알게 되면 그 사이에 사용자는 자기가 뭘
   * 했는지 되짚어야 한다. 누를 수 있는 상태로 두되 무슨 일이 일어나는지 미리 알린다.
   */
  selfLockout: boolean;

  saving: boolean;
  /** 마지막 저장이 실패한 사유. 비어 있으면 정상 */
  saveErrorMessage: string;
  /** 성공하면 true — 화면은 이때만 성공 토스트를 띄운다 */
  save: () => Promise<boolean>;
}

export function useRoleAuthorities(roleId: number): RoleAuthoritiesEditor {
  const [loaded, setLoaded] = useState<LoadedRoleAuthorities | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [draft, setDraft] = useState<{ key: string; codes: readonly string[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState("");

  /* 세션 회원은 참조가 안정적이라 그대로 고른다 — 배열을 만들어 고르면 매 렌더 새 스냅샷이 된다 */
  const member = useSessionStore((s) => s.member);

  const requestKey = `${roleId}|${reloadKey}`;

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    Promise.all([fetchAuthorityTree(), fetchRoleAuthorities(roleId)])
      .then(([tree, role]) => {
        if (alive) setLoaded({ key: requestKey, tree, role, errorMessage: "" });
      })
      .catch((error: unknown) => {
        // 화면이 열린 사이에 권한이 회수됐을 수 있다 — 세션을 맞춰 화면이 스스로 잠기게 한다
        syncSessionOnForbidden(error);
        if (alive) {
          setLoaded({
            key: requestKey,
            tree: [],
            role: null,
            errorMessage: toRoleAuthorityErrorMessage(error),
          });
        }
      });

    return () => {
      alive = false;
    };
  }, [roleId, requestKey]);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: RoleAuthoritiesStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";

  const tree = current?.tree ?? NO_NODES;
  const role = current?.role ?? null;

  /** 저장된 직접 부여 — 초안이 없으면 이것이 그대로 체크 상태다 */
  const savedDirect = useMemo(
    () => (role ? role.grants.map((g) => g.authrtCd) : []),
    [role],
  );

  const directList = draft?.key === requestKey ? draft.codes : savedDirect;
  const directCodes = useMemo(() => new Set(directList), [directList]);
  const savedDirectCodes = useMemo(() => new Set(savedDirect), [savedDirect]);
  const savedEffective = useMemo(
    () => new Set(role?.effectiveAuthrtCds ?? []),
    [role],
  );

  const preview = useMemo(() => previewGrants(tree, directCodes), [tree, directCodes]);

  const inheritedFrom = preview.inheritedFrom;

  const toggle = useCallback(
    (authrtCd: string) => {
      /*
       * 상위에서 함께 부여되는 자손은 여기서도 막는다. 화면이 이미 체크박스를 잠그지만, 잠금이
       * 표시뿐이면 키보드·스크린리더 경로로 값이 바뀔 수 있고 그러면 "체크는 그대로인데 저장
       * 본문만 달라진" 상태가 된다 — 화면에 드러나지 않는 변경은 만들지 않는다.
       */
      if (inheritedFrom.has(authrtCd)) return;

      setDraft((prev) => {
        const base = prev?.key === requestKey ? prev.codes : savedDirect;
        const next = base.includes(authrtCd)
          ? base.filter((c) => c !== authrtCd)
          : [...base, authrtCd];
        return { key: requestKey, codes: next };
      });
      setSaveErrorMessage("");
    },
    [requestKey, savedDirect, inheritedFrom],
  );

  const reset = useCallback(() => {
    setDraft(null);
    setSaveErrorMessage("");
  }, []);

  const reload = useCallback(() => {
    setDraft(null);
    setSaveErrorMessage("");
    setReloadKey((k) => k + 1);
  }, []);

  /* ── 변경분 (저장 전후 비교) ─────────────────────────────────── */

  const nameOf = useCallback(
    (authrtCd: string): string =>
      findAuthority(tree, authrtCd)?.authrtNm ??
      role?.grants.find((g) => g.authrtCd === authrtCd)?.authrtNm ??
      authrtCd,
    [tree, role],
  );

  const added = useMemo(
    () =>
      [...directCodes]
        .filter((c) => !savedDirectCodes.has(c))
        .map((authrtCd) => ({ authrtCd, authrtNm: nameOf(authrtCd) })),
    [directCodes, savedDirectCodes, nameOf],
  );

  const removed = useMemo(
    () =>
      [...savedDirectCodes]
        .filter((c) => !directCodes.has(c))
        .map((authrtCd) => ({ authrtCd, authrtNm: nameOf(authrtCd) })),
    [directCodes, savedDirectCodes, nameOf],
  );

  const dirty = added.length > 0 || removed.length > 0;

  /*
   * 자기 잠금 판정 (서버 VR-M13 과 같은 조건을 화면에서 먼저 비춘다).
   *
   * 세 가지가 모두 맞아야 한다 — 내가 이 역할을 맡고 있고, 지금은 이 역할로 ROLE_MANAGE 가
   * 열려 있으며(서버가 준 저장된 펼침 결과가 근거다), 저장 뒤에는 열리지 않는다.
   * 다른 역할로도 ROLE_MANAGE 를 갖고 있으면 실제로는 잠기지 않지만, 그 판정은 여러 역할의
   * 부여를 합쳐야 하고 그건 서버 몫이다 — 여기서는 경고까지만 하고 차단은 서버가 한다.
   */
  const selfLockout =
    member !== null &&
    member.roles.some((r) => r.roleId === roleId) &&
    savedEffective.has(CAPABILITY.ROLE_MANAGE) &&
    !preview.effective.has(CAPABILITY.ROLE_MANAGE);

  /* ── 저장 (전체 교체) ────────────────────────────────────────── */

  // 같은 틱에 두 번 눌린 클릭은 그 사이에 렌더가 없어 상태 값이 아직 갱신되지 않는다
  const busyRef = useRef(false);
  const saveContextRef = useRef({ directList, requestKey });
  useEffect(() => {
    saveContextRef.current = { directList, requestKey };
  });

  const save = useCallback(async (): Promise<boolean> => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setSaving(true);
    setSaveErrorMessage("");

    const { directList: codes, requestKey: key } = saveContextRef.current;

    try {
      /*
       * 응답이 교체 뒤 상태 전부(grants + effectiveAuthrtCds)를 담고 있으므로 재조회하지
       * 않는다. 특히 effectiveAuthrtCds 는 서버가 방금 펼친 결과라 이보다 정확한 값을 웹이
       * 만들 방법이 없다. 트리는 이 조작으로 바뀌지 않으므로 들고 있던 것을 그대로 쓴다.
       */
      const next = await replaceRoleAuthorities(roleId, codes);
      if (aliveRef.current) {
        setLoaded((prev) =>
          prev?.key === key ? { ...prev, role: next, errorMessage: "" } : prev,
        );
        // 저장된 상태가 곧 체크 상태다 — 초안을 지워 서버가 준 값으로 되돌린다
        setDraft(null);
      }
      return true;
    } catch (error: unknown) {
      // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
      syncSessionOnForbidden(error);
      if (aliveRef.current) setSaveErrorMessage(toRoleAuthorityErrorMessage(error));
      return false;
    } finally {
      busyRef.current = false;
      if (aliveRef.current) setSaving(false);
    }
  }, [roleId]);

  return {
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
    roleNm: role?.roleNm ?? "",
    tree,
    directCodes,
    preview,
    savedEffective,
    toggle,
    added,
    removed,
    dirty,
    reset,
    selfLockout,
    saving,
    saveErrorMessage,
    save,
  };
}
