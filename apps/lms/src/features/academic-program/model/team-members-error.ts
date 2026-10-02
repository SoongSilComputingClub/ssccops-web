// 서버 전용 조회를 품은 배럴이 아니라 순수 상수 모듈에서 직접 가져온다 — 이 파일은 브라우저 훅이 부른다
import { ACADEMIC_PROGRAM_MEMBER_ERROR } from "@/entities/academic-program/api/error-codes";
import { AUTH_ERROR } from "@/shared/api/auth-error";
import { API_ERROR, ApiError } from "@/shared/api/client";

/*
 * 팀원 추가·상태 변경·이력·회원 목록 실패 → 한 줄 (#742 · server#612).
 *
 * 화면은 `ApiError.code`로만 분기한다(#29). 알 수 없는 코드는 서버 문장을 그대로 보여 준다 —
 * 임의로 뭉개면 원인을 알려주려고 서버가 실어 보낸 문장이 사라진다.
 *
 * 버튼은 명단의 `isEditable`(서버 판정)로 이미 감춰 두므로, 종료·폐지·모집 전 409는 **화면을 열어
 * 둔 사이** 상태가 바뀐 경우다. 종료·폐지는 새로고침으로 풀리지 않아 누구에게 무엇을 요청하나를
 * 적고(회차 기록·출석 정정과 같은 문장), 나머지는 새로고침을 권한다.
 */

/** 추가·제외·확정·대기·다시 넣기 실패 */
export function toTeamMemberChangeErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "팀원을 바꾸지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case ACADEMIC_PROGRAM_MEMBER_ERROR.FORBIDDEN:
      return "이 프로그램의 스터디장만 팀원을 바꿀 수 있습니다";
    case ACADEMIC_PROGRAM_MEMBER_ERROR.ACADEMIC_PROGRAM_COMPLETED:
      return "종료된 프로그램입니다 — 학술국장에게 재시작을 요청해주세요";
    case ACADEMIC_PROGRAM_MEMBER_ERROR.ACADEMIC_PROGRAM_DISCONTINUED:
      return "폐지된 프로그램입니다 — 학술국장에게 복원을 요청해주세요";
    case ACADEMIC_PROGRAM_MEMBER_ERROR.RECRUITMENT_NOT_STARTED:
      return "모집을 시작하기 전이라 팀원을 바꿀 수 없습니다 — 새로고침해주세요";
    case ACADEMIC_PROGRAM_MEMBER_ERROR.MEMBER_NOT_ADDABLE:
      return "팀원으로 넣을 수 없는 회원입니다 — 다른 회원을 골라주세요";
    case ACADEMIC_PROGRAM_MEMBER_ERROR.EVENT_PARTICIPANT_DUPLICATED:
      return "이미 명단에 있는 회원입니다 — 새로고침해주세요";
    case ACADEMIC_PROGRAM_MEMBER_ERROR.EVENT_PARTICIPANT_NOT_FOUND:
      return "명단에 없는 팀원입니다 — 새로고침해주세요";
    case ACADEMIC_PROGRAM_MEMBER_ERROR.INVALID_PARTICIPANT_STATUS_TRANSITION:
      return "이미 상태가 바뀐 팀원입니다 — 새로고침해주세요";
    case ACADEMIC_PROGRAM_MEMBER_ERROR.ACADEMIC_PROGRAM_NOT_FOUND:
      return "프로그램이 없습니다 — 새로고침해주세요";
    case ACADEMIC_PROGRAM_MEMBER_ERROR.VALIDATION_FAILED:
    case ACADEMIC_PROGRAM_MEMBER_ERROR.INVALID_CODE_VALUE:
      return "선택지가 바뀌었습니다 — 새로고침해주세요";
    case AUTH_ERROR.UNAUTHENTICATED:
    case AUTH_ERROR.UNAUTHORIZED:
      return "로그인이 풀렸습니다 — 다시 로그인해주세요";
    case API_ERROR.CONFIG_MISSING:
      return "지금은 팀원을 바꿀 수 없습니다 — 잠시 후 다시 시도해주세요";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}

/** 명단 이력 조회 실패 */
export function toMemberHistoryErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "이력을 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case ACADEMIC_PROGRAM_MEMBER_ERROR.FORBIDDEN:
      return "이력은 스터디장과 학술국장만 볼 수 있습니다";
    case ACADEMIC_PROGRAM_MEMBER_ERROR.ACADEMIC_PROGRAM_NOT_FOUND:
      return "프로그램이 없습니다 — 새로고침해주세요";
    case AUTH_ERROR.UNAUTHENTICATED:
    case AUTH_ERROR.UNAUTHORIZED:
      return "로그인이 풀렸습니다 — 다시 로그인해주세요";
    case API_ERROR.CONFIG_MISSING:
      return "지금은 이력을 불러올 수 없습니다 — 잠시 후 다시 시도해주세요";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}

/** 팀원 추가 시트의 회원 목록 조회 실패 */
export function toAddCandidatesErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "회원 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case AUTH_ERROR.UNAUTHENTICATED:
    case AUTH_ERROR.UNAUTHORIZED:
      return "로그인이 풀렸습니다 — 다시 로그인해주세요";
    case API_ERROR.CONFIG_MISSING:
      return "지금은 회원 목록을 불러올 수 없습니다 — 잠시 후 다시 시도해주세요";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}
