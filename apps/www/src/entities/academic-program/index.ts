export type {
  AcademicProgramSummary,
  AcdmActvSttsCd,
  ProposalAttachment,
  ProposalAttachmentList,
} from "./model/types";
export { acdmActvSttsBadge } from "./model/display";

/*
 * **SSR 전용 조회는 이 배럴에 두지 않는다** — `entities/form/index.ts`와 같은 규칙.
 * `fetchMyLeadingPrograms`는 `apiFetchAuthedList`(→ `next/headers`)를 타므로 서버 컴포넌트가
 * 경로로 직접 가져간다:
 *   import { fetchMyLeadingPrograms } from "@/entities/academic-program/api/programs-read";
 *
 * 브라우저 전용 조회(`api/program-attachments.ts` · `"use client"` · web#805)도 같은 이유로 두지
 * 않는다 — 서버 컴포넌트(`/me`)가 이 배럴을 읽으므로 클라이언트 모듈을 섞지 않고, 쓰는 훅이 경로로
 * 직접 가져간다.
 */
