"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AUTHORITY_ERROR,
  AUTHRT_CD_MAX_LENGTH,
  AUTHRT_CD_PATTERN,
  AUTHRT_EXPLN_MAX_LENGTH,
  AUTHRT_NM_MAX_LENGTH,
  createAuthority,
  deleteAuthority,
  fetchAuthorityTree,
  updateAuthority,
  type AuthorityCreateInput,
  type AuthorityNode,
  type AuthorityUpdateInput,
} from "@/entities/authority";
import { syncSessionOnForbidden } from "@/entities/session";
import { ApiError } from "@/shared/lib/api/client";
import { toAuthorityErrorMessage } from "./authority-error";

/*
 * 권한 트리 관리 화면(/members/authorities)의 조회·생성·수정·삭제 (#32 · 서버 #65).
 *
 * 로딩을 setState 하지 않는 방식은 features/form/model/use-form-list.ts 의 결정을 그대로
 * 따른다 — 결과에 요청 key 를 달아 두고 렌더 중에 loading 을 파생시킨다.
 *
 * ── 변이 뒤에는 트리를 다시 받는다 ──────────────────────────────
 * 생성·수정·삭제가 성공해도 응답으로 트리를 고치지 않는다. 새 노드가 어느 부모 아래 어떤
 * 순서로 끼는지는 서버가 indctSeqno 로 정하는데, 웹이 그걸 흉내 내기 시작하면 화면의 트리와
 * 서버의 트리가 조용히 갈라진다.
 *
 * 단 이때 requestKey 는 **바꾸지 않는다.** 키를 올리면 트리 전체가 "불러오는 중" 으로 돌아가,
 * 이름 한 자 고칠 때마다 화면이 통째로 깜빡인다. 사용자가 직접 누르는 재시도(reload)만 로딩
 * 표시를 동반한다. (use-form-labels.ts 와 같은 판단)
 */

export type AuthorityTreeStatus = "loading" | "ready" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedAuthorityTree {
  key: number;
  tree: AuthorityNode[];
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

export interface AuthorityTreeAdmin {
  tree: AuthorityNode[];
  status: AuthorityTreeStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;

  /** 생성·수정·삭제 중 하나가 진행 중 */
  busy: boolean;
  /** 마지막 변이가 실패한 사유. 비어 있으면 정상 */
  mutationErrorMessage: string;
  clearMutationError: () => void;

  /** 성공하면 true — 화면은 이때만 입력란을 비우고 토스트를 띄운다 */
  create: (input: AuthorityCreateInput) => Promise<boolean>;
  update: (authrtCd: string, input: AuthorityUpdateInput) => Promise<boolean>;
  remove: (authrtCd: string) => Promise<boolean>;
}

/**
 * 서버 400 을 기다리지 않고 입력란 옆에서 먼저 걸러 준다.
 *
 * **최종 판정은 서버다.** 여기를 통과해도 중복 코드(409)처럼 화면 혼자서는 알 수 없는 실패가
 * 남아 있고, 그때는 호출부의 catch 가 서버 코드로 다시 문구를 정한다.
 */
function validateCreate(input: AuthorityCreateInput): string {
  if (!input.authrtCd) return "권한 코드를 입력하세요";
  if (input.authrtCd.length > AUTHRT_CD_MAX_LENGTH) {
    return `권한 코드는 ${AUTHRT_CD_MAX_LENGTH}자를 넘을 수 없습니다`;
  }
  if (!AUTHRT_CD_PATTERN.test(input.authrtCd)) {
    return "권한 코드는 대문자로 시작하고 대문자·숫자·밑줄만 쓸 수 있습니다 (예: STUDY_MANAGE)";
  }
  return validateNameAndExplanation(input.authrtNm, input.authrtExpln);
}

function validateNameAndExplanation(authrtNm: string, authrtExpln: string): string {
  if (!authrtNm) return "권한 이름을 입력하세요";
  if (authrtNm.length > AUTHRT_NM_MAX_LENGTH) {
    return `권한 이름은 ${AUTHRT_NM_MAX_LENGTH}자를 넘을 수 없습니다`;
  }
  if (authrtExpln.length > AUTHRT_EXPLN_MAX_LENGTH) {
    return `설명은 ${AUTHRT_EXPLN_MAX_LENGTH}자를 넘을 수 없습니다`;
  }
  return "";
}

export function useAuthorityTree(): AuthorityTreeAdmin {
  const [loaded, setLoaded] = useState<LoadedAuthorityTree | null>(null);
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

    fetchAuthorityTree()
      .then((tree) => {
        if (alive) setLoaded({ key: requestKey, tree, errorMessage: "" });
      })
      .catch((error: unknown) => {
        // 화면이 열린 사이에 권한이 회수됐을 수 있다 — 세션을 맞춰 메뉴가 스스로 닫히게 한다
        syncSessionOnForbidden(error);
        if (alive) {
          setLoaded({
            key: requestKey,
            tree: [],
            errorMessage: toAuthorityErrorMessage(error),
          });
        }
      });

    return () => {
      alive = false;
    };
  }, [requestKey]);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: AuthorityTreeStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";

  /* 변이 함수가 **실행되는 시점**에 읽을 최신 key. 콜백 자체는 한 번만 만들어 둔다 */
  const keyRef = useRef(requestKey);
  useEffect(() => {
    keyRef.current = requestKey;
  });

  /** 같은 키 위에 결과만 갈아 끼운다 (로딩 표시 없음) */
  const refresh = useCallback(async (): Promise<void> => {
    const key = keyRef.current;
    const tree = await fetchAuthorityTree();
    if (aliveRef.current) setLoaded({ key, tree, errorMessage: "" });
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
        if (aliveRef.current) setMutationErrorMessage(toAuthorityErrorMessage(error));
        /*
         * 없는 권한(404)이면 화면이 들고 있는 트리가 이미 낡았다는 뜻이다 — 그 상태로 두면
         * 사라진 노드를 계속 누르게 되므로 조용히 다시 받는다. 재조회까지 실패하면 그냥 둔다
         * (원래 오류 문구가 더 도움이 된다).
         */
        if (
          error instanceof ApiError &&
          error.code === AUTHORITY_ERROR.AUTHORITY_NOT_FOUND
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
    async (input: AuthorityCreateInput): Promise<boolean> => {
      const invalid = validateCreate(input);
      if (invalid) {
        setMutationErrorMessage(invalid);
        return false;
      }
      return run(() => createAuthority(input));
    },
    [run],
  );

  const update = useCallback(
    async (authrtCd: string, input: AuthorityUpdateInput): Promise<boolean> => {
      const invalid = validateNameAndExplanation(input.authrtNm, input.authrtExpln);
      if (invalid) {
        setMutationErrorMessage(invalid);
        return false;
      }
      return run(() => updateAuthority(authrtCd, input));
    },
    [run],
  );

  const remove = useCallback(
    (authrtCd: string): Promise<boolean> => run(() => deleteAuthority(authrtCd)),
    [run],
  );

  return {
    tree: current?.tree ?? [],
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
    busy,
    mutationErrorMessage,
    clearMutationError,
    create,
    update,
    remove,
  };
}
