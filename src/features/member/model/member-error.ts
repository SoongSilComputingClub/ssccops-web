import { MEMBER_ERROR, MEMBER_ROLE_ERROR } from "@/entities/member";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/**
 * 회원 조회 실패 → 화면에 띄울 한 줄.
 *
 * 401(재로그인)·403 SIGNUP_REQUIRED(가입 화면)는 apiFetch가 이미 리다이렉트까지 끝내므로
 * 여기서 다루지 않는다. 남은 403은 **권한 부족**이다 — 회원 API는 조회까지 MEMBER_MANAGE로
 * 막혀 있어(서버 #76) 가입한 회원도 권한이 없으면 명부를 못 본다. 국장(OPERATOR)이 이 문장을
 * 보는 것은 정상이며 근거는 entities/session/model/types.ts의 CAPABILITY 주석에 있다.
 *
 * 알 수 없는 코드는 서버 메시지를 그대로 보여 준다 — 임의로 뭉개면 원인을 알려주려고 서버가
 * 내려보낸 문장이 사라진다.
 */
export function toMemberErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "회원 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    /*
     * 상태(403)가 아니라 코드로 본다(#29). 403에는 미가입(SIGNUP_REQUIRED)도 실려 오는데
     * 그쪽은 apiFetch가 이미 가입 화면으로 보낸 뒤라, 상태로만 보면 여기 문장이 잘못 뜬다.
     */
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "회원 명부를 볼 권한이 없습니다 — 회원 관리(MEMBER_MANAGE) 권한이 필요합니다";
    case MEMBER_ERROR.INVALID_CODE_VALUE:
      return "등급·상태·정렬 값이 서버 기준 코드와 다릅니다. 화면을 새로고침해주세요";
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}

/**
 * 회원 정보 저장 실패 → 폼 아래 띄울 한 줄 (PATCH /v1/members/{memberId} · #47 · 서버 #77).
 *
 * 조회용 문구(`toMemberErrorMessage`)를 그대로 쓰지 않는 것은 저장에서만 나오는 코드가 있고,
 * "불러오지 못했습니다"가 저장 실패에는 거짓이기 때문이다.
 *
 * **400 `VALIDATION_FAILED`는 서버 메시지를 그대로 보여 준다.** 이 코드가 오는 대표적인 경우가
 * 재학 회원의 학과·학년 누락인데(서버 `AcademicProfilePolicy`), 화면이 같은 규칙을 먼저 거르므로
 * 여기까지 왔다는 것은 화면의 판정과 서버의 판정이 갈렸다는 뜻이다 — 그때 화면이 지어낸 문장을
 * 보여 주면 실제 거절 사유가 사라진다. 길이·범위 위반(@Size·@Min)도 이 자리로 온다.
 *
 * 404는 저장 직전에 회원이 사라진 경우다. 다시 시도해도 결과가 같으므로 목록으로 보낸다.
 */
export function toMemberSaveErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "회원 정보를 저장하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case MEMBER_ERROR.MEMBER_NOT_FOUND:
      return "회원을 찾을 수 없습니다 — 이미 삭제되었거나 잘못된 주소입니다";
    case MEMBER_ERROR.VALIDATION_FAILED:
      // 서버 문장을 그대로 옮긴다 (위 주석)
      return error.message;
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "회원 정보를 수정할 권한이 없습니다 — 회원 관리(MEMBER_MANAGE) 권한이 필요합니다";
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없어 저장하지 못했습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}

/**
 * 내 프로필 저장 실패 → 내 계정 화면에 띄울 한 줄 (PATCH /v1/members/me · #47).
 *
 * 운영진 경로와 **403 문장만** 갈린다. 본인 수정은 권한 코드를 요구하지 않으므로(인증 + 가입)
 * "MEMBER_MANAGE 권한이 필요합니다"는 이 화면에서 거짓이고, 자기 이름을 고치려던 사람이
 * 자기 권한을 의심하게 된다. 여기서 403이 뜰 수 있는 경우는 사실상 미가입(SIGNUP_REQUIRED)
 * 뿐인데 그쪽은 apiFetch가 이미 가입 화면으로 보낸 뒤다 — 담당자 후보 조회가 같은 자리에서
 * 같은 판단을 했다.
 */
export function toMyProfileSaveErrorMessage(error: unknown): string {
  if (
    error instanceof ApiError &&
    (error.code === API_ERROR.FORBIDDEN || error.code === API_ERROR.ACCESS_DENIED)
  ) {
    return "프로필을 저장하지 못했습니다. 다시 로그인한 뒤 시도해주세요";
  }
  return toMemberSaveErrorMessage(error);
}

/**
 * 등급·상태 변경 실패 → 변경 시트 안에 띄울 한 줄 (#48 · 서버 #78).
 *
 * 시트가 사라지기 전에 그 자리에서 보여 준다 — 토스트로 알리면 사용자가 방금 고른 값과 거절
 * 사유를 나란히 볼 수 없고, 문장이 사라진 뒤에는 다시 볼 길도 없다.
 *
 * ── 왜 저장용 문구(`toMemberSaveErrorMessage`)를 그대로 쓰지 않는가 ──
 * 이 경로에만 `NO_CHANGE`가 있다. 값이 잘못된 것이 아니라 **바뀐 것이 없다**는 뜻이라 다른
 * 문장이어야 한다. 시트는 같은 값이면 버튼을 잠가 이 코드가 오지 않게 하지만, 다른 사람이
 * 그 사이에 같은 값으로 바꿔 두면 화면이 아는 현재 값이 낡아 여기까지 온다.
 *
 * `VALIDATION_FAILED`는 서버 문장을 그대로 옮긴다. 이 코드가 오는 경우가 셋(미래 적용 일자 ·
 * 종료 예정일을 허용하지 않는 상태 · 적용 일자보다 앞선 종료 예정일)인데 화면이 셋을 다시
 * 구분해 문장을 지어내면, 서버가 규칙을 하나 더 늘렸을 때 엉뚱한 안내가 뜬다.
 */
export function toMemberChangeErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "등급·상태를 변경하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case MEMBER_ERROR.NO_CHANGE:
      return "이미 같은 값입니다 — 변경할 내용이 없습니다";
    case MEMBER_ERROR.MEMBER_NOT_FOUND:
      return "회원을 찾을 수 없습니다 — 이미 삭제되었거나 잘못된 주소입니다";
    case MEMBER_ERROR.INVALID_CODE_VALUE:
      return "선택한 등급·상태가 서버 기준 코드와 다릅니다. 화면을 새로고침해주세요";
    case MEMBER_ERROR.VALIDATION_FAILED:
      // 서버 문장을 그대로 옮긴다 (위 주석)
      return error.message;
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "등급·상태를 변경할 권한이 없습니다 — 회원 관리(MEMBER_MANAGE) 권한이 필요합니다";
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없어 변경하지 못했습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}

/**
 * 회원 역할 조회·부여·종료 실패 → 역할 카드·시트에 띄울 한 줄 (#50 · 서버 #81).
 *
 * ── 왜 회원 문구를 그대로 쓰지 않는가 ────────────────────────────
 * **403의 뜻이 다르다.** 이 API는 조회까지 `ROLE_MANAGE`를 요구하는데(`MEMBER_MANAGE`가
 * 아니다) 회원용 문구는 "회원 관리(MEMBER_MANAGE) 권한이 필요합니다"라고 말한다 — 회원
 * 명부를 멀쩡히 보고 있는 사람에게 그 문장을 보여 주면, 이미 가진 권한을 다시 요청하러
 * 가게 된다. 어느 권한이 없어 막혔는지가 문장에 있어야 한다.
 *
 * ── 자기 잠금은 실패가 아니라 방어다 ────────────────────────────
 * 409 `CANNOT_REVOKE_OWN_ROLE_MANAGE`는 값이 잘못됐거나 서버가 아픈 것이 아니라 **막아 준
 * 것**이다. 마지막 `ROLE_MANAGE` 보유자가 자기 역할을 끝내면 아무도 되돌릴 수 없는 상태가
 * 되므로(VR-M13), 문장도 "실패했다"가 아니라 무엇을 막았는지를 말한다.
 *
 * 400 `VALIDATION_FAILED`(서버 enum `ROLE_PERIOD_INVALID`)는 이 API에서 오는 경우가 사실상
 * 하나뿐이라 화면 문장으로 바꾼다 — 여기까지 왔다는 것은 화면이 먼저 걸러야 할 날짜가
 * 새어 나갔다는 뜻이고, 서버 문장은 어느 칸을 고쳐야 하는지를 짚어 주지 못한다.
 */
export function toMemberRoleErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "역할을 처리하지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case MEMBER_ROLE_ERROR.CANNOT_REVOKE_OWN_ROLE_MANAGE:
      return "스스로를 잠그는 조작이라 막았습니다 — 자신의 권한 관리(ROLE_MANAGE) 역할은 직접 끝낼 수 없습니다. 다른 운영진에게 요청해주세요";
    case MEMBER_ROLE_ERROR.ROLE_ALREADY_ASSIGNED:
      return "이미 같은 기간에 부여된 역할입니다 — 겹치지 않는 시작일을 고르거나 기존 배정을 먼저 종료해주세요";
    case MEMBER_ROLE_ERROR.ROLE_PERIOD_INVALID:
      return "종료일은 시작일보다 이를 수 없습니다";
    case MEMBER_ROLE_ERROR.ASSIGNMENT_NOT_FOUND:
      return "역할 배정을 찾을 수 없습니다 — 다른 곳에서 이미 바뀌었을 수 있어 목록을 다시 불러옵니다";
    case MEMBER_ROLE_ERROR.ROLE_NOT_FOUND:
      return "없는 역할입니다 — 역할 목록이 낡았습니다. 화면을 새로고침해주세요";
    case MEMBER_ROLE_ERROR.MEMBER_NOT_FOUND:
      return "회원을 찾을 수 없습니다 — 이미 삭제되었거나 잘못된 주소입니다";
    /*
     * 이 API는 조회도 ROLE_MANAGE 로 막혀 있다(서버가 컨트롤러 클래스 전체에 걸었다). 화면은
     * 권한이 없으면 호출조차 하지 않지만, 보고 있는 사이에 회수되면 여기로 온다.
     */
    case API_ERROR.FORBIDDEN:
    case API_ERROR.ACCESS_DENIED:
      return "역할을 다룰 권한(ROLE_MANAGE)이 없습니다 — 회원 관리 권한과는 별개입니다. 운영진에게 요청해주세요";
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}

/**
 * 담당자 후보 조회 실패 → 등록 폼에 띄울 한 줄 (GET /v1/members/assignable · #53).
 *
 * `toMemberErrorMessage`를 그대로 쓰지 않는 것은 **403 문장이 이 목록에서는 거짓이기
 * 때문이다.** 담당자 후보는 인증만 요구하므로(서버 #76) "회원 관리 권한이 필요합니다"를
 * 보여 주면, 실제로는 네트워크·서버 문제인데 사용자가 자기 권한을 의심하게 된다. 여기서
 * 403이 뜰 수 있는 경우는 사실상 미가입(SIGNUP_REQUIRED)뿐인데 그쪽은 apiFetch가 이미
 * 가입 화면으로 보낸 뒤다.
 *
 * 첫 문장이 "담당자"인 것은 이 조회가 실패하면 등록 자체가 막히기 때문이다 — 무엇을 못
 * 골라서 버튼이 잠겼는지가 문장에 있어야 한다.
 */
export function toAssignableMemberErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "담당자 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요";
  }

  switch (error.code) {
    case API_ERROR.CONFIG_MISSING:
      return "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없어 담당자 목록을 받지 못했습니다. 잠시 후 다시 시도해주세요";
    default:
      return error.message;
  }
}
