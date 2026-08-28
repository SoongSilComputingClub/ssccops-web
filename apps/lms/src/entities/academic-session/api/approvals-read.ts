import { apiFetchAuthedList } from "@/shared/api/authed-client";
import { toQuery } from "@/shared/api/client";
import type { AcademicProgramApproval } from "../model/types";

export { ACADEMIC_APPROVAL_ERROR } from "./error-codes";

/*
 * 승인 이력 조회 (#126 · ssccops-server#139 · GET /v1/academic-programs/{id}/approvals)
 * — 서버 전용.
 *
 * 스터디장 대시보드(`/studio`)의 "내 기록 처리 현황"이 부른다 — 국장이 내 회차 기록을 승인·
 * 수정요청한 이력이다. **권한 애노테이션이 없다**(인증만) — 서버가 열람 범위를 스터디장 본인
 * + 학술국장으로 제한한다(서버 #139 결정 1). 이 앱은 스터디장 본인 화면이라 맞는다.
 *
 * ── 서버 전용이다 — 배럴에서 재export 하지 않는다 ─────────────
 * `apiFetchAuthedList`가 `next/headers`를 타므로 서버 컴포넌트에서만 부를 수 있다. 로더
 * (`features/academic-program/model/load-leader-dashboard.ts`)가 직접 임포트한다.
 *
 * `aprvPntCd`는 `SESSION`·`COMPLETION`만 받는다(그 밖은 400). 대시보드는 `SESSION`으로 좁힌다.
 * 페이징이 붙지만(활동당 이력이 적다) 최근 몇 줄만 보여 주므로 첫 페이지만 받는다.
 *
 * 날짜는 서버가 Asia/Seoul 오프셋을 붙여 내려준다("2026-03-01T00:00:00+09:00").
 */

/* ── 서버 응답(Response DTO) ────────────────────────────────── */

interface AcademicProgramApprovalResponse {
  approvalId: number;
  aprvPntCd: string;
  aprvSttsCd: string;
  sessionId: number | null;
  aprvrMbrNm: string | null;
  opnnCn: string | null;
  aprvDt: string | null;
}

/* ── 응답 → 도메인 ─────────────────────────────────────────── */

function toApproval(res: AcademicProgramApprovalResponse): AcademicProgramApproval {
  return {
    approvalId: res.approvalId,
    aprvPntCd: res.aprvPntCd,
    aprvSttsCd: res.aprvSttsCd,
    sessionId: res.sessionId,
    // 빈 이름을 "-"로 채우는 것은 표시 규칙이라 뷰가 정한다 — 변환기는 "값이 없다"만 남긴다
    approverMemberName: res.aprvrMbrNm ?? "",
    opinionContent: res.opnnCn,
    approvedAt: res.aprvDt,
  };
}

/* ── 조회 ──────────────────────────────────────────────────── */

/**
 * GET /v1/academic-programs/{academicProgramId}/approvals?aprvPntCd=SESSION — 회차 승인 이력.
 *
 * 서버가 처리 일시 내림차순으로 준다(최근 처리가 위) — 화면이 다시 정렬하지 않는다.
 */
export async function fetchAcademicProgramApprovals(
  academicProgramId: number,
): Promise<AcademicProgramApproval[]> {
  const query = toQuery({ aprvPntCd: "SESSION" });
  const { data } = await apiFetchAuthedList<AcademicProgramApprovalResponse>(
    `/v1/academic-programs/${academicProgramId}/approvals${query}`,
  );
  return data.map(toApproval);
}
