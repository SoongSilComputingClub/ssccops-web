/*
 * 응답 상태 변경 시트는 여기서 빠졌다 — 응답 화면 일체가 features/response 로 옮겨 갔다(#13).
 * 폼(정의)과 응답(제출물)은 다루는 자원도 화면도 다른데 한 features 아래 섞여 있었다.
 */
export { FormCloseSheet } from "./ui/form-close-sheet";
export {
  toFormDuplicateErrorMessage,
  toFormErrorMessage,
  toFormLabelErrorMessage,
  toFormStatusErrorMessage,
} from "./model/form-error";
export { useFormStatus } from "./model/use-form-status";
export type {
  FormStatusChange,
  FormStatusControl,
  FormStatusOutcome,
} from "./model/use-form-status";
export { useDuplicateForm } from "./model/use-duplicate-form";
export type { FormDuplicateControl, FormDuplication } from "./model/use-duplicate-form";
export { useFormLabels } from "./model/use-form-labels";
export type { FormLabelAdmin, FormLabelsStatus } from "./model/use-form-labels";
export { useFormList } from "./model/use-form-list";
export type { FormList, FormListStatus } from "./model/use-form-list";
export { useFormDetail } from "./model/use-form-detail";
export type { FormDetailQuery, FormDetailStatus } from "./model/use-form-detail";
export { useFormLabelOptions } from "./model/use-form-label-options";
export type { FormLabelOptions } from "./model/use-form-label-options";
export { useFormEditor } from "./model/use-form-editor";
export type {
  FormEditor,
  FormEditorStatus,
  FormSaveState,
  FormSaveStatus,
} from "./model/use-form-editor";
export {
  emptyFormDraft,
  nextQitemId,
  parseMaxSlctCnt,
  toFormDraft,
  toFormSaveInput,
} from "./model/form-draft";
export type { FormDraft, MaxSlctCntInput } from "./model/form-draft";
export { validateFormDraft, validateQitemCpst } from "./model/form-validation";
export type { FormDraftIssues, QitemCpstIssues } from "./model/form-validation";
export { FormSaveStatusBar } from "./ui/form-save-status";
/* 문항 구성 편집기는 폼 편집과 템플릿 편집이 함께 쓴다 — 두 벌이면 규칙이 갈린다 (#134) */
export { QitemComposer } from "./ui/qitem-composer";
export { usePublicForm } from "./model/use-public-form";
export type {
  PublicFormController,
  PublicFormStatus,
  PublicFormSubmitOutcome,
} from "./model/use-public-form";
/*
 * 답 다루기(분기 · 검증 · 저장 본문)와 문항 렌더링은 `@ssccops/form-renderer`로 갔다(#152).
 * 화면은 그 패키지에서 곧바로 가져다 쓴다 — 여기서 다시 내보내면 어드민을 거쳐야만 쓸 수 있는
 * 것처럼 보이고, 공개 앱이 같은 함수를 부르는 앞으로의 모양과도 어긋난다.
 */
export { useMyResponses } from "./model/use-my-responses";
export type { MyResponseList, MyResponseListStatus } from "./model/use-my-responses";
export { FORM_NOT_ACCEPTING_MESSAGE } from "./model/public-form-error";
/*
 * 기획안(#163)은 공개 폼 응답자 화면 그 자체라 이 슬라이스에 함께 산다 — 슬라이스를 따로 파면
 * `usePublicForm`·`useMyResponses`를 같은 레이어의 다른 슬라이스에서 참조하게 된다(FSD가 막는다).
 * 근거는 model/proposal-copy.ts 머리말.
 */
export { useProposalForm } from "./model/use-proposal-form";
export type { ProposalFormQuery, ProposalFormStatus } from "./model/use-proposal-form";
export { useProposalReview } from "./model/use-proposal-review";
export type {
  ProposalReviewQuery,
  ProposalReviewStatus,
} from "./model/use-proposal-review";
export { continuableResponse } from "./model/proposal-continuation";
export {
  PROPOSAL_FORM_MISSING,
  PROPOSAL_FORM_READ_DENIED,
  PROPOSAL_NOT_ACCEPTING_DESCRIPTION,
  PROPOSAL_NOT_ACCEPTING_TITLE,
  PROPOSAL_REJECTED_LOCKED,
  PROPOSAL_RESUBMIT_NOTE,
  PROPOSAL_REVIEW_READ_DENIED,
  toProposalFormErrorMessage,
  toProposalReviewErrorMessage,
} from "./model/proposal-copy";
