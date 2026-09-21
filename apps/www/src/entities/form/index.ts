export type {
  FormLabel,
  FormRef,
  FormResponseReviewHistory,
  MyFormResponse,
  MyFormResponseDetail,
  MyFormResponseOverview,
  ReviewProcessCode,
  PublicForm,
  ResponseDraft,
  ResponseStatus,
} from "./model/types";
export { isFormRef } from "./model/types";
export {
  PROPOSAL_SYS_FORM_CD,
  RECRUIT_SYS_FORM_CD,
  answersOnWww,
} from "./model/system-form-code";
export { RESPONSE_STATUS_BADGE, systemFormNotice } from "./model/display";
export type { SystemFormNotice } from "./model/display";
export {
  FORM_ERROR,
  fetchMyResponseDraft,
  fetchPublicForm,
  isAlreadySubmitted,
  isFormNotAccepting,
  saveMyResponseDraft,
  submitFormResponse,
} from "./api/public-form";
export { fetchMyFormResponses } from "./api/my-responses";
export type { PublicFormMeta } from "./api/public-form-meta";
export { fetchPublicFormMeta } from "./api/public-form-meta";
/* 익명 경로(`apiFetch` — 토큰·`next/headers` 없음)라 배럴에 둔다 — 아래 SSR 전용 목록과 다르다 */
export type { RecruitFormMeta, RecruitReceiptStatus } from "./api/recruit-form-meta";
export { fetchRecruitFormMeta } from "./api/recruit-form-meta";

/*
 * **SSR 전용 조회는 이 배럴에 두지 않는다.**
 *
 * `fetchMyResponsesAcrossForms`·`fetchMyResponseDetail`·`fetchSystemForm`은 `apiFetchAuthed`(→ `next/headers`)를
 * 타는데, 배럴이 그것을 재export 하면 이 배럴에서 값 하나라도 가져가는 **클라이언트 컴포넌트가
 * 그 모듈까지 함께 끌어와** 빌드가 깨진다("You're importing a module that depends on
 * next/headers"). 실제로 `RESPONSE_STATUS_BADGE`를 쓰는 카드 하나 때문에 그렇게 됐다.
 *
 * 그래서 서버 컴포넌트가 경로로 직접 가져간다:
 *   import { fetchMyResponsesAcrossForms } from "@/entities/form/api/my-responses-across-forms";
 *
 * `fetchMyFormResponses`가 배럴에 있는 것은 그쪽이 **브라우저 클라이언트**를 쓰기 때문이다.
 * (`apps/lms`도 같은 이유로 재제출 폼에서 배럴을 피한다.)
 */
