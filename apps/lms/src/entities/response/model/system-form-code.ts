/*
 * 시스템 폼 코드 상수 — **순수 모듈**(전송 계층 무의존).
 *
 * `api/system-form.ts`에 두면 그 파일이 `next/headers`를 끌어와, 배럴이 이 상수 하나를
 * 재export 하려 해도 서버 모듈이 함께 딸려 온다. 코드값만 따로 뽑아 둔다.
 */

/** 기획안 폼을 가리키는 코드 — 서버 `ProposalFormSeed.SYSTEM_FORM_CODE`와 같은 문자열 */
export const PROPOSAL_SYS_FORM_CD = "PROPOSAL";
