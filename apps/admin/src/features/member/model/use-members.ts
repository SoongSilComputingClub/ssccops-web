"use client";

import { useCallback, useEffect, useState } from "react";
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
 * ── 검색어 디바운스는 화면이 한다 ──────────────────────────────
 * 조회 조건이 URL에 있으므로(views/member-list) 디바운스도 그 자리에 있다 — 훅이 한 번 더
 * 늦추면 URL은 이미 바뀌었는데 목록만 300ms 뒤에 따라오는 어긋남이 생긴다. 이 훅은 받은
 * 조건을 곧바로 조회한다.
 *
 * ── 페이지를 쌓지 않고 갈아 끼운다 ─────────────────────────────
 * 커서를 훅이 들고 있지 않다. 지금 볼 페이지의 커서를 화면이 넘겨주고 훅은 그 한 페이지만
 * 돌려준다 — 커서 스택이 URL에 있어야 상세에 갔다 돌아왔을 때 보던 페이지로 복귀한다.
 */

export type MemberListStatus = "loading" | "ready" | "error";

/** 화면이 정하는 조회 조건 — 커서까지 화면이 쥔다 */
export interface MemberListQuery {
  /** 이름·학번 부분일치 (디바운스를 마친 값) */
  q: string;
  mbrGrdCds: readonly MbrGrdCd[];
  mbrSttsCds: readonly MbrSttsCd[];
  sort: MemberSortParam;
  /** 지금 볼 페이지의 커서. 첫 페이지는 null */
  cursor: string | null;
}

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedMemberList {
  key: string;
  members: MemberSummary[];
  nextCursor: string | null;
  hasNext: boolean;
  size: number;
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
  /** 다음 페이지의 커서 — 마지막 페이지면 null */
  nextCursor: string | null;
  /** 서버가 적용한 페이지 크기 — 화면이 "21–40번째"를 셀 때 쓴다 */
  size: number;
  reload: () => void;
}

export function useMembers(query: MemberListQuery): MemberList {
  const { q, sort, cursor } = query;
  const gradeKey = query.mbrGrdCds.join(",");
  const statusKey = query.mbrSttsCds.join(",");

  const [loaded, setLoaded] = useState<LoadedMemberList | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  /*
   * 지금 화면이 보여야 할 조회의 식별자. 조건이 바뀌거나 페이지를 옮기거나 재시도를 누르면
   * 값이 달라지고, 그 순간부터 이전 결과는 자동으로 "남의 결과"가 된다.
   *
   * 커서가 열쇠에 들어 있는 것이 지난 판과 다른 점이다 — 커서만 바뀌는 이동(이전·다음)도
   * 새 조회이므로, 도착이 엇갈린 옛 페이지가 새 페이지를 덮어쓰지 않는다.
   */
  const requestKey = `${q}|${gradeKey}|${statusKey}|${sort}|${cursor ?? ""}|${reloadKey}`;

  useEffect(() => {
    let alive = true;

    // 열쇠로 쓰려고 이어 붙인 문자열을 여기서 다시 코드 배열로 되돌린다
    const filter: MemberListFilter = {
      q,
      mbrGrdCds: gradeKey ? (gradeKey.split(",") as MbrGrdCd[]) : [],
      mbrSttsCds: statusKey ? (statusKey.split(",") as MbrSttsCd[]) : [],
      sort,
      cursor,
    };

    fetchMembers(filter)
      .then((page) => {
        if (!alive) return;
        setLoaded({
          key: requestKey,
          members: page.members,
          nextCursor: page.nextCursor,
          hasNext: page.hasNext,
          size: page.size,
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
          members: [],
          nextCursor: null,
          hasNext: false,
          size: 0,
          totalCount: 0,
          overallCount: 0,
          errorMessage: toMemberErrorMessage(error),
        });
      });

    return () => {
      alive = false;
    };
  }, [q, gradeKey, statusKey, sort, cursor, requestKey]);

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
    nextCursor: current?.nextCursor ?? null,
    size: current?.size ?? 0,
    reload,
  };
}
