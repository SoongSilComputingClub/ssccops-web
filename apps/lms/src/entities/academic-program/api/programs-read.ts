import { apiFetchAuthedList } from "@/shared/api/authed-client";
import { toQuery } from "@/shared/api/client";
import type { AcademicProgramSummary, AcdmActvSttsCd } from "../model/types";

export { ACADEMIC_PROGRAM_LIST_ERROR } from "./error-codes";

/*
 * 학술 활동 목록 조회 (#126 · ssccops-server#131 · GET /v1/academic-programs) — 서버 전용.
 *
 * ── 왜 lms에 처음 붙는가 ────────────────────────────────────
 * 스터디장 대시보드(`/studio`)가 "내 활동 1건"을 그려야 하는데, lms에는 지금까지 활동 목록
 * 조회가 없었다(#131 팀원 관리는 활동을 `?programId=` 주소로 받았다). `mine=leader`로 내가
 * 스터디장/팀장인 활동만 받는다 — 어드민은 전체를 받아 국장이 감독하지만 이 앱은 본인
 * 활동만 본다.
 *
 * ── `mine`은 역할 표기다 (ssccops-server#215) ──────────────────
 * `mine=leader`(스터디장/팀장 본인 — 응답의 `isLeader`가 참인 집합과 같다) ·
 * `mine=proposer`(기획안 제출자) · `mine=true`(둘의 합집합) · 없음·빈 값·`false`(필터 없음).
 * 그 밖의 표기는 400 `INVALID_CODE_VALUE`다. **이 앱은 리더 전용 화면만 그리므로 언제나
 * `leader`를 보낸다** — `true`로 받으면 "기획안만 낸 활동"이 섞여 들어와 목록에는 뜨는데
 * 조작이 403이 되는 자리가 생긴다(어드민의 "내 활동만" 필터는 반대로 국장이 관여한 활동
 * 전부를 봐야 해서 `true`가 맞다 · #241).
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
 * GET /v1/academic-programs?mine=leader — 내가 스터디장/팀장인 활동 전부.
 *
 * 커서 페이징이라 `page` 봉투가 필요해 `apiFetchAuthedList`를 쓴다. 스터디장이 맡는 활동은
 * 대개 한두 건이라 마지막 페이지까지 이어 받아 배열 하나로 돌려준다. 정렬은 서버 기본
 * (등록 최신순 -createdAt)을 쓴다 — 대시보드는 그중 진행 중 활동 하나를 골라 그린다.
 *
 * **`leader`이지 `true`가 아니다** (#241 · ssccops-server#215). `true`는 기획안 제출자까지
 * 주는데 이 목록을 쓰는 자리는 전부 리더 전용 조작 화면이다 — 활동 선택 드롭다운
 * (`resolve-program`)과 대시보드 대상 고르기(`load-leader-dashboard`)가 `isLeader`를 보지
 * 않으므로, `true`로 받으면 제출만 한 활동이 선택돼 화면은 뜨는데 조작이 403이 된다.
 * 서버가 필터로 답하면 그 행이 애초에 오지 않는다.
 *
 * **`academicProgramId`로 중복을 제거한다.** 서버가 조인(스터디장 + 팀원 참가)에서 같은
 * 활동을 두 행으로 내려주는 경우가 있어(#192에서 활동 선택 드롭다운이 1건인데도 떴다),
 * 첫 행만 남긴다. 서버 정렬 순서는 유지된다. (서버 목록 쿼리의 조인은
 * `left join fetch a.leader` 하나뿐이라 행이 늘어날 구조가 아니다 — #192의 원인은 다른 데
 * 있었을 수 있어 근거를 확인할 자리로 남겨 둔다 · #241.)
 */
export async function fetchMyAcademicPrograms(): Promise<AcademicProgramSummary[]> {
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

/**
 * 지금 로그인한 사람이 **스터디장/팀장으로 지정된 활동이 하나라도 있는가** (#224 · #241).
 *
 * 상단 바 목차를 역할별로 가르는 판정 하나에만 쓴다(`app/layout.tsx`).
 *
 * ── 한 장이면 끝난다 — `mine=leader`가 그 집합이다 ──────────────
 * 서버의 `mine`은 역할 표기다(ssccops-server#215). `leader`는 **스터디장/팀장 본인인 활동만**
 * 주고 그 집합은 응답의 `isLeader`가 참인 행과 같다 — 그러므로 판정은 `size=1` 한 장을 받아
 * **행이 있는가**를 보면 끝이다.
 *
 * #224가 못 박았던 "`size=1` 금지"는 여기서 성립하지 않는다. 그 금지의 근거는 `mine=true`가
 * 기획안 제출자까지 함께 줘서 "첫 장이 `isLeader=false`인 제출자 행일 수 있다"는 것이었는데,
 * `mine=leader` 결과에는 제출자 행이 애초에 없다. **근거가 사라졌으므로 페이지를 넘기며
 * `isLeader`를 훑던 루프도 함께 걷어냈다** — 상단 바는 루트 레이아웃에 있어 이 조회가 모든
 * 화면 요청마다 한 번씩 붙는다.
 *
 * ── 실패를 던지지 않는다 ────────────────────────────────────
 * 이 판정은 루트 레이아웃의 상단 바 하나를 위한 것이다. 미로그인(`CLIENT_UNAUTHENTICATED`)·
 * 토큰 만료·네트워크 오류에 예외를 올리면 **헤더 하나 때문에 전 화면이 못 뜬다.** 스터디장에게
 * 메뉴가 덜 보이는 것은 새로고침으로 회복되지만 레이아웃이 던지면 회복할 화면이 없다 —
 * 그래서 어느 실패든 `false`(일반 회원 목차)로 떨어뜨린다.
 */
export async function fetchIsAcademicLeader(): Promise<boolean> {
  try {
    const query = toQuery({ mine: "leader", size: 1 });
    const page = await apiFetchAuthedList<AcademicProgramSummaryResponse>(
      `/v1/academic-programs${query}`,
    );
    return page.data.length > 0;
  } catch {
    // 위 주석 참고 — 헤더 판정 하나가 화면 전체를 막지 않게 한다
    return false;
  }
}
