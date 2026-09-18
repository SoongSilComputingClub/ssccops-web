import { apiFetchAuthedList } from "@/shared/api/authed-client";
import { toQuery } from "@/shared/api/client";
import type { AcademicProgramSummary, AcdmActvSttsCd } from "../model/types";

/*
 * 내가 이끄는 학술 활동 목록 (#518 · `GET /v1/academic-programs?mine=leader` · 서버 컴포넌트 전용).
 *
 * lms `entities/academic-program/api/programs-read.ts`의 `fetchMyAcademicPrograms`를 옮겨 왔다.
 * 이 앱에서 쓰는 자리는 `/me`의 «내가 이끄는 스터디·프로젝트» 블록 하나다 — 활동의 운영(회차·
 * 출석·팀원)은 lms가 하고, 여기서는 요약과 lms로 가는 링크만 그린다(ssccops#386).
 *
 * ── `mine`은 역할 표기다 (ssccops-server#215) ──────────────────
 * `mine=leader`(스터디장/팀장 본인 — 응답의 `isLeader`가 참인 집합과 같다) ·
 * `mine=proposer`(기획안 제출자) · `mine=true`(둘의 합집합). **`leader`를 보낸다** — `true`로
 * 받으면 기획안만 낸 활동이 «내가 이끄는» 블록에 섞여 든다. 팀원으로 참여한 활동을 주는
 * 표기(`mine=member`)는 서버에 없어 그 블록은 이번에 없다(ssccops#386에 «API 필요»로 남긴다).
 *
 * ── 서버 전용이다 — 배럴에서 재export 하지 않는다 ─────────────
 * `apiFetchAuthedList`가 `next/headers`(쿠키)를 타므로 서버 컴포넌트가 경로로 직접 임포트한다
 * (`entities/form`의 SSR 조회와 같은 규칙 — 그쪽 `index.ts` 주석).
 */

/* ── 서버 응답(Response DTO) ────────────────────────────────── */

interface AcademicProgramSummaryResponse {
  academicProgramId: number;
  eventId: number;
  title: string | null;
  typeCd: string;
  sttsCd: AcdmActvSttsCd;
  leadrMbrNm: string | null;
  eventBgngDt: string | null;
  eventEndDt: string | null;
  progressRatio: number | null;
  isLeader: boolean;
}

/* ── 응답 → 도메인 ─────────────────────────────────────────── */

/** DECIMAL — 서버는 70.00처럼 내려준다. 값이 없으면 0 */
function toRatio(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toSummary(res: AcademicProgramSummaryResponse): AcademicProgramSummary {
  return {
    academicProgramId: res.academicProgramId,
    eventId: res.eventId,
    // 빈 제목을 "-"로 채우는 것은 표시 규칙이라 뷰가 정한다 — 변환기는 "값이 없다"만 남긴다
    title: res.title ?? "",
    typeCd: res.typeCd,
    sttsCd: res.sttsCd,
    leaderName: res.leadrMbrNm ?? null,
    eventBeginAt: res.eventBgngDt,
    eventEndAt: res.eventEndDt,
    progressRatio: toRatio(res.progressRatio),
    isLeader: res.isLeader,
  };
}

/* ── 조회 ──────────────────────────────────────────────────── */

/**
 * GET /v1/academic-programs?mine=leader — 내가 스터디장/팀장인 활동 전부.
 *
 * 커서 페이징이라 `apiFetchAuthedList`를 쓴다. 한 사람이 맡는 활동은 대개 한두 건이라 마지막
 * 페이지까지 이어 받아 배열 하나로 돌려준다. 정렬은 서버 기본(등록 최신순)이다.
 *
 * `academicProgramId`로 중복을 제거하는 것은 lms와 같은 방어다(lms #192 · #241 — 같은 활동이
 * 두 행으로 온 적이 있어 첫 행만 남긴다).
 */
export async function fetchMyLeadingPrograms(): Promise<AcademicProgramSummary[]> {
  const rows: AcademicProgramSummaryResponse[] = [];
  let cursor: string | null = null;

  for (let guard = 0; guard < 20; guard += 1) {
    const query = toQuery({ mine: "leader", size: 100, cursor: cursor ?? undefined });
    const page = await apiFetchAuthedList<AcademicProgramSummaryResponse>(
      `/v1/academic-programs${query}`,
    );
    rows.push(...page.data);
    if (!page.page?.hasNext || !page.page.nextCursor) break;
    cursor = page.page.nextCursor;
  }

  const seen = new Set<number>();
  const unique: AcademicProgramSummary[] = [];
  for (const row of rows) {
    if (seen.has(row.academicProgramId)) continue;
    seen.add(row.academicProgramId);
    unique.push(toSummary(row));
  }
  return unique;
}
