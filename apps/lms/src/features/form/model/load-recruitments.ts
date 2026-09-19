import type { AcademicProgramSummary } from "@/entities/academic-program";
// 서버 전용 조회는 배럴이 재export 하지 않는다 — 직접 임포트한다
import { fetchMyAcademicPrograms } from "@/entities/academic-program/api/programs-read";
import { isSignupRequired, isUnauthenticated } from "@/shared/api/auth-error";
import { toRecruitmentFormErrorMessage } from "./recruitment-form-error";

/*
 * 모집 관리 목록 로더 (#528 · SSR).
 *
 * ── 조회가 하나다 ──────────────────────────────────────────
 * 카드가 그리는 값(접수 상태·기간·정원·지원 건수·문항 버전·승인일)이 **목록 응답에 전부
 * 실려 온다**(ssccops-server#483이 아홉 필드를 더했다). 그전이라면 카드마다 활동 상세를 한 번
 * 더 불러야 했을 자리다 — 서버가 폼 조인 한 줄과 집계 한 벌로 끝냈으므로 화면도 한 번만 부른다.
 *
 * ── 무엇을 거르는가 ────────────────────────────────────────
 * **모집이 열린 적 있는 활동만** 남긴다 = 연결된 폼이 있는 것(`formId != null`). 폼이 없는
 * 활동은 이관 전이거나 정합성이 깨진 것이라 이 화면에서 할 수 있는 일이 없다.
 *
 * 수료(`COMPLETED`)는 거르지 않는다 — 끝난 활동의 지원서도 «접수 종료»로 보인다. 어드민
 * 모집 관리는 국장이 «지금 모집할 것»을 고르는 자리라 수료를 뺐지만(#127), 이쪽은 리더가
 * 자기가 낸 공고를 되돌아보는 자리다.
 *
 * 정렬은 서버 기본(등록 최신순)을 그대로 쓴다.
 */

export type RecruitmentsLoad =
  | { outcome: "ready"; programs: AcademicProgramSummary[] }
  /** 맡은 활동이 없거나, 맡았지만 모집 폼이 붙은 것이 없다 — 화면이 빈 상태를 그린다 */
  | { outcome: "none" }
  | { outcome: "unauthenticated" }
  | { outcome: "signup-required" }
  | { outcome: "error"; message: string };

export async function loadRecruitments(): Promise<RecruitmentsLoad> {
  try {
    const programs = await fetchMyAcademicPrograms();
    const withForm = programs.filter((program) => program.formId != null);
    if (withForm.length === 0) return { outcome: "none" };
    return { outcome: "ready", programs: withForm };
  } catch (error: unknown) {
    if (isUnauthenticated(error)) return { outcome: "unauthenticated" };
    if (isSignupRequired(error)) return { outcome: "signup-required" };
    return { outcome: "error", message: toRecruitmentFormErrorMessage(error) };
  }
}
