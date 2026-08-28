import { apiFetchAuthed, apiFetchAuthedList } from "@/shared/api/authed-client";
import { toQuery } from "@/shared/api/client";
import type {
  AcademicSessionDetail,
  AcademicSessionSummary,
  AcademicSessionSummaryFilter,
  CurriculumItemWithSession,
} from "../model/types";
import {
  toCurriculumItem,
  toSessionDetail,
  toSessionSummary,
  type CurriculumItemWithSessionResponse,
  type SessionDetailResponse,
  type SessionSummaryResponse,
} from "./response-mapping";

/*
 * 회차 기록·커리큘럼 **조회** (#128 · ssccops-server#134·#135).
 *
 * ── 서버 전용이다 — 배럴에서 재export 하지 않는다 ─────────────
 * `apiFetchAuthed`가 `next/headers`(쿠키)를 타므로 이 모듈은 서버 컴포넌트에서만 부를 수 있다.
 * 클라이언트 컴포넌트가 임포트하면 빌드가 깨진다(www·어드민이 기대는 것과 같은 보호). 그래서
 * `entities/academic-session/index.ts`는 이 파일을 재export 하지 않고, SSR 로더
 * (`features/academic-session/model/load-session-record.ts`)가 직접 임포트한다.
 *
 * 제출·재제출(브라우저)은 옆의 `sessions-write.ts`가 맡는다. 응답 → 도메인 변환은 두 파일이
 * `response-mapping.ts`, 오류 코드는 `error-codes.ts`를 함께 쓴다(둘 다 전송 계층에 의존하지
 * 않는 순수 모듈이다).
 */

/**
 * GET /v1/academic-programs/{id}/curriculum-items — 계획 + 실적 조인 (#134).
 *
 * 회차 기록 화면은 이 목록에서 대상 커리큘럼 항목 하나를 골라 계획을 보여 주고, 그 항목의
 * `sesnSttsCd`·`isEditable`로 폼을 열지·POST/PUT 중 무엇을 쓸지 가른다. 페이징이 없다.
 */
export async function fetchCurriculumItems(
  academicProgramId: number,
): Promise<CurriculumItemWithSession[]> {
  const res = await apiFetchAuthed<CurriculumItemWithSessionResponse[] | null>(
    `/v1/academic-programs/${academicProgramId}/curriculum-items`,
  );
  return (res ?? []).map(toCurriculumItem);
}

/**
 * GET /v1/academic-programs/{id}/sessions — 그 활동의 회차 목록 (#135) — 커서 페이징.
 *
 * 출석부 화면(#172)이 표의 **열**로 쓴다. 서버가 `size`·`cursor`로 잘라 주므로, 화면이
 * "1~N회차 전체"를 한 표로 그리려면 마지막 페이지까지 이어 받아야 한다 — 그 순회를 여기서
 * 끝내고 화면에는 회차 배열 하나만 넘긴다(활동당 회차 수는 한 학기치라 상한이 낮다).
 *
 * `size`를 100으로 크게 잡아 대개 한 번에 끝나게 하고, 그래도 남으면 `nextCursor`로 잇는다.
 * 회차 수만큼 출석부를 따로 조회하는 것은 로더(`load-attendance-roster`)의 몫이다 — 이
 * 함수는 회차 목록만 책임진다.
 */
export async function fetchAcademicSessions(
  academicProgramId: number,
  filter: AcademicSessionSummaryFilter = {},
): Promise<AcademicSessionSummary[]> {
  const rows: SessionSummaryResponse[] = [];
  let cursor: string | null = null;

  // 커서 페이징 — 마지막 페이지(hasNext=false)까지 이어 받는다
  do {
    const query = toQuery({
      sesnSttsCd: filter.sesnSttsCd ?? undefined,
      size: 100,
      cursor: cursor ?? undefined,
      /*
       * 진행일 오름차순 — 표는 회차 순번대로 왼쪽→오른쪽으로 읽힌다.
       *
       * ⚠️ 표기는 서버 `SessionSortOrder`의 enum 값 그대로다(`actlYmd` / `-actlYmd` /
       * `seqno` / `-seqno`) — Spring Pageable 스타일 `필드,방향`이 아니다. `"actlYmd,asc"`로
       * 보내면 서버가 `INVALID_CODE_VALUE`("기준 코드에 없는 값입니다")로 끊는다.
       */
      sort: "actlYmd",
    });
    const page = await apiFetchAuthedList<SessionSummaryResponse>(
      `/v1/academic-programs/${academicProgramId}/sessions${query}`,
    );
    rows.push(...page.data);
    cursor = page.page?.hasNext ? page.page.nextCursor : null;
  } while (cursor !== null);

  return rows.map(toSessionSummary);
}

/**
 * GET /v1/academic-programs/{id}/sessions/{sessionId} — 회차 상세 (#135).
 *
 * 재제출 화면이 진입할 때 이전 제출 내용(진행 내용·전달사항·출석·사진·수정요청 사유)을 폼
 * 초깃값으로 채우기 위해 부른다. 인증만 요구한다.
 */
export async function fetchAcademicSession(
  academicProgramId: number,
  sessionId: number,
): Promise<AcademicSessionDetail> {
  const res = await apiFetchAuthed<SessionDetailResponse>(
    `/v1/academic-programs/${academicProgramId}/sessions/${sessionId}`,
  );
  return toSessionDetail(res);
}
