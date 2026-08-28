"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchAcademicPrograms,
  type AcademicProgramListFilter,
  type AcademicProgramSummary,
} from "@/entities/academic-program";
import { toAcademicProgramErrorMessage } from "./academic-program-error";

/*
 * 학술 활동 목록 조회 훅 (#125 · GET /v1/academic-programs).
 *
 * 페칭 방식(SWR·React Query를 넣지 않는 이유)과 "결과에 요청 식별자를 실어 로딩을
 * 파생시키는" 구조의 근거는 features/work/model/use-work-list.ts와 같다. 커서 페이징도
 * 같은 모양이라 그 훅을 거의 그대로 옮겼다 — 다른 점은 필터(유형·상태·검색어)가 붙는
 * 것 하나다.
 *
 * ── 필터가 바뀌면 목록을 처음부터 다시 받는다 ─────────────────
 * 커서는 특정 필터 결과 위의 위치라, 유형을 바꾸고 옛 커서로 이어 받으면 서버가 400
 * (VALIDATION_FAILED)으로 끊거나 엉뚱한 페이지가 붙는다. 필터를 requestKey에 넣어
 * 바뀔 때마다 첫 페이지부터 다시 조회한다.
 *
 * ── 이어 받은 페이지는 덧붙인다 ───────────────────────────────
 * 페이지 번호가 없어 되돌아갈 방법이 없고, 카드 그리드는 스크롤로 훑는 화면이라 이전
 * 페이지를 지우면 방금 본 활동이 없어진다.
 */

export type AcademicProgramListStatus = "loading" | "ready" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedList {
  key: string;
  programs: AcademicProgramSummary[];
  nextCursor: string | null;
  hasNext: boolean;
  /** 서버가 센 전체 건수 — 지금 받아 둔 programs.length와 다를 수 있다 */
  totalCount: number;
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

export interface AcademicProgramList {
  programs: AcademicProgramSummary[];
  status: AcademicProgramListStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  totalCount: number;
  hasNext: boolean;
  /** 다음 페이지를 받아 오는 중 — '더 보기' 연타를 막는다 */
  loadingMore: boolean;
  /** 실패하면 사용자에게 보여줄 한 줄을 돌려준다 (성공·중복 호출이면 빈 문자열) */
  loadMore: () => Promise<string>;
  reload: () => void;
}

/** 필터의 조회에 영향을 주는 축만 뽑아 안정된 문자열 key로 만든다 */
function filterKey(filter: AcademicProgramListFilter): string {
  return [
    filter.typeCd ?? "",
    filter.sttsCd ?? "",
    filter.keyword ?? "",
    filter.mine ? "1" : "",
    filter.sort ?? "",
  ].join("|");
}

export function useAcademicProgramList(
  filter: AcademicProgramListFilter = {},
): AcademicProgramList {
  const [loaded, setLoaded] = useState<LoadedList | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadedRef = useRef<LoadedList | null>(null);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  const fkey = filterKey(filter);
  const requestKey = `${fkey}|${reloadKey}`;

  /*
   * 이어 받기 콜백은 "지금 화면의 필터"가 필요한데, 필터를 의존성에 넣으면 렌더마다
   * loadMore가 새로 만들어진다. 렌더와 무관한 읽기라 ref로 둔다.
   */
  const filterRef = useRef(filter);
  useEffect(() => {
    filterRef.current = filter;
  });

  useEffect(() => {
    loadedRef.current = loaded;
  }, [loaded]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    fetchAcademicPrograms(filterRef.current)
      .then((page) => {
        if (!alive) return;
        setLoaded({
          key: requestKey,
          programs: page.academicPrograms,
          nextCursor: page.nextCursor,
          hasNext: page.hasNext,
          totalCount: page.totalCount,
          errorMessage: "",
        });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setLoaded({
          key: requestKey,
          programs: [],
          nextCursor: null,
          hasNext: false,
          totalCount: 0,
          errorMessage: toAcademicProgramErrorMessage(error),
        });
      });

    return () => {
      alive = false;
    };
  }, [requestKey]);

  const loadMore = useCallback(async (): Promise<string> => {
    const current = loadedRef.current;
    if (inFlightRef.current || !current?.hasNext || !current.nextCursor) return "";

    inFlightRef.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchAcademicPrograms({
        ...filterRef.current,
        cursor: current.nextCursor,
      });
      if (!aliveRef.current) return "";

      /*
       * 이어 받는 사이에 재시도(reload)나 필터 변경이 있었으면 key가 달라진다 — 옛
       * 커서로 받은 페이지를 새 목록에 덧붙이지 않고 버린다.
       */
      setLoaded((prev) =>
        prev && prev.key === current.key
          ? {
              ...prev,
              programs: [...prev.programs, ...page.academicPrograms],
              nextCursor: page.nextCursor,
              hasNext: page.hasNext,
              totalCount: page.totalCount,
            }
          : prev,
      );
      return "";
    } catch (error: unknown) {
      return toAcademicProgramErrorMessage(error);
    } finally {
      inFlightRef.current = false;
      if (aliveRef.current) setLoadingMore(false);
    }
  }, []);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: AcademicProgramListStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";

  return {
    programs: current?.programs ?? [],
    status,
    errorMessage: current?.errorMessage ?? "",
    totalCount: current?.totalCount ?? 0,
    hasNext: current?.hasNext ?? false,
    loadingMore,
    loadMore,
    reload,
  };
}
