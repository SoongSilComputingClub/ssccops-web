import { API_ERROR, ApiError } from "@/shared/lib/api/client";
import { toFormErrorMessage } from "./form-error";

/*
 * 기획안 화면의 문구 (ssccops-web #163 · AGENTS.md 「화면 문구 (#117)」).
 *
 * ── 왜 features/proposal이 아니라 여기인가 ─────────────────────
 * 기획안 화면은 **공개 폼 응답자 화면 그 자체**다 — 문항도 자동 저장도 제출도 폼 도메인의
 * 경로를 그대로 탄다(ssccops#131 결정). 슬라이스를 따로 파면 `usePublicForm`·`useMyResponses`를
 * 같은 레이어의 다른 슬라이스에서 참조하게 되는데, 그것은 FSD가 막는 방향이다(AGENTS.md).
 * 응답자용 훅을 features/response가 아니라 여기 둔 use-my-responses.ts의 판단과 같은 줄기다.
 *
 * ── 문구를 상수로 두는 이유 ───────────────────────────────────
 * 같은 상황을 작성 화면과 제출 현황 화면이 함께 말한다. 각자 적으면 한쪽만 고쳐져 같은 상태가
 * 두 문장으로 보이고, 읽는 사람은 서로 다른 두 가지 일이 일어난 줄 안다.
 */

/**
 * 아직 접수를 시작하지 않은 기획안 폼.
 *
 * **이것이 지금의 정상 상태다.** 기획안 폼은 시드 직후 작성 중(DRAFT)이고 접수 기간도 비어
 * 있어(서버 `ProposalFormSeeder`), 운영진이 접수를 시작하기 전까지 서버는 문항 조회·제출을
 * 409 `FORM_NOT_ACCEPTING`으로 끊는다. 이것을 실패처럼 보여 주면 제출자는 화면이 고장난 줄
 * 알고 같은 자리를 되풀이해 누른다.
 *
 * 공통 문구(FORM_NOT_ACCEPTING_MESSAGE)를 그대로 쓰지 않는 것은 그쪽이 링크만 받은 응답자를
 * 향해 쓰인 문장이라 "안내받은 채널에서 확인해주세요"로 끝나기 때문이다. 기획안은 회원이
 * 스스로 찾아 들어오는 화면이라 다음에 무엇이 열리는지를 그 자리에서 말해야 한다.
 */
export const PROPOSAL_NOT_ACCEPTING_TITLE = "지금은 기획안을 접수하지 않습니다";

export const PROPOSAL_NOT_ACCEPTING_DESCRIPTION =
  "기획안 접수는 운영진이 시작해야 열립니다 — 열리면 이 화면에서 바로 작성할 수 있습니다. 이미 낸 기획안은 제출 현황에서 그대로 확인할 수 있습니다.";

/** 폼 자체가 아직 세워지지 않았다 — 접수 시작 이전 단계라 위와 다른 상황이고 문구도 다르다 */
export const PROPOSAL_FORM_MISSING =
  "기획안 폼이 아직 준비되지 않았습니다 — 운영진이 폼을 세운 뒤 다시 열어주세요";

/**
 * 폼 목록을 읽을 권한이 없다.
 *
 * 기획안 폼을 번호가 아니라 코드로 찾으려면 폼 목록을 한 번 읽어야 하고(entities/form/api/
 * proposal-form.ts), 그 목록은 폼 조회 권한을 요구한다. 요구 권한을 이름으로 밝히는 것은
 * AGENTS.md의 규칙이다 — 뭉뚱그리면 막힌 사람도, 권한을 주려는 사람도 무엇이 필요한지 모른다.
 */
export const PROPOSAL_FORM_READ_DENIED =
  "기획안 폼을 열 권한이 없습니다 — 폼 조회(FORM_READ) 권한이 필요합니다. 운영진에게 요청해주세요";

/**
 * 검토 내용을 읽을 권한이 없다.
 *
 * 처리자·시각·사유가 실려 오는 경로는 응답 단건 조회 하나뿐이고, 그 경로는 응답 심사 권한을
 * 요구한다(서버 `FormResponseController`). 목록의 상태 배지까지 함께 사라지지 않도록 이 실패는
 * **펼친 칸 안에서만** 말한다.
 */
export const PROPOSAL_REVIEW_READ_DENIED =
  "검토 내용을 읽을 권한이 없습니다 — 응답 심사(RESPONSE_REVIEW) 권한이 필요합니다. 사유는 안내받은 채널에서 확인해주세요";

/**
 * 반려된 기획안의 재제출 잠금.
 *
 * 화면이 미리 잠글 때와 서버가 409 `RESPONSE_ALREADY_REJECTED`로 거절할 때가 같은 문장이어야
 * 한다 — 다르게 말하면 두 가지 일이 일어난 것으로 읽힌다(시스템 폼 잠금 문구와 같은 규칙).
 */
export const PROPOSAL_REJECTED_LOCKED =
  "반려된 기획안은 다시 제출할 수 없습니다 — 새로 작성해 다른 기획안으로 내주세요";

/**
 * 재제출이 어떻게 동작하는지 (서버 `FormResponseServiceImpl.findContinuableResponse`).
 *
 * **제출 경로에는 응답 식별자가 없다.** 수정요청을 받은 기획안이 있으면 다음 제출이 새 기획안이
 * 아니라 그 기획안의 다음 회차가 된다 — 서버가 그렇게 고른다. 화면이 이 사실을 말하지 않으면
 * 제출자는 두 번째 기획안을 냈다고 믿는데 실제로는 첫 기획안을 덮어쓴 것이 된다.
 */
export const PROPOSAL_RESUBMIT_NOTE =
  "수정요청을 받은 기획안이 있으면 여기서 낸 내용이 새 기획안이 아니라 그 기획안의 다음 회차로 들어갑니다 — 검토 대기로 돌아갑니다";

/**
 * 기획안 폼 조회 실패 → 화면에 띄울 한 줄.
 *
 * 권한 부족만 여기서 다시 쓰고 나머지는 폼 도메인의 매핑에 넘긴다 — 네트워크·설정 누락처럼
 * 읽는 사람과 무관한 실패까지 문구를 두 벌로 만들 이유가 없다.
 */
export function toProposalFormErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "기획안 폼을 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }
  if (error.code === API_ERROR.FORBIDDEN || error.code === API_ERROR.ACCESS_DENIED) {
    return PROPOSAL_FORM_READ_DENIED;
  }
  return toFormErrorMessage(error);
}

/** 제출한 기획안 한 건의 검토 내용 조회 실패 → 펼친 칸 안에 띄울 한 줄 */
export function toProposalReviewErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "검토 내용을 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }
  if (error.code === API_ERROR.FORBIDDEN || error.code === API_ERROR.ACCESS_DENIED) {
    return PROPOSAL_REVIEW_READ_DENIED;
  }
  return toFormErrorMessage(error);
}
