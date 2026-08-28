/*
 * 학술 회차 피처 배럴.
 *
 * ⚠️ **`useSubmitSession`(클라이언트 훅)은 여기서 재export 하지 않는다** — 이 배럴은 SSR 로더
 * (`loadSessionRecord`)를 재export 하고, 그 로더는 서버 전용 조회(`sessions-read.ts` →
 * `next/headers`)를 끌어온다. 클라이언트 컴포넌트가 이 배럴을 통해 훅을 가져오면 서버 모듈이
 * 클라이언트 번들로 딸려 들어가 빌드가 깨진다. 훅은
 * `@/features/academic-session/model/use-submit-session`에서 직접 임포트한다.
 *
 * 오류 문구 함수는 순수라 어디서든 안전하다.
 */

export {
  loadSessionRecord,
  type SessionRecordLoad,
} from "./model/load-session-record";

export {
  loadSessionRecordErrorMessage,
  sessionPhotoErrorMessage,
  submitSessionErrorMessage,
} from "./model/session-record-error";
