import { fetchRecruitmentForm } from "@/entities/form/api/recruitment-form-read";
import type { RecruitmentFormView } from "@/entities/form";
import type { AcademicProgramSummary } from "@/entities/academic-program";
import { fetchMyAcademicPrograms } from "@/entities/academic-program/api/programs-read";
import { isSignupRequired, isUnauthenticated } from "@/shared/api/auth-error";
import { toRecruitmentFormErrorMessage } from "./recruitment-form-error";

/*
 * 지원서 문항 편집 화면의 로더 (#528 · SSR).
 *
 * ── 두 조회를 병렬로 모은다 ─────────────────────────────────
 * 폼(`GET .../recruitment/form`)만으로는 화면 머리글에 활동명·유형·스터디장을 쓸 수 없다 —
 * 폼 제목(«{행사명} 모집»)은 이관이 파생한 값이라 활동명의 사본이고, 시안의 머리글은 활동
 * 쪽을 보여 준다. 그래서 내 활동 목록에서 이 활동 한 건을 함께 찾는다.
 *
 * 목록을 한 번 더 부르는 것이 아깝지만 **활동 단건 조회를 여기에 새로 붙이지 않았다** —
 * 이 앱에는 활동 단건 통로가 없고(#188 상세도 목록에서 고른다), 있는 통로를 쓰면 «내가 맡은
 * 활동인가»가 덤으로 확인된다. 폼 조회가 이미 403으로 끊으므로 권한 판정을 이 목록이 하는
 * 것은 아니고, **목록에 없으면 머리글만 비는** 정도로 다룬다(폼은 그대로 그린다).
 *
 * ── `Promise.all`이되 폼 실패만 화면을 막는다 ────────────────
 * 활동 목록이 실패해도 문항은 고칠 수 있어야 한다 — 머리글 한 줄 때문에 편집 창을 닫으면
 * 되돌릴 수 없는 시간(접수 시작 전)을 버린다.
 */

export type RecruitmentFormLoad =
  | {
      outcome: "ready";
      view: RecruitmentFormView;
      /** 머리글용 — 목록 조회가 실패했거나 목록에 없으면 null */
      program: AcademicProgramSummary | null;
    }
  | { outcome: "unauthenticated" }
  | { outcome: "signup-required" }
  | { outcome: "error"; message: string };

export async function loadRecruitmentForm(
  academicProgramId: number,
): Promise<RecruitmentFormLoad> {
  const [formResult, programsResult] = await Promise.allSettled([
    fetchRecruitmentForm(academicProgramId),
    fetchMyAcademicPrograms(),
  ]);

  if (formResult.status === "rejected") {
    const error: unknown = formResult.reason;
    if (isUnauthenticated(error)) return { outcome: "unauthenticated" };
    if (isSignupRequired(error)) return { outcome: "signup-required" };
    return { outcome: "error", message: toRecruitmentFormErrorMessage(error) };
  }

  const program =
    programsResult.status === "fulfilled"
      ? (programsResult.value.find((p) => p.academicProgramId === academicProgramId) ?? null)
      : null;

  return { outcome: "ready", view: formResult.value, program };
}
