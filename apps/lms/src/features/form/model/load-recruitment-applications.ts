import type { AcademicProgramSummary } from "@/entities/academic-program";
// 서버 전용 조회는 배럴이 재export 하지 않는다 — 직접 임포트한다
import { fetchMyAcademicPrograms } from "@/entities/academic-program/api/programs-read";
import type { RecruitmentApplication, RecruitmentApplicationDetail } from "@/entities/form";
import {
  fetchRecruitmentApplication,
  fetchRecruitmentApplications,
} from "@/entities/form/api/recruitment-applications-read";
import { isSignupRequired, isUnauthenticated } from "@/shared/api/auth-error";
import { toRecruitmentApplicationErrorMessage } from "./recruitment-application-error";

/*
 * 지원자 목록·지원서 상세 로더 (#826 · ssccops#625 · SSR).
 *
 * ── 두 조회를 병렬로 모은다 ─────────────────────────────────
 * 지원서 응답에는 프로그램명·유형·접수 상태가 없다. 머리글을 위해 내 프로그램 목록(`mine=leader`)에서
 * 이 프로그램 한 건을 함께 찾는다 — 지원서 문항 화면(`load-recruitment-form.ts`)과 같은 판단이다.
 * 권한 판정은 지원서 조회가 403으로 하므로, 목록이 실패하거나 목록에 없으면 **머리글만 빈다.**
 *
 * ── 지원서 조회 실패만 화면을 막는다 ─────────────────────────
 * 프로그램 목록 한 줄 때문에 지원서를 못 읽게 하지 않는다.
 */

export type RecruitmentApplicationsLoad =
  | {
      outcome: "ready";
      applications: RecruitmentApplication[];
      /** 머리글용 — 목록 조회가 실패했거나 목록에 없으면 null */
      program: AcademicProgramSummary | null;
    }
  | { outcome: "unauthenticated" }
  | { outcome: "signup-required" }
  | { outcome: "error"; message: string };

export type RecruitmentApplicationLoad =
  | {
      outcome: "ready";
      detail: RecruitmentApplicationDetail;
      program: AcademicProgramSummary | null;
    }
  | { outcome: "unauthenticated" }
  | { outcome: "signup-required" }
  | { outcome: "error"; message: string };

type Failed = Exclude<RecruitmentApplicationsLoad, { outcome: "ready" }>;

function toFailed(error: unknown): Failed {
  if (isUnauthenticated(error)) return { outcome: "unauthenticated" };
  if (isSignupRequired(error)) return { outcome: "signup-required" };
  return { outcome: "error", message: toRecruitmentApplicationErrorMessage(error) };
}

function pickProgram(
  result: PromiseSettledResult<AcademicProgramSummary[]>,
  academicProgramId: number,
): AcademicProgramSummary | null {
  if (result.status !== "fulfilled") return null;
  return result.value.find((p) => p.academicProgramId === academicProgramId) ?? null;
}

export async function loadRecruitmentApplications(
  academicProgramId: number,
): Promise<RecruitmentApplicationsLoad> {
  const [applicationsResult, programsResult] = await Promise.allSettled([
    fetchRecruitmentApplications(academicProgramId),
    fetchMyAcademicPrograms(),
  ]);

  if (applicationsResult.status === "rejected") return toFailed(applicationsResult.reason);

  return {
    outcome: "ready",
    applications: applicationsResult.value,
    program: pickProgram(programsResult, academicProgramId),
  };
}

export async function loadRecruitmentApplication(
  academicProgramId: number,
  formRspnsId: number,
): Promise<RecruitmentApplicationLoad> {
  const [detailResult, programsResult] = await Promise.allSettled([
    fetchRecruitmentApplication(academicProgramId, formRspnsId),
    fetchMyAcademicPrograms(),
  ]);

  if (detailResult.status === "rejected") return toFailed(detailResult.reason);

  return {
    outcome: "ready",
    detail: detailResult.value,
    program: pickProgram(programsResult, academicProgramId),
  };
}
