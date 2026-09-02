export { useAuthBootstrap } from "./model/use-auth-bootstrap";
export type { AuthBootstrap } from "./model/use-auth-bootstrap";
/* 조회 자체는 entities/session이 갖는다 — 기존 호출부가 바뀌지 않도록 여기서 그대로 재노출한다 */
export { fetchAuthSession } from "@/entities/session";
export { useCan } from "./model/use-can";
export { useSignup } from "./model/use-signup";
export type { Signup, SignupOutcome } from "./model/use-signup";
export { useMemberLink } from "./model/use-member-link";
export type { MemberLink, MemberLinkOutcome } from "./model/use-member-link";
export {
  EMPTY_MEMBER_LINK_VALUES,
  buildMemberLinkRequest,
  hasMemberLinkErrors,
  setMemberLinkDraft,
  takeMemberLinkDraft,
  toMemberLinkFailure,
  validateMemberLink,
} from "./model/link-form";
export type {
  MemberLinkField,
  MemberLinkFieldErrors,
  MemberLinkFailure,
  MemberLinkFormValues,
} from "./model/link-form";
export {
  EMPTY_SIGNUP_VALUES,
  SIGNUP_ERROR,
  buildSignupRequest,
  hasErrors,
  normalizePhoneNumber,
  requiresAcademicInfo,
  toSignupFailure,
  validateSignup,
} from "./model/signup-form";
export type {
  SignupField,
  SignupFieldErrors,
  SignupFailure,
  SignupFormValues,
  SignupRequest,
  SignupStatusCode,
} from "./model/signup-form";
export { AuthGate } from "./ui/auth-gate";
export { SignupGate } from "./ui/signup-gate";
