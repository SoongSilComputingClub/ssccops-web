/*
 * 기획안 피처 배럴 (#171).
 *
 * ⚠️ **클라이언트 훅(`useResubmitForm`·`useProposalForm`)은 여기서 재export 하지 않는다** —
 * 이 배럴은 SSR 로더(`loadMyApplications`·`loadProposalDetail`·`loadProposalForm`)를 재export
 * 하고, 그 로더는 서버 전용 조회(`entities/response/api/*` → `next/headers`)를 끌어온다.
 * 클라이언트 컴포넌트가 이 배럴을 통해 훅을 가져오면 서버 모듈이 클라 번들로 딸려 들어가
 * 빌드가 깨진다(`features/academic-session` 배럴과 같은 규칙). 훅은
 * `@/features/proposal/model/use-*`에서 직접 임포트한다.
 *
 * 오류 문구·상수·`continuableResponse`는 전송 계층 무의존 순수 모듈이라 어디서든 안전하다.
 */

export {
  loadMyApplications,
  type MyApplicationsLoad,
} from "./model/load-my-applications";
export {
  loadProposalDetail,
  type ProposalDetailLoad,
} from "./model/load-proposal-detail";
export {
  loadProposalForm,
  type ProposalFormLoad,
} from "./model/load-proposal-form";
export { continuableResponse } from "./model/proposal-continuation";
export {
  loadProposalErrorMessage,
  newProposalSubmitErrorMessage,
  proposalDraftSaveErrorMessage,
  resubmitProposalErrorMessage,
  PROPOSAL_FORM_MISSING,
  PROPOSAL_NEW_INTRO,
  PROPOSAL_NOT_ACCEPTING_DESCRIPTION,
  PROPOSAL_NOT_ACCEPTING_TITLE,
  PROPOSAL_REJECTED_LOCKED,
  PROPOSAL_RESPONSE_NOT_FOUND,
  PROPOSAL_RESUBMIT_NOTE,
} from "./model/proposal-error";
