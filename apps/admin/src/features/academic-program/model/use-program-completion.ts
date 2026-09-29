"use client";

import { useCallback, useRef, useState } from "react";
import {
  transitionAcademicProgram,
  type AcademicProgramTransition,
} from "@/entities/academic-program";
import { syncSessionOnForbidden } from "@/entities/session";
import { toProgramTransitionErrorMessage } from "./transition-error";

/*
 * 종료 승인·재시작 훅 (#715 · ADR-0057 · 서버 #133·#597 · POST /v1/academic-programs/{id}/transitions).
 *
 * `APPROVE_COMPLETION`(진행 중 → 종료)은 그 프로그램의 쓰기(회차 기록·승인 · 출석 정정 · 모집
 * 선발·일정·문항)를 멈추고 접수 중인 모집 폼을 같은 트랜잭션에서 마감한다. `REOPEN`(종료 → 진행
 * 중)이 그것을 되돌리되 모집 폼은 다시 열지 않는다 — 둘 다 서버가 하는 일이라 이 훅은 전이 하나만
 * 보낸다.
 *
 * 모양은 `useStartRecruitment`와 같다 — 전이만 책임지고, 실패는 한 줄로 돌려준다. 성공 뒤 화면
 * 갱신(상세 재조회)은 호출부가 한다. 전이 응답에는 상태만 있는데 화면은 배지·진행률·버튼을 함께
 * 그리기 때문이다(AGENTS.md «부분 갱신과 재조회를 가른다»).
 *
 * **진행률로 막지 않는다** — 서버 #133 설계 결정 4 «학술국장 재량». 화면이 막으면 규칙이 두 벌이
 * 된다. 승인 대기·수정요청 회차가 있어도 막지 않는다(재시작이 있다 · ADR-0057).
 *
 * 중복 클릭은 ref 로 끊는다 — 상태만 보면 같은 렌더 안의 두 번째 클릭이 옛 값(`false`)을 읽는다.
 */

/** 이 훅이 보내는 전이 — 모집 시작은 `useStartRecruitment`가 따로 쥔다(입력이 다르다) */
export type ProgramCompletionTransition = Extract<
  AcademicProgramTransition,
  "APPROVE_COMPLETION" | "REOPEN"
>;

export interface ProgramCompletion {
  running: boolean;
  /** 성공하면 빈 문자열, 실패하면 사용자에게 보여줄 한 줄을 돌려준다 */
  run: (transition: ProgramCompletionTransition) => Promise<string>;
}

export function useProgramCompletion(academicProgramId: number): ProgramCompletion {
  const [running, setRunning] = useState(false);
  const inFlightRef = useRef(false);

  const run = useCallback(
    async (transition: ProgramCompletionTransition): Promise<string> => {
      if (inFlightRef.current) return "";
      inFlightRef.current = true;
      setRunning(true);
      try {
        await transitionAcademicProgram(academicProgramId, { transition });
        return "";
      } catch (error: unknown) {
        // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
        syncSessionOnForbidden(error);
        return toProgramTransitionErrorMessage(error);
      } finally {
        inFlightRef.current = false;
        setRunning(false);
      }
    },
    [academicProgramId],
  );

  return { running, run };
}
