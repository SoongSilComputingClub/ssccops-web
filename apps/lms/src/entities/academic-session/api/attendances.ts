import { apiFetchAuthed } from "@/shared/api/authed-client";
import type { AcademicAttendanceRow } from "../model/types";
import { toAttendanceRow, type AttendanceRowResponse } from "./response-mapping";

/*
 * 출석 단독 조회 (#128 · ssccops-server#137 · GET .../sessions/{id}/attendances) — 서버 전용.
 *
 * ── 회차 기록 작성 화면은 이 파일을 쓰지 않는다 ──────────────
 * 작성 화면의 출석 체크박스는 회차 기록 제출(#135)에 배열로 동봉된다
 * (`sessions-write.ts`의 `SessionSubmitBody.attendances`). 출석 정정(`PATCH .../attendances`)은
 * **이미 제출한 회차의 출석만** 나중에 고치는 별도 경로이고(`SessionStatus.allowsCorrection()` —
 * `APPROVED`만 잠근다), 브라우저에서 호출하므로 `attendances-correct.ts`에 따로 뒀다. 두 경로를
 * 섞지 말 것(이슈 「지킬 것」).
 *
 * 그럼에도 이 파일을 두는 것은 출석 슬라이스의 조회 계약을 한자리에 모아 두기 위해서다 —
 * 출석부 정정 화면(후속)이 이 함수를 그대로 쓴다. `apiFetchAuthed`가 `next/headers`를 타므로
 * 배럴에서 재export 하지 않는다(서버 컴포넌트에서만 부른다). 오류 코드는 `error-codes.ts`에 있다.
 */

/** GET .../sessions/{sessionId}/attendances — 그 회차 출석 명단. 인증만 요구한다 */
export async function fetchSessionAttendances(
  academicProgramId: number,
  sessionId: number,
): Promise<AcademicAttendanceRow[]> {
  const res = await apiFetchAuthed<AttendanceRowResponse[] | null>(
    `/v1/academic-programs/${academicProgramId}/sessions/${sessionId}/attendances`,
  );
  return (res ?? []).map(toAttendanceRow);
}
