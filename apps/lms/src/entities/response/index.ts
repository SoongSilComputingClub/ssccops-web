/*
 * 폼 응답 엔티티 배럴 (#171).
 *
 * ⚠️ **서버 전용 조회(`system-form.ts`·`my-responses.ts`·`my-response-detail.ts`)는 여기서
 * 재export 하지 않는다** — 이들은 `authed-client.ts`(→ `next/headers`)를 끌어온다. 클라이언트
 * 컴포넌트가 이 배럴로 조회 함수를 가져오면 서버 모듈이 클라 번들로 딸려 들어가 빌드가
 * 깨진다(`entities/academic-session` 배럴과 같은 규칙). 로더(`features/proposal`)가 조회
 * 파일에서 직접 임포트한다.
 *
 * 재제출(`response-submit.ts`)은 `"use client"` 모듈이라 여기서 내보내도 안전하지만, 대칭을
 * 위해 재제출 폼이 직접 임포트하게 둔다.
 *
 * 아래는 전송 계층 무의존 순수 모듈(타입·표시·코드)뿐이다.
 */

export type {
  FormResponseReviewHistory,
  MyFormResponse,
  MyFormResponseDetail,
  SystemForm,
} from "./model/types";
/* 응답 내용·문항 구성의 타입은 `@ssccops/form-renderer`가 정의한다(#152) */
export type { QitemCpstCn, RspnsCn } from "@ssccops/form-renderer";
export {
  RVW_PRCS_SE_BADGE,
  RSPNS_STTS_BADGE,
  rspnsValueText,
} from "./model/display";
export { RESPONSE_ERROR } from "./api/error-codes";
export { PROPOSAL_SYS_FORM_CD } from "./model/system-form-code";
