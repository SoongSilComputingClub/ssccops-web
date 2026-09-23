/**
 * 가입이 끝난 회원 — 가입 요청의 응답이자, 세션의 `member` 블록과 같은 모양이다.
 *
 * 앱의 세션 타입(`AuthMember`)과 필드가 같지만 **가져다 쓰지 않는다.** 두 타입이 답하는 질문이
 * 다르다 — 저쪽은 "지금 이 세션은 누구인가", 이쪽은 "방금 만든 회원은 누구인가"다. 무엇보다
 * 세션 조회는 서버 컴포넌트가 쿠키로 하는 일이라 이 패키지가 볼 자리가 아니다.
 */
export interface SignedUpMember {
  memberId: number;
  name: string;
}

/** 서버 응답 — 가입(`/v1/members/signup`)·연결(`/v1/members/link`)·세션 조회가 같은 모양이다 */
export interface MemberProfileResponse {
  memberId: number | null;
  name: string | null;
}
