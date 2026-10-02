"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PtcpSttsCd } from "@/entities/academic-program";
// 배럴은 서버 전용 조회를 품는다 — 브라우저 모듈은 직접 가져온다
import {
  addAcademicProgramMember,
  changeAcademicProgramMemberStatus,
} from "@/entities/academic-program/api/members-write";
import { toTeamMemberChangeErrorMessage } from "./team-members-error";

/*
 * 팀원 추가·상태 변경 훅 (#742 · server#612).
 *
 * ── 명단은 다시 그린다 ───────────────────────────────────────
 * 명단은 서버 컴포넌트가 그린다(이 앱의 조회 규약). 성공하면 응답 한 줄을 화면에 끼워 넣지 않고
 * `router.refresh()`로 서버 렌더를 다시 받는다 — 추가가 새 줄일 수도(등록) 제외 절에 있던 줄의
 * 부활일 수도(재합류) 있어 어느 줄이 어디로 옮겨 가는지 화면이 알 수 없고, 로더 하나가 명단과
 * `isEditable`을 함께 답하는 편이 맞다(어드민 «부분 갱신과 재조회를 가른다»의 재조회 쪽).
 * 새로고침이 끝날 때까지 `busy`가 켜져 있어 옛 명단을 보고 한 번 더 누르지 않는다.
 *
 * `version`은 명단을 바꿀 때마다 오른다 — 펼쳐 둔 이력 절이 그 값을 보고 다시 읽는다(이력은
 * 서버 렌더가 아니라 브라우저가 펼칠 때 부르는 조회다).
 *
 * 중복 클릭은 ref로 끊는다 — 상태만 보면 같은 렌더 안의 두 번째 클릭이 옛 값을 읽는다. 끊긴
 * 호출은 `ignored`로 돌려준다(#748 · ssccops#558). 성공과 같은 빈 문자열로 돌려주던 동안 호출부가
 * 그것을 성공으로 읽어 «넣었습니다»를 띄우고 시트를 닫았다 — 앞선 요청이 실패해도 그랬다.
 */

export type TeamMemberChange =
  | { kind: "add"; memberId: number }
  | { kind: "status"; eventPtcpId: number; next: PtcpSttsCd };

/** 한 번 누른 결과 — 끊긴 호출(`ignored`)은 아무것도 하지 않았으니 호출부도 아무 말을 하지 않는다 */
export type TeamMemberRunResult =
  | { outcome: "done" }
  | { outcome: "failed"; message: string }
  | { outcome: "ignored" };

export interface TeamMemberActions {
  /** 요청 중이거나 명단을 다시 그리는 중 */
  busy: boolean;
  /** 명단을 바꾼 횟수 — 이력 절이 다시 읽는 신호 */
  version: number;
  run: (change: TeamMemberChange) => Promise<TeamMemberRunResult>;
}

export function useTeamMemberActions(academicProgramId: number): TeamMemberActions {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [version, setVersion] = useState(0);
  const inFlightRef = useRef(false);

  const run = useCallback(
    async (change: TeamMemberChange): Promise<TeamMemberRunResult> => {
      if (inFlightRef.current) return { outcome: "ignored" };
      inFlightRef.current = true;
      setRunning(true);
      try {
        if (change.kind === "add") {
          await addAcademicProgramMember(academicProgramId, change.memberId);
        } else {
          await changeAcademicProgramMemberStatus(
            academicProgramId,
            change.eventPtcpId,
            change.next,
          );
        }
        setVersion((v) => v + 1);
        startTransition(() => router.refresh());
        return { outcome: "done" };
      } catch (error: unknown) {
        return { outcome: "failed", message: toTeamMemberChangeErrorMessage(error) };
      } finally {
        inFlightRef.current = false;
        setRunning(false);
      }
    },
    [academicProgramId, router],
  );

  return { busy: running || refreshing, version, run };
}
