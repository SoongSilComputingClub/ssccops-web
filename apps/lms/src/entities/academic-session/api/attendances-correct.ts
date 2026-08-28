"use client";

import { apiFetchAuthedFromBrowser } from "@/shared/api/browser-client";
import type { AttendanceCorrection } from "../model/types";
import { toAttendanceRow, type AttendanceRowResponse } from "./response-mapping";

/*
 * 출석 정정 (#128 · ssccops-server#137 · PATCH .../sessions/{id}/attendances) — 브라우저 전용.
 *
 * **이미 제출한 회차의 출석만** 고치는 별도 경로다 — 회차 기록 작성 화면의 체크박스와 섞지 말
 * 것(이슈 「지킬 것」). `SessionStatus.allowsCorrection()`이 `APPROVED`만 잠그므로 제출·수정요청
 * 상태에서도 부를 수 있다.
 *
 * 정정 대상은 회원(`mbrId`)이 아니라 확정 팀원(`eventPtcpId`)이며, 그 회차 출석부에 **이미
 * 줄이 있는** 참가자만 받는다(줄이 없으면 400 `INVALID_ATTENDANCE_TARGET` — 명단을 바꾸는 것은
 * 재제출의 몫이다).
 *
 * 아직 이 함수를 부르는 화면이 없다 — 출석부 정정 화면(후속)이 쓴다.
 */

interface AttendancePatchResponse {
  attendances: AttendanceRowResponse[];
  presentCount: number;
  totalCount: number;
}

/**
 * PATCH .../sessions/{sessionId}/attendances — 출석만 정정.
 *
 * 갱신된 명단 전체와 다시 센 집계를 돌려준다(체크리스트 부분 갱신 관례) — 화면은 이 값을
 * 그대로 갈아 끼운다(집계를 웹에서 다시 세지 않는다).
 */
export async function correctSessionAttendances(
  academicProgramId: number,
  sessionId: number,
  attendances: { eventPtcpId: number; atndYn: boolean }[],
): Promise<AttendanceCorrection> {
  const res = await apiFetchAuthedFromBrowser<AttendancePatchResponse>(
    `/v1/academic-programs/${academicProgramId}/sessions/${sessionId}/attendances`,
    { method: "PATCH", body: JSON.stringify({ attendances }) },
  );
  return {
    attendances: (res.attendances ?? []).map(toAttendanceRow),
    presentCount: res.presentCount,
    totalCount: res.totalCount,
  };
}
