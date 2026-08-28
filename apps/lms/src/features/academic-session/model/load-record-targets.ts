import type { CurriculumItemWithSession } from "@/entities/academic-session";
// 서버 전용 조회는 배럴이 재export 하지 않는다 — 직접 임포트한다
import { fetchCurriculumItems } from "@/entities/academic-session/api/sessions-read";
import { isSignupRequired, isUnauthenticated } from "@/shared/api/auth-error";
import { loadSessionRecordErrorMessage } from "./session-record-error";

/*
 * 회차 기록 대상 후보 조회 (#190).
 *
 * 회차 기록 화면(`/studio/record`)을 활동만 정한 채(커리큘럼 항목 없이) 열었을 때, 그 활동의
 * 커리큘럼 항목 목록을 그려 하나를 고르게 한다. 상단 활동 드롭다운(#192)으로 활동만 정하고
 * 아직 회차를 안 고른 상태다.
 *
 * `fetchCurriculumItems`(#134)가 `next/headers`를 타므로 서버 전용이다 — SSR 셸이 부른다.
 */

export type RecordTargetsLoad =
  | { outcome: "ready"; items: CurriculumItemWithSession[] }
  | { outcome: "unauthenticated" }
  | { outcome: "signup-required" }
  | { outcome: "error"; message: string };

export async function loadRecordTargets(
  academicProgramId: number,
): Promise<RecordTargetsLoad> {
  try {
    const items = await fetchCurriculumItems(academicProgramId);
    return { outcome: "ready", items };
  } catch (error: unknown) {
    if (isUnauthenticated(error)) return { outcome: "unauthenticated" };
    if (isSignupRequired(error)) return { outcome: "signup-required" };
    return { outcome: "error", message: loadSessionRecordErrorMessage(error) };
  }
}
