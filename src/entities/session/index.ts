export { MEMBER_LINK_ERROR, linkExistingMember } from "./api/link";
export type { MemberLinkRequest } from "./api/link";
export { fetchAuthSession } from "./api/session";
export { syncSessionOnForbidden } from "./model/forbidden";
export { useSessionStore, representativeRole } from "./model/store";
export type { SessionStatus, SignupResultKind } from "./model/store";
export { CAPABILITY, hasCapability } from "./model/types";
export type {
  AuthSession,
  AuthUser,
  Capability,
  MemberProfile,
  MemberRole,
} from "./model/types";
