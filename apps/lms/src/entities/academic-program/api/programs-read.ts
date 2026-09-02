import { apiFetchAuthedList } from "@/shared/api/authed-client";
import { toQuery } from "@/shared/api/client";
import type { AcademicProgramSummary, AcdmActvSttsCd } from "../model/types";

export { ACADEMIC_PROGRAM_LIST_ERROR } from "./error-codes";

/*
 * 학술 활동 목록 조회 (#126 · ssccops-server#131 · GET /v1/academic-programs) — 서버 전용.
 *
 * ── 왜 lms에 처음 붙는가 ────────────────────────────────────
 * 스터디장 대시보드(`/studio`)가 "내 활동 1건"을 그려야 하는데, lms에는 지금까지 활동 목록
 * 조회가 없었다(#131 팀원 관리는 활동을 `?programId=` 주소로 받았다). `mine=true`로 내가
 * 스터디장/팀장인 활동만 받는다 — 어드민은 전체를 받아 국장이 감독하지만 이 앱은 본인
 * 활동만 본다.
 *
 * ── 서버 전용이다 — 배럴에서 재export 하지 않는다 ─────────────
 * `apiFetchAuthedList`가 `next/headers`(쿠키)를 타므로 이 모듈은 서버 컴포넌트에서만 부를 수
 * 있다. 로더(`features/academic-program/model/load-leader-dashboard.ts`)가 직접 임포트한다
 * (`entities/academic-session` 배럴과 같은 규칙).
 *
 * ── 인가: 인증만 ────────────────────────────────────────────
 * 조회는 `@RequireAuthority` 없이 로그인만 요구한다(전이만 `ACADEMIC_PROGRAM_MANAGE`). 없는
 * 커서·정렬은 400 `VALIDATION_FAILED`.
 *
 * 일시는 서버가 Asia/Seoul 오프셋을 붙여 내려준다("2026-03-01T00:00:00+09:00").
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
 * GET /v1/academic-programs?mine=true — 내가 스터디장/팀장인 활동 전부.
 *
 * 커서 페이징이라 `page` 봉투가 필요해 `apiFetchAuthedList`를 쓴다. 스터디장이 맡는 활동은
 * 대개 한두 건이라 마지막 페이지까지 이어 받아 배열 하나로 돌려준다. 정렬은 서버 기본
 * (등록 최신순 -createdAt)을 쓴다 — 대시보드는 그중 진행 중 활동 하나를 골라 그린다.
 *
 * **`academicProgramId`로 중복을 제거한다.** 서버가 조인(스터디장 + 팀원 참가)에서 같은
 * 활동을 두 행으로 내려주는 경우가 있어(#192에서 활동 선택 드롭다운이 1건인데도 떴다),
 * 첫 행만 남긴다. 서버 정렬 순서는 유지된다.
 */
export async function fetchMyAcademicPrograms(): Promise<AcademicProgramSummary[]> {
  const rows: AcademicProgramSummaryResponse[] = [];
  let cursor: string | null = null;

  for (let guard = 0; guard < 20; guard += 1) {
    const query = toQuery({ mine: "true", size: 100, cursor: cursor ?? undefined });
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

/**
 * 지금 로그인한 사람이 **스터디장/팀장으로 지정된 활동이 하나라도 있는가** (#224).
 *
 * 상단 바 목차를 역할별로 가르는 판정 하나에만 쓴다(`app/layout.tsx`).
 *
 * ── `isLeader`로 거른다 — 목록이 비었는지가 아니다 ──────────────
 * 서버의 `mine` 필터는 `(l.id = :mineId or a.proposer.id = :mineId)`다
 * (`AcademicProgramRepositoryImpl`) — **스터디장 OR 기획안 제출자**를 함께 준다. 반면
 * `isLeader`는 리더 본인일 때만 참이다(`AcademicProgramSummaryResponse.of`). 그래서
 * **기획안을 내서 활동이 만들어졌지만 스터디장으로는 지정되지 않은 회원**은 이 목록이
 * 비어 있지 않으면서 `isLeader`는 전부 false다 — 목록 길이로 판정하면 그 사람에게
 * 스터디장 메뉴가 통째로 열려 #224가 고치려는 증상이 그대로 남는다.
 *
 * 같은 이유로 `size=1`로 한 장만 받아 판정하지 않는다. 정렬이 등록 최신순이라 첫 장이
 * `isLeader=false`인 제출자 행일 수 있다 — 참인 행을 만날 때까지 페이지를 넘기고, 만나면
 * 즉시 멈춘다(맡는 활동이 한두 건이라 대개 첫 페이지에서 끝난다).
 *
 * ── 실패를 던지지 않는다 ────────────────────────────────────
 * 이 판정은 루트 레이아웃의 상단 바 하나를 위한 것이다. 미로그인(`CLIENT_UNAUTHENTICATED`)·
 * 토큰 만료·네트워크 오류에 예외를 올리면 **헤더 하나 때문에 전 화면이 못 뜬다.** 스터디장에게
 * 메뉴가 덜 보이는 것은 새로고침으로 회복되지만 레이아웃이 던지면 회복할 화면이 없다 —
 * 그래서 어느 실패든 `false`(일반 회원 목차)로 떨어뜨린다.
 */
export async function fetchIsAcademicLeader(): Promise<boolean> {
  let cursor: string | null = null;

  try {
    for (let guard = 0; guard < 20; guard += 1) {
      const query = toQuery({ mine: "true", size: 100, cursor: cursor ?? undefined });
      const page = await apiFetchAuthedList<AcademicProgramSummaryResponse>(
        `/v1/academic-programs${query}`,
      );
      if (page.data.some((row) => row.isLeader)) return true;
      if (!page.page?.hasNext || !page.page.nextCursor) break;
      cursor = page.page.nextCursor;
    }
  } catch {
    // 위 주석 참고 — 헤더 판정 하나가 화면 전체를 막지 않게 한다
    return false;
  }

  return false;
}
