export { useAuthBootstrap, fetchAuthSession } from "./model/use-auth-bootstrap";
export type { AuthBootstrap } from "./model/use-auth-bootstrap";
export { useSignup } from "./model/use-signup";
export type { Signup, SignupOutcome } from "./model/use-signup";
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
