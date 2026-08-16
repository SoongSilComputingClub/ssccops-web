"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchSubWorks,
  type SubWorkListFilter,
  type SubWorkListItem,
} from "@/entities/sub-work";
import { dueWithinDays } from "@/shared/lib/date";
import { toSubWorkErrorMessage } from "./sub-work-error";

/*
 * 하위 업무 목록 조회 훅 (OPS-008 · ssccops-web#41).
 *
 * 페칭 방식(SWR·React Query를 넣지 않는 이유)과 "결과에 요청 식별자를 실어 로딩을
 * 파생시키는" 구조의 근거는 features/form/model/use-form-list.ts 주석 참고. 커서 페이징을
 * 화면까지 올리는 이유는 features/work/model/use-work-list.ts와 같다.
 *
 * 업무 목록과 다른 점은 **필터 칩**이다. 칩이 바뀌면 처음부터 다시 받는다 — 커서는 직전
 * 필터로 만들어진 값이라 필터가 바뀐 채로 이어 받으면(loadMore) 서로 다른 조건의 페이지가
 * 한 목록에 섞인다. 그래서 칩(tab)을 요청 키에 포함해, 탭이 바뀌는 순간 이전 페이지를
 * 버리고 로딩 상태로 되돌린다.
 */

/** 화면의 필터 칩 6종. 순서가 화면 노출 순서다 */
export const SUB_WORK_LIST_TABS = [
  "전체",
  "진행",
  "승인대기",
  "마감임박",
  "지연",
  "완료",
] as const;

export type SubWorkListTab = (typeof SUB_WORK_LIST_TABS)[number];

/**
 * 마감임박의 임계값(N일)은 목 데이터 시절 `deadlineFlag`가 쓰던 기준을 그대로 물려받는다.
 * dueWithinDays 주석 참고.
 */
const DUE_SOON_DAYS = 3;

/**
 * 칩 → 서버 필터 (#28 설계 결정 5·6·7).
 *
 * - 승인대기는 `approvalStatus`만으로는 부족하다 — 등록 즉시 PENDING으로 시작하는 유형이
 *   있어 `workStatus=REVIEW`를 함께 걸어야 승인함에 실제로 뜨는 건과 일치한다.
 * - 지연은 `isOverdue=true`로 서버가 조회 시점에 판정한다 — `dly_yn` 컬럼은 항상 false다.
 * - 마감임박의 기준일은 서버가 정하지 않으므로 여기서 계산해 `dueBefore`로 보낸다.
 */
function toFilter(tab: SubWorkListTab): SubWorkListFilter {
  switch (tab) {
    case "진행":
      return { workStatus: "IN_PROGRESS" };
    case "승인대기":
      return { workStatus: "REVIEW", approvalStatus: ["PENDING", "REAPPROVAL_REQUIRED"] };
    case "마감임박":
      return { dueBefore: dueWithinDays(DUE_SOON_DAYS) };
    case "지연":
      return { isOverdue: true };
    case "완료":
      return { workStatus: "DONE" };
    case "전체":
    default:
      return {};
  }
}

export type SubWorkListStatus = "loading" | "ready" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedSubWorkList {
  key: string;
  subWorks: SubWorkListItem[];
  nextCursor: string | null;
  hasNext: boolean;
  totalCount: number;
  overallCount: number;
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

export interface SubWorkList {
  subWorks: SubWorkListItem[];
  status: SubWorkListStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  /** 이 탭(필터) 기준 건수 */
  totalCount: number;
  /** 필터 없는 전체 건수 */
  overallCount: number;
  hasNext: boolean;
  /** 다음 페이지를 받아 오는 중 — '더 보기' 연타를 막는다 */
  loadingMore: boolean;
  /** 실패하면 사용자에게 보여줄 한 줄을 돌려준다 (성공·중복 호출이면 빈 문자열) */
  loadMore: () => Promise<string>;
  reload: () => void;
}

export function useSubWorkList(tab: SubWorkListTab): SubWorkList {
  const [loaded, setLoaded] = useState<LoadedSubWorkList | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  /* 이어 받기는 "지금 화면에 있는 마지막 커서"가 필요한데, 그 값을 의존성에 넣으면
     페이지를 받을 때마다 loadMore가 새로 만들어진다. 렌더와 무관한 읽기라 ref로 둔다. */
  const loadedRef = useRef<LoadedSubWorkList | null>(null);
  const aliveRef = useRef(true);
  const inFlightRef = useRef(false);

  const requestKey = `${tab}:${reloadKey}`;

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

    fetchSubWorks(toFilter(tab))
      .then((page) => {
        if (!alive) return;
        setLoaded({
          key: requestKey,
          subWorks: page.subWorks,
          nextCursor: page.nextCursor,
          hasNext: page.hasNext,
          totalCount: page.totalCount,
          overallCount: page.overallCount,
          errorMessage: "",
        });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setLoaded({
          key: requestKey,
          subWorks: [],
          nextCursor: null,
          hasNext: false,
          totalCount: 0,
          overallCount: 0,
          errorMessage: toSubWorkErrorMessage(error),
        });
      });

    return () => {
      alive = false;
    };
  }, [requestKey, tab]);

  const loadMore = useCallback(async (): Promise<string> => {
    const current = loadedRef.current;
    if (inFlightRef.current || !current?.hasNext || !current.nextCursor) return "";

    inFlightRef.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchSubWorks({ ...toFilter(tab), cursor: current.nextCursor });
      if (!aliveRef.current) return "";

      /*
       * 이어 받는 사이에 재시도(reload)나 탭 전환이 돌았을 수 있다. 그때는 key가 달라지므로
       * 옛 커서로 받은 페이지를 새 목록에 덧붙이지 않고 버린다.
       */
      setLoaded((prev) =>
        prev && prev.key === current.key
          ? {
              ...prev,
              subWorks: [...prev.subWorks, ...page.subWorks],
              nextCursor: page.nextCursor,
              hasNext: page.hasNext,
              totalCount: page.totalCount,
              overallCount: page.overallCount,
            }
          : prev,
      );
      return "";
    } catch (error: unknown) {
      return toSubWorkErrorMessage(error);
    } finally {
      inFlightRef.current = false;
      if (aliveRef.current) setLoadingMore(false);
    }
  }, [tab]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // 이번 요청의 결과가 아직 없으면(최초 진입이든 탭 전환·재시도 직후든) 로딩이다
  const current = loaded?.key === requestKey ? loaded : null;
  const status: SubWorkListStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";

  return {
    subWorks: current?.subWorks ?? [],
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
