import type { AcademicProgramSummary, ProgramEventPost } from "@/entities/academic-program";
// 서버 전용 조회는 배럴이 재export 하지 않는다 — 직접 임포트한다
import { fetchProgramEventPost } from "@/entities/academic-program/api/event-post-read";
import { fetchMyAcademicPrograms } from "@/entities/academic-program/api/programs-read";
import { isSignupRequired, isUnauthenticated } from "@/shared/api/auth-error";
import { toEventPostErrorMessage } from "./event-post-error";

/*
 * 소개 글 편집 화면의 SSR 로더 (#819 · ADR-0069).
 *
 * 지원서 문항 로더(`load-recruitment-form.ts`)와 같은 모양이다 — 소개 글과 내 프로그램 목록을
 * 함께 부르고, 목록은 머리글(프로그램명·유형·상태)에만 쓴다. 목록이 실패해도 편집은 열린다.
 * 권한 판정은 소개 글 조회의 403이 한다(목록에 없으면 머리글만 빈다).
 */

export type EventPostLoad =
  | {
      outcome: "ready";
      post: ProgramEventPost;
      /** 머리글용 — 목록 조회가 실패했거나 목록에 없으면 null */
      program: AcademicProgramSummary | null;
    }
  | { outcome: "unauthenticated" }
  | { outcome: "signup-required" }
  | { outcome: "error"; message: string };

export async function loadEventPost(academicProgramId: number): Promise<EventPostLoad> {
  const [postResult, programsResult] = await Promise.allSettled([
    fetchProgramEventPost(academicProgramId),
    fetchMyAcademicPrograms(),
  ]);

  if (postResult.status === "rejected") {
    const error: unknown = postResult.reason;
    if (isUnauthenticated(error)) return { outcome: "unauthenticated" };
    if (isSignupRequired(error)) return { outcome: "signup-required" };
    return { outcome: "error", message: toEventPostErrorMessage(error) };
  }

  const program =
    programsResult.status === "fulfilled"
      ? (programsResult.value.find((p) => p.academicProgramId === academicProgramId) ?? null)
      : null;

  return { outcome: "ready", post: postResult.value, program };
}
