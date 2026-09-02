import { RESPONSE_ERROR } from "@/entities/response";
import { AUTH_ERROR } from "@/shared/api/auth-error";
import { API_ERROR, ApiError } from "@/shared/api/client";

/*
 * 기획안 조회·재제출 실패 → 화면에 띄울 한 줄 (#171 · AGENTS.md 「화면 문구 (#117)」).
 *
 * 화면은 `ApiError.code`로만 분기한다(문구는 서버에서 바뀌지만 코드는 계약이다). 알 수 없는
 * 코드는 서버가 내려준 `message`를 그대로 보여 준다.
 *
 * ── 401·미가입은 여기서 문구를 만들지 않는다 ──────────────────
 * 이 앱에는 리다이렉트하는 `apiFetch`가 없다(로그인 화면이 없어 되돌아올 곳이 없다 — www 규약).
 * 미로그인·토큰 만료는 화면이 `LoginGate`로, 미가입은 어드민 `/signup` 안내로 그린다 — 그
 * 판정은 `isUnauthenticated`/`isSignupRequired`가 하고 이 함수는 부르지 않는다.
 *
 * 오류 문구는 **원인 + 다음 행동** 순서로, 부연은 대시(—)로 잇는다.
 */

/**
 * 기획안 폼이 아직 세워지지 않았다 — 접수 시작 이전 단계다(정상 상태일 수 있다).
 *
 * 기획안 폼은 시드 직후 작성 중(DRAFT)이고, 운영진이 접수를 시작하기 전까지는 이 앱에서
 * 제출 현황도 재제출도 할 수 없다.
 */
export const PROPOSAL_FORM_MISSING =
  "기획안 폼이 아직 준비되지 않았습니다 — 운영진이 폼을 세운 뒤 다시 열어주세요";

/** 없는 응답 · 본인 것이 아닌 응답을 열었다(서버가 한 코드로 묶는다) */
export const PROPOSAL_RESPONSE_NOT_FOUND =
  "이 기획안을 찾을 수 없습니다 — 제출 현황에서 다시 골라주세요";

/**
 * 반려된 기획안의 재제출 잠금.
 *
 * 화면이 미리 잠글 때와 서버가 409 `RESPONSE_ALREADY_REJECTED`로 거절할 때가 같은 문장이어야
 * 한다 — 다르게 말하면 두 가지 일이 일어난 것으로 읽힌다.
 */
export const PROPOSAL_REJECTED_LOCKED =
  "반려된 기획안은 다시 제출할 수 없습니다 — 새로 작성해 다른 기획안으로 내주세요";

/**
 * 접수 중이 아닌 기획안 폼 — 신규 작성 화면의 정상 상태일 수 있다.
 *
 * 기획안 폼은 시드 직후 작성 중(DRAFT)이고 접수 기간도 비어 있어, 운영진이 접수를 시작하기
 * 전까지는 새 기획안을 낼 수 없다. 화면이 미리 잠글 때(`acceptingYn === false`)와 제출 순간
 * 서버가 409 `FORM_NOT_ACCEPTING`으로 거절할 때가 같은 문장이어야 한다.
 */
export const PROPOSAL_NOT_ACCEPTING_TITLE = "지금은 기획안을 받지 않습니다";
export const PROPOSAL_NOT_ACCEPTING_DESCRIPTION =
  "운영진이 기획안 접수를 시작하면 이 화면에서 작성해 제출할 수 있습니다 — 접수가 열리면 다시 열어주세요";

/** 신규 작성 화면 머리말 — 재제출 안내(`PROPOSAL_RESUBMIT_NOTE`)와 달리 처음 내는 사람용 */
export const PROPOSAL_NEW_INTRO =
  "작성 중인 내용은 자동으로 저장됩니다 — 나갔다 들어와도 이어서 쓸 수 있습니다. 제출하면 학술국장 검토 대기로 넘어갑니다.";

/**
 * 커리큘럼 문항 형식 안내를 화면이 지어내지 않는다.
 *
 * `1회차 | 주제 | 2026-03-05` 형식 안내는 서버 시드가 문항 문구(`qitemLblNm`·설명)에 직접
 * 넣어 두었다(`ProposalFormSeed.CURRICULUM_LABEL`). 화면이 같은 말을 한 번 더 적으면 두
 * 문장은 반드시 갈리고, 갈린 순간 제출자는 화면 안내대로 적었는데 승인이 막힌다. 화면이
 * 커리큘럼을 파싱하지 않는 것도 같은 결정의 다른 면이다 — 구조화는 승인 시점에 서버가 한다.
 */

/**
 * 재제출이 어떻게 동작하는지 (서버 `findContinuableResponse`).
 *
 * 제출 경로에는 응답 식별자가 없다. 수정요청을 받은 기획안이 있으면 여기서 낸 내용이 새
 * 기획안이 아니라 그 기획안의 다음 회차로 들어간다 — 화면이 말하지 않으면 제출자는 두 번째
 * 기획안을 냈다고 믿는다.
 */
export const PROPOSAL_RESUBMIT_NOTE =
  "여기서 낸 내용이 새 기획안이 아니라 이 기획안의 다음 회차로 들어갑니다 — 제출하면 학술국장 검토 대기로 돌아갑니다";

/** 제출 현황·상세 조회 실패 → 한 줄 */
export function loadProposalErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "기획안 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case RESPONSE_ERROR.FORM_NOT_FOUND:
      return PROPOSAL_FORM_MISSING;
    case RESPONSE_ERROR.FORM_RESPONSE_NOT_FOUND:
      return PROPOSAL_RESPONSE_NOT_FOUND;
    case API_ERROR.CONFIG_MISSING:
      return "서버 주소가 설정되지 않아 기획안 정보를 불러올 수 없습니다";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}

/** 초안 자동 저장 실패 → 한 줄 (자동 저장 상태 표시줄에 붙는다) */
export function proposalDraftSaveErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "자동 저장에 실패했습니다 — 잠시 후 다시 시도합니다";
  }

  switch (error.code) {
    case RESPONSE_ERROR.FORM_NOT_ACCEPTING:
      return "접수가 마감돼 자동 저장할 수 없습니다 — 작성한 내용을 따로 복사해두세요";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없어 자동 저장하지 못했습니다 — 연결되면 다시 저장합니다";
    case API_ERROR.CONFIG_MISSING:
      return "서버 주소가 설정되지 않아 자동 저장할 수 없습니다";
    case AUTH_ERROR.UNAUTHENTICATED:
    case AUTH_ERROR.UNAUTHORIZED:
      return "로그인이 만료돼 자동 저장하지 못했습니다 — 다시 로그인해주세요";
    default:
      return error.message;
  }
}

/** 신규 작성 제출 실패 → 한 줄 (재제출과 달리 `RESPONSE_ALREADY_REJECTED`가 없다) */
export function newProposalSubmitErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "기획안을 제출하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case RESPONSE_ERROR.FORM_NOT_ACCEPTING:
      return `${PROPOSAL_NOT_ACCEPTING_TITLE} — 접수가 열린 뒤 다시 제출해주세요`;
    case RESPONSE_ERROR.RESPONSE_ALREADY_SUBMITTED:
      return "이미 제출된 기획안입니다 — 제출 현황을 새로고침하면 검토 대기 상태로 보입니다";
    case RESPONSE_ERROR.UNKNOWN_QUESTION_ITEM:
    case RESPONSE_ERROR.INVALID_ANSWER_VALUE:
      return "폼의 문항이 바뀌었습니다 — 화면을 새로고침한 뒤 다시 제출해주세요";
    case RESPONSE_ERROR.REQUIRED_ANSWER_MISSING:
    case RESPONSE_ERROR.ANSWER_PATTERN_MISMATCH:
    case RESPONSE_ERROR.ANSWER_SELECTION_LIMIT_EXCEEDED:
      return "입력을 확인해주세요 — 필수 문항·형식·선택 개수를 다시 살펴봐주세요";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    case API_ERROR.CONFIG_MISSING:
      return "서버 주소가 설정되지 않아 제출할 수 없습니다";
    case AUTH_ERROR.UNAUTHENTICATED:
    case AUTH_ERROR.UNAUTHORIZED:
      return "로그인이 만료됐습니다 — 다시 로그인한 뒤 제출해주세요";
    default:
      return error.message;
  }
}

/** 재제출 실패 → 한 줄 */
export function resubmitProposalErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "기획안을 다시 제출하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case RESPONSE_ERROR.RESPONSE_ALREADY_REJECTED:
      return PROPOSAL_REJECTED_LOCKED;
    case RESPONSE_ERROR.RESPONSE_ALREADY_SUBMITTED:
      return "이미 제출된 기획안입니다 — 제출 현황을 새로고침하면 검토 대기 상태로 보입니다";
    case RESPONSE_ERROR.FORM_NOT_ACCEPTING:
      return "지금은 이 폼이 제출을 받지 않습니다 — 운영진에게 문의해주세요";
    case RESPONSE_ERROR.UNKNOWN_QUESTION_ITEM:
    case RESPONSE_ERROR.INVALID_ANSWER_VALUE:
      return "폼의 문항이 바뀌었습니다 — 화면을 새로고침한 뒤 다시 제출해주세요";
    case RESPONSE_ERROR.REQUIRED_ANSWER_MISSING:
    case RESPONSE_ERROR.ANSWER_PATTERN_MISMATCH:
    case RESPONSE_ERROR.ANSWER_SELECTION_LIMIT_EXCEEDED:
      return "입력을 확인해주세요 — 필수 문항·형식·선택 개수를 다시 살펴봐주세요";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    case API_ERROR.CONFIG_MISSING:
      return "서버 주소가 설정되지 않아 제출할 수 없습니다";
    case AUTH_ERROR.UNAUTHENTICATED:
    case AUTH_ERROR.UNAUTHORIZED:
      return "로그인이 만료됐습니다 — 다시 로그인한 뒤 제출해주세요";
    default:
      return error.message;
  }
}
