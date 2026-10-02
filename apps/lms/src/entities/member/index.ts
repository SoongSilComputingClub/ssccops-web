/*
 * lms 회원 슬라이스 (#742) — 팀원 추가 시트가 고를 회원 목록 하나뿐이다.
 *
 * 전부 브라우저에서 쓰는 모듈이라(`api/assignable.ts`는 `browser-client`) 클라이언트 컴포넌트가
 * 이 배럴에서 그대로 가져가도 된다 — `entities/academic-program` 배럴과 달리 서버 전용 조회를
 * 품지 않는다.
 */
export type { AssignableMember } from "./model/types";
export { assignableMemberMeta } from "./model/display";
export { fetchAssignableMembers } from "./api/assignable";
