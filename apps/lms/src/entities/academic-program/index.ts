/*
 * ⚠️ **서버 전용 조회(`programs-read.ts`)는 여기서 재export 하지 않는다** — `authed-client.ts`
 * (→ `next/headers`)를 끌어온다. 클라이언트 컴포넌트가 이 배럴로 가져가면 서버 모듈이 클라
 * 번들로 딸려 들어가 빌드가 깨진다(`entities/academic-session` 배럴과 같은 규칙). 로더
 * (`features/academic-program`)가 조회 파일에서 직접 임포트한다.
 */

export type {
  AcademicProgramMember,
  AcademicProgramMemberFilter,
  AcademicProgramMemberHistory,
  AcademicProgramSummary,
  AcdmActvSttsCd,
  FormReceiptStatus,
  PtcpSttsCd,
} from "./model/types";

export {
  PTCP_STTS_BADGE,
  acdmActvSttsBadge,
  acdmActvTypeNm,
  memberRoleBadge,
  programStopOf,
  ptcpSttsBadge,
  type ProgramStop,
} from "./model/display";

export { fetchAcademicProgramMembers } from "./api/members";

// 순수 상수 모듈(전송 계층 무의존)이라 재export 해도 안전하다 — 조회 함수는 로더가 직접 임포트한다
export { ACADEMIC_PROGRAM_LIST_ERROR, ACADEMIC_PROGRAM_MEMBER_ERROR } from "./api/error-codes";
/*
 * 팀원 추가·상태 변경·이력(`api/members-write.ts` · #742)은 재export 하지 않는다 — 브라우저 전용
 * 모듈이라 클라이언트 컴포넌트가 직접 임포트한다. 이 배럴은 위의 `fetchAcademicProgramMembers`
 * (→ `next/headers`)를 품고 있어, **클라이언트 컴포넌트는 이 배럴에서 값을 가져가지 않는다**
 * (타입만 — `import type`은 번들에 남지 않는다).
 */
