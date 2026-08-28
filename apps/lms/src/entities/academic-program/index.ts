/*
 * ⚠️ **서버 전용 조회(`programs-read.ts`)는 여기서 재export 하지 않는다** — `authed-client.ts`
 * (→ `next/headers`)를 끌어온다. 클라이언트 컴포넌트가 이 배럴로 가져가면 서버 모듈이 클라
 * 번들로 딸려 들어가 빌드가 깨진다(`entities/academic-session` 배럴과 같은 규칙). 로더
 * (`features/academic-program`)가 조회 파일에서 직접 임포트한다.
 */

export type {
  AcademicProgramMember,
  AcademicProgramMemberFilter,
  AcademicProgramSummary,
  AcdmActvSttsCd,
  PtcpSttsCd,
} from "./model/types";

export {
  ACDM_ACTV_STTS_BADGE,
  PTCP_STTS_BADGE,
  acdmActvSttsBadge,
  memberRoleBadge,
  ptcpSttsBadge,
} from "./model/display";

export {
  ACADEMIC_PROGRAM_MEMBER_ERROR,
  fetchAcademicProgramMembers,
} from "./api/members";

// 순수 상수 모듈(전송 계층 무의존)이라 재export 해도 안전하다 — 조회 함수는 로더가 직접 임포트한다
export { ACADEMIC_PROGRAM_LIST_ERROR } from "./api/error-codes";
