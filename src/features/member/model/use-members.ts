"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchMembers,
  type MemberListFilter,
  type MemberSortParam,
  type MemberSummary,
} from "@/entities/member";
import { syncSessionOnForbidden } from "@/entities/session";
import type { MbrGrdCd, MbrSttsCd } from "@/shared/config/codes";
import { toMemberErrorMessage } from "./member-error";

/*
 * 회원 목록 조회 훅 (서버 #76 · GET /v1/members).
 *
 * 페칭 방식(SWR·React Query를 넣지 않는 이유)과 "결과에 요청 식별자를 실어 로딩을
 * 파생시키는" 구조의 근거는 features/form/model/use-form-list.ts 주석 참고. 커서 페이징은
 * features/work/model/use-work-list.ts와 같은 모양이며, 여기에는 필터가 하나 더 붙는다.
 *
 * ── 거르는 일을 전부 서버에 맡긴다 ──────────────────────────────
 * 검색어·등급·상태·정렬이 모두 질의 파라미터로 나간다. 받아 온 페이지를 화면에서 다시 거르면
 * 목록이 나뉜 순간부터 현재 페이지 밖의 회원이 결과에서 통째로 빠지는데, 명부에서는 그것이
 * "없는 사람"과 구별되지 않는다(api/members.ts의 MemberListFilter 주석).
 *
 * ── 배열이 아니라 문자열을 의존성에 둔다 ────────────────────────
 * 호출부가 `mbrGrdCds={selected}`를 넘기면 렌더마다 새 배열일 수 있어, 배열 자체를 의존성에
 * 두는 순간 무한 재조회가 된다. 선택 코드를 이어 붙인 문자열을 열쇠로 쓰고 요청을 만들 때
 * 다시 쪼갠다 — 같은 선택이면 같은 문자열이므로 조회가 한 번만 나간다.
 *
 * ── 검색어는 디바운스한다 ──────────────────────────────────────
 * 목록의 다른 축은 클릭 한 번이 곧 새 조건이지만 검색어는 글자마다 조건이 바뀐다. 그대로
 * 흘리면 "홍길동"을 치는 동안 요청이 세 번 나가고, 그중 늦게 도착한 "홍"의 응답이 최신 목록을
 * 덮어쓸 자리까지 생긴다(요청 식별자가 그 덮어쓰기는 막지만 요청 자체는 이미 나간 뒤다).
 */

export type MemberListStatus = "loading" | "ready" | "error";

/** 검색어 입력이 멎었다고 보는 시간 — 한 글자 더 칠 만한 간격보다 약간 길게 */
const SEARCH_DEBOUNCE_MS = 300;

/** 화면이 정하는 조회 조건. 커서·size는 훅이 다룬다 */
export interface MemberListQuery {
  /** 이름·학번 부분일치 */
  q: string;
  mbrGrdCds: readonly MbrGrdCd[];
  mbrSttsCds: readonly MbrSttsCd[];
  sort: MemberSortParam;
}

/** 조회 결과 + 그 결과를 만든 요청의 식별자·조건 */
interface LoadedMemberList {
  key: string;
  /** 이 결과를 만든 조건 — 이어 받기가 같은 조건으로 다음 페이지를 부른다 */
  filter: MemberListFilter;
  members: MemberSummary[];
  nextCursor: string | null;
  hasNext: boolean;
  totalCount: number;
  overallCount: number;
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

export interface MemberList {
  members: MemberSummary[];
  status: MemberListStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  /** 필터를 적용한 건수 */
  totalCount: number;
  /** 필터 이전 전체 건수 */
  overallCount: number;
  hasNext: boolean;
  /** 다음 페이지를 받아 오는 중 — '더 보기' 연타를 막는다 */
  loadingMore: boolean;
  /** 실패하면 사용자에게 보여줄 한 줄을 돌려준다 (성공·중복 호출이면 빈 문자열) */
  loadMore: () => Promise<string>;
  reload: () => void;
}

export function useMembers(query: MemberListQuery): MemberList {
  const { q, sort } = query;
  const gradeKey = query.mbrGrdCds.join(",");
  const statusKey = query.mbrSttsCds.join(",");

  const [debouncedQ, setDebouncedQ] = useState(q);
  const [loaded, setLoaded] = useState<LoadedMemberList | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  /* 이어 받기는 "지금 화면에 있는 마지막 커서와 그 조건"이 필요한데, 그 값을 의존성에 넣으면
     페이지를 받을 때마다 loadMore가 새로 만들어진다. 렌더와 무관한 읽기라 ref로 둔다. */
  const loadedRef = useRef<LoadedMemberList | null>(null);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    loadedRef.current = loaded;
  }, [loaded]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  /* 첫 렌더의 초기값이 q 그대로라 화면 진입 조회는 디바운스를 기다리지 않는다 */
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [q]);

  /*
   * 지금 화면이 보여야 할 조회의 식별자. 조건이 바뀌거나 재시도를 누르면 값이 달라지고,
   * 그 순간부터 이전 결과는 자동으로 "남의 결과"가 된다.
   */
  const requestKey = `${debouncedQ}|${gradeKey}|${statusKey}|${sort}|${reloadKey}`;

  useEffect(() => {
    let alive = true;

    // 열쇠로 쓰려고 이어 붙인 문자열을 여기서 다시 코드 배열로 되돌린다
    const filter: MemberListFilter = {
      q: debouncedQ,
      mbrGrdCds: gradeKey ? (gradeKey.split(",") as MbrGrdCd[]) : [],
      mbrSttsCds: statusKey ? (statusKey.split(",") as MbrSttsCd[]) : [],
      sort,
    };

    fetchMembers(filter)
      .then((page) => {
        if (!alive) return;
        setLoaded({
          key: requestKey,
          filter,
          members: page.members,
          nextCursor: page.nextCursor,
          hasNext: page.hasNext,
          totalCount: page.totalCount,
          overallCount: page.overallCount,
          errorMessage: "",
        });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        /* 권한이 방금 회수됐을 수 있다 — 세션을 다시 받아 화면이 스스로 잠기게 한다 */
        syncSessionOnForbidden(error);
        setLoaded({
          key: requestKey,
          filter,
          members: [],
          nextCursor: null,
          hasNext: false,
          totalCount: 0,
          overallCount: 0,
          errorMessage: toMemberErrorMessage(error),
        });
      });

    return () => {
      alive = false;
    };
  }, [debouncedQ, gradeKey, statusKey, sort, requestKey]);

  const loadMore = useCallback(async (): Promise<string> => {
    const current = loadedRef.current;
    if (inFlightRef.current || !current?.hasNext || !current.nextCursor) return "";

    inFlightRef.current = true;
    setLoadingMore(true);
    try {
      /* 조건은 이 결과를 만든 것을 그대로 쓴다 — 커서는 그 조건 위에서만 뜻이 있다 */
      const page = await fetchMembers({ ...current.filter, cursor: current.nextCursor });
      if (!aliveRef.current) return "";

      /*
       * 이어 받는 사이에 필터가 바뀌거나 재시도가 돌았을 수 있다. 그때는 key가 달라지므로
       * 옛 커서로 받은 페이지를 새 목록에 덧붙이지 않고 버린다.
       */
      setLoaded((prev) =>
        prev && prev.key === current.key
          ? {
              ...prev,
              members: [...prev.members, ...page.members],
              nextCursor: page.nextCursor,
              hasNext: page.hasNext,
              totalCount: page.totalCount,
              overallCount: page.overallCount,
            }
          : prev,
      );
      return "";
    } catch (error: unknown) {
      syncSessionOnForbidden(error);
      return toMemberErrorMessage(error);
    } finally {
      inFlightRef.current = false;
      if (aliveRef.current) setLoadingMore(false);
    }
  }, []);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // 이번 요청의 결과가 아직 없으면(최초 진입이든 조건 변경 직후든) 로딩이다
  const current = loaded?.key === requestKey ? loaded : null;
  const status: MemberListStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";

  return {
    members: current?.members ?? [],
    status,
    errorMessage: current?.errorMessage ?? "",
    totalCount: current?.totalCount ?? 0,
    overallCount: current?.overallCount ?? 0,
    hasNext: current?.hasNext ?? false,
    loadingMore,
    loadMore,
    reload,
  };
}
