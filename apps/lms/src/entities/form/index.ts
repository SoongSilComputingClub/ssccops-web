/*
 * 모집 폼(지원서) 슬라이스 배럴 (#528).
 *
 * **조회(`recruitment-form-read.ts`)를 재export 하지 않는다.** `apiFetchAuthed`가
 * `next/headers`를 타는 서버 전용 모듈이라, 클라이언트 컴포넌트가 배럴에서 무엇이든 가져오는
 * 순간 그 의존이 클라 번들로 끌려와 빌드가 깨진다(#128·#171이 세운 규칙 — 실제로 한 번 깨졌다).
 * 로더는 `entities/form/api/recruitment-form-read`에서 직접 임포트한다.
 *
 * 저장(`recruitment-form-write.ts`)은 `"use client"`라 배럴에 실어도 안전하지만, 짝이 되는
 * 조회가 없는 자리에 혼자 있으면 «둘 다 여기 있다»로 읽힌다 — 훅이 직접 임포트하게 두고
 * 배럴에는 타입과 표시 규칙만 남긴다.
 */
export type {
  FormReceiptStatus,
  RecruitmentForm,
  RecruitmentFormView,
} from "./model/types";
export { RECRUITMENT_FORM_ERROR } from "./model/error-codes";
export {
  recruitmentPhaseOf,
  receiptStatusBadge,
  type RecruitmentPhase,
} from "./model/display";
