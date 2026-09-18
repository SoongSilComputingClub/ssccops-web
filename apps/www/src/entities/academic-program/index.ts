export type { AcademicProgramSummary, AcdmActvSttsCd } from "./model/types";
export { acdmActvSttsBadge } from "./model/display";

/*
 * **SSR 전용 조회는 이 배럴에 두지 않는다** — `entities/form/index.ts`와 같은 규칙.
 * `fetchMyLeadingPrograms`는 `apiFetchAuthedList`(→ `next/headers`)를 타므로 서버 컴포넌트가
 * 경로로 직접 가져간다:
 *   import { fetchMyLeadingPrograms } from "@/entities/academic-program/api/programs-read";
 */
