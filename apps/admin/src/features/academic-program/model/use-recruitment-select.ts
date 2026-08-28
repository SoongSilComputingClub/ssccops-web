"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchRecruitmentApplications,
  RECRUITMENT_ERROR,
  selectRecruitmentApplicants,
  type RecruitmentApplication,
  type RecruitmentSelection,
  type RecruitmentTeamMember,
} from "@/entities/academic-program";
import { ApiError } from "@/shared/lib/api/client";
import { toRecruitmentErrorMessage } from "./recruitment-error";

/*
 * 선택한 활동의 신청자 조회·선발 훅 (#127 · 서버 #138).
 *
 * 좌측 활동 목록에서 활동을 고르면(academicProgramId 가 바뀌면) 이 훅이 그 활동의 신청자
 * 목록을 다시 받는다. 활동이 아직 ONGOING 이전이면 서버가 409 `RECRUITMENT_NOT_STARTED`
 * 로 끊는데, 그건 오류가 아니라 "모집 시작 전"이라는 별도 상태(`not-started`)로 나눈다 —
 * 재시도 버튼을 주는 대신 모집 시작 카드를 그려야 하기 때문이다(useAcademicProgramDetail 이
 * "없는 활동"을 별도 상태로 나눈 것과 같은 판단).
 *
 * ── 선발 뒤 신청자 목록을 다시 조회한다 ────────────────────
 * 선발 한 번이 신청자 상태(→ ACCEPTED)·팀원 명단·정원 소진을 함께 움직인다. 응답으로 받은
 * 팀원 목록은 곧바로 갈아 끼우되(서버가 다시 세어 준 값), 신청자 목록은 재조회로 맞춘다
 * (AGENTS.md "부분 갱신과 재조회를 가른다").
 */

export type RecruitmentApplicationsStatus =
  | "idle"
  | "loading"
  | "ready"
  | "not-started"
  | "error";

interface Loaded {
  /** `${academicProgramId}:${reloadKey}` */
  key: string;
  applications: RecruitmentApplication[];
  nextCursor: string | null;
  hasNext: boolean;
  totalCount: number;
  outcome: Exclude<RecruitmentApplicationsStatus, "idle" | "loading">;
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

export interface RecruitmentSelectState {
  applications: RecruitmentApplication[];
  status: RecruitmentApplicationsStatus;
  errorMessage: string;
  totalCount: number;
  hasNext: boolean;
  loadingMore: boolean;
  loadMore: () => Promise<string>;
  reload: () => void;

  /** 선발 확정 뒤 서버가 돌려준 팀원 명단 (선발 전에는 빈 배열) */
  teamMembers: RecruitmentTeamMember[];
  selecting: boolean;
  /** 성공하면 빈 문자열, 실패하면 사용자에게 보여줄 한 줄을 돌려준다 */
  select: (selections: RecruitmentSelection[]) => Promise<string>;
}

const PAGE_SIZE = 20;

export function useRecruitmentSelect(
  academicProgramId: number | null,
): RecruitmentSelectState {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selecting, setSelecting] = useState(false);

  /*
   * 선발 확정 뒤 서버가 돌려준 팀원 명단. 활동을 새로 고르면 이전 활동의 명단을 버려야 하는데,
   * 그것을 useEffect + setState 로 하면 cascading render 다 — "Adjusting state when a prop
   * changes"(React) 로 렌더 중에 조정한다. 마지막으로 명단을 담은 활동 번호를 함께 들고
   * 있다가 그것과 달라졌을 때만 비운다.
   */
  const [teamMembers, setTeamMembers] = useState<RecruitmentTeamMember[]>([]);
  const [teamMembersProgramId, setTeamMembersProgramId] = useState<
    number | null
  >(academicProgramId);
  if (teamMembersProgramId !== academicProgramId) {
    setTeamMembersProgramId(academicProgramId);
    setTeamMembers([]);
  }

  const loadedRef = useRef<Loaded | null>(null);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  const requestKey =
    academicProgramId != null ? `${academicProgramId}:${reloadKey}` : "";

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
    if (academicProgramId == null) return;

    let alive = true;

    fetchRecruitmentApplications(academicProgramId, { size: PAGE_SIZE })
      .then((page) => {
        if (!alive) return;
        setLoaded({
          key: requestKey,
          applications: page.applications,
          nextCursor: page.nextCursor,
          hasNext: page.hasNext,
          totalCount: page.totalCount,
          outcome: "ready",
          errorMessage: "",
        });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        const notStarted =
          error instanceof ApiError &&
          error.code === RECRUITMENT_ERROR.RECRUITMENT_NOT_STARTED;
        setLoaded({
          key: requestKey,
          applications: [],
          nextCursor: null,
          hasNext: false,
          totalCount: 0,
          outcome: notStarted ? "not-started" : "error",
          errorMessage: notStarted ? "" : toRecruitmentErrorMessage(error),
        });
      });

    return () => {
      alive = false;
    };
  }, [academicProgramId, requestKey]);

  const loadMore = useCallback(async (): Promise<string> => {
    const current = loadedRef.current;
    if (
      inFlightRef.current ||
      academicProgramId == null ||
      !current?.hasNext ||
      !current.nextCursor
    ) {
      return "";
    }

    inFlightRef.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchRecruitmentApplications(academicProgramId, {
        size: PAGE_SIZE,
        cursor: current.nextCursor,
      });
      if (!aliveRef.current) return "";

      setLoaded((prev) =>
        prev && prev.key === current.key
          ? {
              ...prev,
              applications: [...prev.applications, ...page.applications],
              nextCursor: page.nextCursor,
              hasNext: page.hasNext,
              totalCount: page.totalCount,
            }
          : prev,
      );
      return "";
    } catch (error: unknown) {
      return toRecruitmentErrorMessage(error);
    } finally {
      inFlightRef.current = false;
      if (aliveRef.current) setLoadingMore(false);
    }
  }, [academicProgramId]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const select = useCallback(
    async (selections: RecruitmentSelection[]): Promise<string> => {
      if (academicProgramId == null || selecting || selections.length === 0) {
        return "";
      }
      setSelecting(true);
      try {
        const members = await selectRecruitmentApplicants(
          academicProgramId,
          selections,
        );
        if (!aliveRef.current) return "";
        setTeamMembers(members);
        // 신청자 목록은 재조회로 맞춘다 — 선발된 응답이 ACCEPTED 로 바뀌어 있다
        setReloadKey((k) => k + 1);
        return "";
      } catch (error: unknown) {
        return toRecruitmentErrorMessage(error);
      } finally {
        if (aliveRef.current) setSelecting(false);
      }
    },
    [academicProgramId, selecting],
  );

  const current = loaded?.key === requestKey ? loaded : null;
  const status: RecruitmentApplicationsStatus =
    academicProgramId == null
      ? "idle"
      : (current?.outcome ?? "loading");

  return {
    applications: current?.applications ?? [],
    status,
    errorMessage: current?.errorMessage ?? "",
    totalCount: current?.totalCount ?? 0,
    hasNext: current?.hasNext ?? false,
    loadingMore,
    loadMore,
    reload,
    teamMembers,
    selecting,
    select,
  };
}
