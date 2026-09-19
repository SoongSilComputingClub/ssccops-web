import { apiFetchAuthed } from "@/shared/api/authed-client";
import type { RecruitmentFormView } from "../model/types";
import { toRecruitmentFormView, type RecruitmentFormApiResponse } from "./response-mapping";

export { RECRUITMENT_FORM_ERROR } from "../model/error-codes";

/*
 * 모집 폼(지원서) 조회 (#528 · ssccops-server#483 ·
 * `GET /v1/academic-programs/{id}/recruitment/form`) — **서버 컴포넌트 전용**.
 *
 * ── 왜 폼 경로가 아니라 활동 경로인가 ───────────────────────
 * 어드민은 `GET /v1/forms/{formId}`로 읽지만 그 경로는 `FORM_READ`로 잠겨 있고, 스터디장·
 * 프로젝트장 역할에는 **권한이 하나도 없다**(V3 시드). 그래서 서버가 활동 id로 끊는 경로를
 * 새로 냈다 — 자격이 권한이 아니라 **소유권**(이 활동의 리더 본인 또는 `ACADEMIC_PROGRAM_MANAGE`)
 * 이고, 판정은 `AcademicProgramOwnershipPolicy.requireLeaderOrManager`가 한다.
 *
 * 폼 번호를 주소에 싣지 않는 것이 덤으로 따라온다 — «남의 폼 번호를 넣어 본다»가 성립하지
 * 않는다.
 *
 * ── 창이 닫혀도 200이다 ────────────────────────────────────
 * 신청자 조회(`recruitment.ts`)와 달리 `RECRUITMENT_NOT_STARTED`를 걸지 않는다. 문항을 채우는
 * 구간이 바로 모집 시작 전이고, 접수가 열린 뒤에도 리더는 자기 공고를 볼 수 있어야 한다 —
 * 그때는 `isEditable`만 false로 온다(화면의 «지원서 문항 보기»).
 *
 * ── 서버 전용이다 — 배럴에서 재export 하지 않는다 ─────────────
 * `apiFetchAuthed`가 `next/headers`(쿠키)를 타므로 클라이언트 컴포넌트가 배럴로 이 모듈을
 * 끌어오면 빌드가 깨진다(#128이 실제로 한 번 밟았다). 로더가 이 경로에서 직접 임포트한다.
 */
export async function fetchRecruitmentForm(
  academicProgramId: number,
): Promise<RecruitmentFormView> {
  const res = await apiFetchAuthed<RecruitmentFormApiResponse>(
    `/v1/academic-programs/${academicProgramId}/recruitment/form`,
  );
  return toRecruitmentFormView(res);
}
