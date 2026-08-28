import { apiFetchAuthed } from "@/shared/api/authed-client";
import type {
  AcademicSessionDetail,
  CurriculumItemWithSession,
} from "../model/types";
import {
  toCurriculumItem,
  toSessionDetail,
  type CurriculumItemWithSessionResponse,
  type SessionDetailResponse,
} from "./response-mapping";

/*
 * 회차 기록·커리큘럼 **조회** (#128 · ssccops-server#134·#135).
 *
 * ── 서버 전용이다 — 배럴에서 재export 하지 않는다 ─────────────
 * `apiFetchAuthed`가 `next/headers`(쿠키)를 타므로 이 모듈은 서버 컴포넌트에서만 부를 수 있다.
 * 클라이언트 컴포넌트가 임포트하면 빌드가 깨진다(www·어드민이 기대는 것과 같은 보호). 그래서
 * `entities/academic-session/index.ts`는 이 파일을 재export 하지 않고, SSR 로더
 * (`features/academic-session/model/load-session-record.ts`)가 직접 임포트한다.
 *
 * 제출·재제출(브라우저)은 옆의 `sessions-write.ts`가 맡는다. 응답 → 도메인 변환은 두 파일이
 * `response-mapping.ts`, 오류 코드는 `error-codes.ts`를 함께 쓴다(둘 다 전송 계층에 의존하지
 * 않는 순수 모듈이다).
 */

/**
 * GET /v1/academic-programs/{id}/curriculum-items — 계획 + 실적 조인 (#134).
 *
 * 회차 기록 화면은 이 목록에서 대상 커리큘럼 항목 하나를 골라 계획을 보여 주고, 그 항목의
 * `sesnSttsCd`·`isEditable`로 폼을 열지·POST/PUT 중 무엇을 쓸지 가른다. 페이징이 없다.
 */
export async function fetchCurriculumItems(
  academicProgramId: number,
): Promise<CurriculumItemWithSession[]> {
  const res = await apiFetchAuthed<CurriculumItemWithSessionResponse[] | null>(
    `/v1/academic-programs/${academicProgramId}/curriculum-items`,
  );
  return (res ?? []).map(toCurriculumItem);
}

/**
 * GET /v1/academic-programs/{id}/sessions/{sessionId} — 회차 상세 (#135).
 *
 * 재제출 화면이 진입할 때 이전 제출 내용(진행 내용·전달사항·출석·사진·수정요청 사유)을 폼
 * 초깃값으로 채우기 위해 부른다. 인증만 요구한다.
 */
export async function fetchAcademicSession(
  academicProgramId: number,
  sessionId: number,
): Promise<AcademicSessionDetail> {
  const res = await apiFetchAuthed<SessionDetailResponse>(
    `/v1/academic-programs/${academicProgramId}/sessions/${sessionId}`,
  );
  return toSessionDetail(res);
}
