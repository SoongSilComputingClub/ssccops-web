/*
 * @ssccops/signup — 회원 가입 화면 한 벌 (ssccops-web#664).
 *
 * www의 신청 흐름(#154)과 lms의 미가입 안내(#453)가 **같은 가입 화면을 통째로 복사해** 쓰고
 * 있었다 — `signup-step.tsx` 281줄 × 2 · `member-link-step.tsx` 209줄 × 2 · `link-form.ts`
 * 187줄 × 2 · `entities/member` 한 벌 × 2. 사본을 두면 갈린 것을 타입도 린트도 못 잡고, 가입은
 * 되돌릴 수 없는 쓰기라 한쪽만 고쳐진 채 도는 것이 가장 곤란하다(«둘 이상» 규칙 ·
 * `packages/ui/AGENTS.md`). 화면·문구·동작은 그대로 두고 **구현만 한 벌로** 만든 것이다.
 *
 * ── 여기 있는 것 ────────────────────────────────────────────
 * 가입 폼 화면(`SignupStep`)과 그 안의 기존 회원 연결(`MemberLinkStep`) · 폼 값·검증·요청
 * 변환 · 서버 오류 코드 → 화면 처리 · 회원 가입/연결 API(`POST /v1/members/signup`·`/link`).
 *
 * ── 여기 없는 것 ────────────────────────────────────────────
 * **전송 계층.** 토큰을 어디서 꺼내는지, 401을 리다이렉트로 끝내는지는 앱마다 다르므로
 * (루트 `AGENTS.md` «인증») 인증 호출 함수 하나를 `apiFetch` prop으로 받는다. 가입이 끝난 뒤
 * 어디로 가는지도 모른다 — `onSignedUp` 한 줄로 알리고 부모가 정한다(www는 신청서, lms는
 * `router.refresh()`). 미가입 안내 문구·펼침 버튼도 앱에 남는다(lms `SignupRequiredNotice`).
 *
 * 어드민(`apps/admin`)은 쓰지 않는다 — 가입 화면이 리다이렉트로 서고 오류를 그리는 부품도
 * 달라 «감싸고 있는 것이 전부 다르다»(`model/link-form.ts` 머리 주석).
 */

export type { AuthedApiFetch } from "./model/api-failure";
export type { SignedUpMember } from "./model/types";
export type { SignupRequest, SignupStatusCode } from "./model/signup-api";
export { SIGNUP_ERROR, signUp } from "./model/signup-api";
export type { MemberLinkRequest } from "./model/link-api";
export { MEMBER_LINK_ERROR, linkExistingMember } from "./model/link-api";
export type { SignupStepProps } from "./ui/signup-step";
export { SignupStep } from "./ui/signup-step";
export { MemberLinkStep } from "./ui/member-link-step";
