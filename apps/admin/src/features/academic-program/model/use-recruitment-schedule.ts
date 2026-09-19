"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchRecruitmentSchedule,
  updateRecruitmentSchedule,
  type RecruitmentSchedule,
  type RecruitmentScheduleInput,
} from "@/entities/academic-program";
import { toRecruitmentErrorMessage } from "./recruitment-error";

/*
 * 모집 일정 조회·변경 훅 (GET·PATCH .../recruitment/schedule).
 *
 * ── 왜 별도 경로인가 ────────────────────────────────────────
 * 모집 시작(`START_RECRUITMENT`)이 접수 기간을 처음 정하지만 그 전이는 `APPROVED` 에서만
 * 일어난다 — 이미 모집 중인 활동의 날짜를 고치려고 다시 부르면 409 다. 폼 편집 화면
 * (`/forms/{id}/edit`)의 입력란은 #194 가 없앴고("모집 관리에서 설정합니다"), 서버도 학술
 * 연결 폼의 접수 기간 변경을 400 `ACADEMIC_FORM_RECEIPT_PERIOD_LOCKED` 로 잠갔다. 그래서
 * 안내가 가리키는 그 자리(이 화면)에 고칠 길이 없는 채로 남아 있었다.
 *
 * ── 조회는 선택된 활동이 바뀔 때마다 ────────────────────────
 * 활동 상세(`useAcademicProgramDetail`)가 접수 기간을 싣지 않으므로 이 훅이 따로 부른다.
 * 서버 상세 응답에 두 필드를 더하는 방법도 있었지만, 그러면 모집과 무관한 화면(대시보드·
 * 활동 상세)까지 그 값을 받게 되고 "지금 접수 상태가 무엇인가"의 판정 자리가 늘어난다.
 *
 * **모집 시작 전에도 200 이다**(두 일시가 null). 그래서 이 훅은 활동 상태로 조회를 막지
 * 않는다 — 다만 변경은 서버가 409 `RECRUITMENT_NOT_STARTED` 로 끊고, 화면도 모집 시작 카드
 * 쪽에서는 이 카드를 그리지 않는다.
 *
 * ── 저장 뒤에는 응답으로 갈아 끼운다 ────────────────────────
 * 응답이 **다시 파생한 접수 상태**를 함께 주므로 그것만 갈아 끼우면 된다(AGENTS.md "부분
 * 갱신과 재조회를 가른다" — 서버가 다시 세어 준 값이다). 다만 활동 상세의
 * `formReceiptStatus` 배지도 같은 사실을 그리므로, 그쪽 재조회는 호출부가 한다.
 */

export type RecruitmentScheduleStatus = "loading" | "ready" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 (use-form-list.ts 의 파생 로딩 패턴과 같다) */
interface Loaded {
  key: string;
  outcome: Exclude<RecruitmentScheduleStatus, "loading">;
  errorMessage: string;
  schedule: RecruitmentSchedule | null;
}

export interface RecruitmentScheduleState {
  status: RecruitmentScheduleStatus;
  errorMessage: string;
  schedule: RecruitmentSchedule | null;
  saving: boolean;
  /** 성공하면 빈 문자열, 실패하면 화면에 띄울 한 줄 */
  save: (input: RecruitmentScheduleInput) => Promise<string>;
  reload: () => void;
}

export function useRecruitmentSchedule(
  academicProgramId: number | null,
): RecruitmentScheduleState {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);

  /*
   * 활동을 새로 고르면 이전 활동의 일정을 버려야 한다. 그것을 `useEffect` + `setState` 로
   * 하면 cascading render 라 린트가 막는다(`react-hooks/set-state-in-effect`) — "Adjusting
   * state when a prop changes"(React)로 **렌더 중에** 조정한다. 마지막으로 값을 담은 활동
   * 번호를 함께 들고 있다가 그것과 달라졌을 때만 비운다(`useRecruitmentSelect` 의
   * `teamMembers` 가 같은 방식이다).
   */
  const [loadedProgramId, setLoadedProgramId] = useState<number | null>(
    academicProgramId,
  );
  if (loadedProgramId !== academicProgramId) {
    setLoadedProgramId(academicProgramId);
    setLoaded(null);
  }

  const requestKey =
    academicProgramId != null ? `${academicProgramId}:${reloadKey}` : "";

  useEffect(() => {
    if (academicProgramId == null) return;

    let alive = true;

    fetchRecruitmentSchedule(academicProgramId)
      .then((schedule) => {
        if (!alive) return;
        setLoaded({ key: requestKey, outcome: "ready", errorMessage: "", schedule });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setLoaded({
          key: requestKey,
          outcome: "error",
          errorMessage: toRecruitmentErrorMessage(error),
          schedule: null,
        });
      });

    /* 활동을 바꿔 가며 클릭하면 앞선 응답이 뒤에 도착할 수 있다 — 늦게 온 것을 버린다 */
    return () => {
      alive = false;
    };
  }, [academicProgramId, requestKey]);

  const save = useCallback(
    async (input: RecruitmentScheduleInput): Promise<string> => {
      if (academicProgramId == null || saving) return "";
      setSaving(true);
      try {
        const schedule = await updateRecruitmentSchedule(academicProgramId, input);
        /*
         * 응답이 **다시 파생한 접수 상태**까지 주므로 재조회 없이 갈아 끼운다(AGENTS.md
         * "부분 갱신과 재조회를 가른다" — 서버가 다시 세어 준 값이다). 키를 그대로 두는 것은
         * 이 저장이 새 조회가 아니기 때문이며, 그 사이 활동이 바뀌었으면 위의 렌더 중 조정이
         * 이미 비웠다.
         */
        setLoaded({
          key: `${academicProgramId}:${reloadKey}`,
          outcome: "ready",
          errorMessage: "",
          schedule,
        });
        return "";
      } catch (error: unknown) {
        return toRecruitmentErrorMessage(error);
      } finally {
        setSaving(false);
      }
    },
    [academicProgramId, reloadKey, saving],
  );

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const current = loaded?.key === requestKey ? loaded : null;

  return {
    status: current?.outcome ?? "loading",
    errorMessage: current?.errorMessage ?? "",
    schedule: current?.schedule ?? null,
    saving,
    save,
    reload,
  };
}
