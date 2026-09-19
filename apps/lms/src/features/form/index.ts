/*
 * 모집 폼 기능 슬라이스 배럴 (#528).
 *
 * **SSR 로더(`load-recruitments`·`load-recruitment-form`)를 재export 하지 않는다** — 둘 다
 * `next/headers`를 타는 조회를 거치므로, 클라이언트 컴포넌트가 배럴에서 무엇이든 가져오면
 * 서버 모듈이 클라 번들로 끌려와 빌드가 깨진다(#128·#171이 세운 규칙). SSR 페이지가
 * `features/form/model/load-*`에서 직접 임포트한다.
 *
 * 같은 이유로 저장 훅(`useSaveRecruitmentForm`)도 여기 없다 — 클라 폼이
 * `features/form/model/use-save-recruitment-form`에서 직접 가져온다.
 */
export { QitemComposer } from "./ui/qitem-composer";
export { validateQitemCpst } from "./model/qitem-validation";
export type { QitemCpstContext, QitemCpstIssues } from "./model/qitem-validation";
export {
  toRecruitmentFormErrorMessage,
  toRecruitmentFormSaveErrorMessage,
} from "./model/recruitment-form-error";
