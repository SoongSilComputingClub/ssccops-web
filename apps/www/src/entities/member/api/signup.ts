import { apiFetchAuthedFromBrowser } from "@/shared/api/browser-client";
import type { SignedUpMember } from "../model/types";

/*
 * 간편 가입 (POST /v1/members/signup · ssccops-server #21).
 *
 * **세션 슬라이스와 나눠 둔다.** 저쪽(`entities/session`)은 "이 계정이 우리 서비스의 누구인가"를
 * 서버 컴포넌트에서 읽는 조회이고, 이 요청은 브라우저에서 회원을 **만든다**(가입 화면이 신청
 * 흐름 안에 임베드돼 있다 — §8-4). 한 슬라이스의 배럴에 함께 두면 서버 전용 모듈
 * (`next/headers`를 타는 세션 조회)이 클라이언트 번들로 끌려 들어와 빌드가 깨진다.
 */

/**
 * 가입 시 고를 수 있는 회원 상태.
 *
 * 기준 코드에는 휴학·탈퇴 등도 있지만 **가입 화면에서 고를 수 있는 것은 둘뿐이고**, 서버가
 * `isSignupSelectableStatus`로 나머지를 거절한다. 나머지 상태는 운영진이 바꾼다.
 */
export type SignupStatusCode = "ENROLLED" | "GRADUATED";

/**
 * 요청 본문 (ssccops-server `MemberSignupRequest`).
 *
 * 이메일·인증 계정 식별자·등급(TEMP)·가입일은 **서버가 토큰과 현재 시각으로 채우므로 여기에
 * 없다.** 클라이언트가 보낸 값을 믿고 저장하면 남의 계정으로 가입하거나 스스로 등급을 올릴 수
 * 있다 — 서버가 자리를 만들지 않은 값을 웹이 만들어 보내지 않는다.
 *
 * 선택 항목이 `?`인 것은 **빈 문자열을 보내지 않기** 위해서다. 학번은 UNIQUE 컬럼이라 빈
 * 문자열로 저장하면 두 번째 졸업 회원부터 중복으로 막힌다. 값이 없으면 키째 빼고
 * (`JSON.stringify`가 undefined 키를 지운다) 서버가 비워 두게 한다.
 */
export interface SignupRequest {
  name: string;
  phoneNumber: string;
  memberStatusCode: SignupStatusCode;
  studentNumber?: string;
  departmentName?: string;
  academicYear?: number;
}

interface MemberProfileResponse {
  memberId: number | null;
  name: string | null;
}

/** 화면이 분기에 쓰는 가입 오류 코드 */
export const SIGNUP_ERROR = {
  VALIDATION_FAILED: "VALIDATION_FAILED",
  /** 상태 코드가 기준 코드에 없다 — 재학·졸업을 다시 고르게 한다 */
  INVALID_CODE_VALUE: "INVALID_CODE_VALUE",
  /** 이 학번의 회원이 이미 명부에 있다. 대개 **본인**이다 — 오류가 아니라 갈림길이다 */
  STUDENT_NUMBER_DUPLICATED: "STUDENT_NUMBER_DUPLICATED",
  /** 이미 가입된 계정 — 중복 제출·뒤로 가기로 온다. 실패가 아니라 완료로 다룬다 */
  ALREADY_SIGNED_UP: "ALREADY_SIGNED_UP",
} as const;

/**
 * 가입 요청. 응답은 세션의 `member` 블록과 같은 모양이라 가입 직후 세션을 다시 조회하지 않고
 * 그대로 이어 쓸 수 있다(서버가 그렇게 맞춰 둔 계약이다).
 */
export async function signUp(request: SignupRequest): Promise<SignedUpMember> {
  const member = await apiFetchAuthedFromBrowser<MemberProfileResponse>(
    "/v1/members/signup",
    { method: "POST", body: JSON.stringify(request) },
  );
  return { memberId: member.memberId ?? 0, name: member.name ?? "" };
}
