import { apiFetchAuthedFromBrowser } from "@/shared/api/browser-client";
import type { SignedUpMember } from "../model/types";

/*
 * 이관 회원 계정 연결 (POST /v1/members/link · ssccops-server #86 · ssccops#78 A안).
 *
 * ── 왜 이 앱에도 있는가 ────────────────────────────────────────
 * 어드민에 같은 호출이 있지만(`apps/admin/src/entities/session/api/link.ts`) 그쪽으로 넘기는
 * 것이 바로 이 이슈가 없애는 왕복이다. 명부에 있는 사람이 신청하러 와서 학번 중복으로 막히면
 * 지금까지는 어드민에서 다시 로그인하고 연결한 뒤 신청서로 돌아와야 했다 — 같은 화면이
 * "다른 화면으로 이동하지 않습니다"라고 적어 두고 그 사람만 예외로 두던 자리다.
 *
 * ── 가입 전에 부를 수 있는 유일한 회원 API다 ───────────────────
 * 서버가 `@CurrentMember`(가입한 회원)가 아니라 인증 주체를 직접 받는다. 아직 회원 행이 없는
 * 사람이 부르는 경로이기 때문이다 — 그래서 403 SIGNUP_REQUIRED로 튕기지 않는다.
 * `@RequireAuthority`도 없다(`MemberLinkController` 주석) — 명부에 있는 본인이 자기 계정을
 * 붙이는 일이라 권한으로 막을 대상이 아니고, 그 자리를 3종 일치와 시도 횟수 제한이 대신한다.
 * 필요한 것은 로그인뿐인데 이 화면은 이미 구글 로그인을 마친 뒤에 그려진다.
 *
 * ── 왜 세션이 아니라 member 슬라이스인가 ───────────────────────
 * 이 앱의 `entities/session`은 서버 컴포넌트가 쿠키로 읽는 조회다(`next/headers`를 탄다).
 * 연결은 브라우저에서 일어나므로 여기에 두면 서버 전용 모듈이 클라이언트 번들로 끌려 들어와
 * 빌드가 깨진다 — 가입(`api/signup.ts`)을 세션 슬라이스와 나눠 둔 것과 같은 이유다.
 */

/**
 * 연결 요청 본문 (서버 `MemberLinkRequest`).
 *
 * 필드명이 가입 요청(`name`·`phoneNumber`·`studentNumber`)과 다른 것은 **서버 계약이 그렇기
 * 때문이다.** 보기 좋으라고 맞춰 적으면 서버가 세 필드를 모두 못 읽어 언제나 404
 * `MEMBER_LINK_FAILED`가 되는데, 화면에는 "일치하는 회원이 없습니다"로만 보여 원인을 짚기까지
 * 오래 걸리는 종류의 실패다.
 *
 * 세 값 모두 필수다. 하나라도 비면 연결 후보를 좁힐 수 없어 서버가 400으로 거절한다.
 */
export interface MemberLinkRequest {
  /** 학생_번호V20 */
  stdntNo: string;
  /** 회원_명V50 — 서버가 앞뒤 공백을 제거하고 비교한다 */
  mbrNm: string;
  /** 전화번호V20 — 서버가 숫자만 남겨 비교하므로 하이픈 유무를 가리지 않는다 */
  telno: string;
}

/** 서버 응답 — 가입(`/v1/members/signup`)·세션 조회와 같은 `MemberProfileResponse`다 */
interface MemberProfileResponse {
  memberId: number | null;
  name: string | null;
}

/**
 * 연결 API가 돌려주는 오류 코드 (서버 `MemberLinkErrorCode`).
 *
 * **어느 항목이 틀렸는지는 어느 코드에도 실려 오지 않는다.** 서버가 일부러 알려주지 않는
 * 것이고(VR-M23), 세 값 중 무엇이 맞았는지 되돌려 주면 이 화면이 곧 명부 조회 도구가 된다 —
 * 학번 하나만 바꿔 가며 두드리면 남의 이름·연락처를 맞혀 볼 수 있다. 화면도 같은 이유로
 * 항목별 오류를 그리지 않는다(`features/signup/model/link-form.ts`).
 */
export const MEMBER_LINK_ERROR = {
  /** 세 값과 모두 일치하는 회원이 없다 (404) */
  MEMBER_LINK_FAILED: "MEMBER_LINK_FAILED",
  /** 그 회원은 이미 다른 소셜 계정과 연결돼 있다 (409) */
  MEMBER_ALREADY_LINKED: "MEMBER_ALREADY_LINKED",
  /** 이미 가입을 마친 계정이 연결을 시도했다 (409) — 실패가 아니라 이미 끝난 일이다 */
  ALREADY_SIGNED_UP: "ALREADY_SIGNED_UP",
  /** 시도 횟수 초과 (429) — 위 무차별 대입을 막는 장치다 */
  TOO_MANY_LINK_ATTEMPTS: "TOO_MANY_LINK_ATTEMPTS",
} as const;

/**
 * 명부에 이미 있는(CSV로 이관된) 회원에 지금 로그인한 계정을 붙인다.
 *
 * 가입(`signUp`)과 **결과가 다르다.** 가입은 임시회원 행을 새로 만들지만 연결은 기존 행을
 * 그대로 쓴다 — 이관된 기수·등급·역할이 그대로 유지된다.
 *
 * 응답은 가입과 **같은 모양**(세션의 `member` 블록)이라 연결 직후 세션을 다시 조회하지 않는다.
 * 서버가 그렇게 맞춰 둔 계약이고, 가입 경로가 이미 그 계약 위에서 돈다.
 */
export async function linkExistingMember(
  request: MemberLinkRequest,
): Promise<SignedUpMember> {
  const member = await apiFetchAuthedFromBrowser<MemberProfileResponse>(
    "/v1/members/link",
    { method: "POST", body: JSON.stringify(request) },
  );
  return { memberId: member.memberId ?? 0, name: member.name ?? "" };
}
