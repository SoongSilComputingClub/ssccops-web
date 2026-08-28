import type { SesnSttsCd } from "@/shared/config/codes";
import { ApiError, apiFetch, apiFetchList } from "@/shared/lib/api/client";
import type {
  AcademicSessionAttendance,
  AcademicSessionDetail,
  AcademicSessionFileReference,
  SessionCrossListItem,
  SessionReviewFilter,
  SessionReviewListPage,
  SessionTransitionInput,
  SessionTransitionResult,
} from "../model/types";

/*
 * 회차·출석 승인 API (#129 · ssccops-server #136).
 *
 * 학술국장이 여러 활동에 걸친 SUBMITTED 회차를 한 화면에서 승인·수정요청한다. 활동 하나에
 * 종속된 조회가 아니라 **활동 횡단 조회**를 쓰는 첫 화면이라, 서버가 루트 레벨 전용 엔드포인트
 * (`GET /v1/academic-programs/reviews/sessions`)를 따로 냈다 — 활동별 호출을 병렬로 모으면
 * 활동 수만큼 N+1이 되므로 서버 이슈 #136 설계 결정 1에서 그 방식을 버렸다.
 *
 * ── 세 엔드포인트의 인가가 갈린다 ────────────────────────────
 *  - GET .../reviews/sessions          — ACADEMIC_PROGRAM_MANAGE (학술국장)
 *  - POST .../{id}/sessions/{sid}/transitions — ACADEMIC_PROGRAM_MANAGE
 *  - GET .../{id}/sessions/{sid}        — 인증만 (선택 항목 상세는 누구나)
 *
 * ── 서버가 필드명을 리네임했다 (ssccops-server#178, 2026-08-28) ─
 * URL 경로는 그대로이고 JSON 필드명만 데이터사전 표준 약어로 바뀌었다 — 옛 이름
 * (realDt·cn·noticeCn·presentYn·fileUrl 등)으로 쓰면 타입은 통과하고 값만 조용히 빈다.
 * 아래 Response 인터페이스는 리네임 이후 record 가 기준이다(#129 이슈 본문의 DTO 표기와 일치).
 *
 * 날짜는 서버가 LocalDate("2026-03-01")로 내려준다 — 일자, 일시 아님.
 */

/* ── 오류 코드 ─────────────────────────────────────────────── */

/**
 * 회차 승인 API 가 돌려주는 오류 코드 (ssccops-server AcademicProgramErrorCode).
 *
 * `@RequireAuthority` AOP 의 403 은 `"AUTHORITY_REQUIRED"`, 커서 형식 오류는
 * `"VALIDATION_FAILED"`(첫 페이지로 조용히 되돌리면 목록이 잘린 것을 알 수 없다 — 업무
 * 도메인과 같은 판단), APPROVED 회차를 다시 전이하려 하면 409 `"INVALID_SESSION_TRANSITION"`
 * 이다.
 */
export const SESSION_REVIEW_ERROR = {
  /** 없는 활동 (404) */
  ACADEMIC_PROGRAM_NOT_FOUND: "ACADEMIC_PROGRAM_NOT_FOUND",
  /** 없는 회차 (404) */
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  /** 커서 형식 오류·정렬 불일치 (400) */
  VALIDATION_FAILED: "VALIDATION_FAILED",
  /** 기준 코드에 없는 값 (400) — sttsCd·sort 파라미터가 어긋났을 때 */
  INVALID_CODE_VALUE: "INVALID_CODE_VALUE",
  /** ACADEMIC_PROGRAM_MANAGE 권한 없음 (403 · AOP) */
  AUTHORITY_REQUIRED: "AUTHORITY_REQUIRED",
  /** SUBMITTED 가 아닌 회차에 전이를 시도 (409) — APPROVED 재전이 등 */
  INVALID_SESSION_TRANSITION: "INVALID_SESSION_TRANSITION",
} as const;

/* ── 서버 응답(Response DTO) ────────────────────────────────── */

/** 활동 횡단 회차 한 줄 (SessionCrossListResponse) — reviews/sessions 와 sessions 가 공유 */
interface SessionCrossListResponse {
  sessionId: number;
  academicProgramId: number;
  academicProgramTitle: string | null;
  /** 활동 유형 코드 문자열 (STUDY·PROJECT 등). 표시명은 이 응답에 없다 */
  typeCd: string;
  seqno: number | null;
  /** 커리큘럼 항목 제목 (curriculumTtl) */
  curriculumTtl: string | null;
  /** 실제 진행일 (actlYmd — 옛 realDt). YYYY-MM-DD */
  actlYmd: string | null;
  sttsCd: SesnSttsCd;
  /** 출석 집계 — 저장하지 않는 파생값. 출석부가 빈 회차는 0/0 */
  presentCount: number;
  totalCount: number;
  /** 인증사진 참조가 있는가 — 실제 오브젝트 존재는 보장하지 않는다(서버가 PUT 을 관측하지 않는다) */
  hasFileReference: boolean;
}

interface SessionAttendanceResponse {
  eventPtcpId: number;
  mbrNm: string | null;
  atndYn: boolean;
}

interface SessionFileReferenceResponse {
  fileReferenceId: number;
  fileUrlAddr: string;
}

/** 회차 상세 (SessionDetailResponse) — GET .../{id}/sessions/{sessionId} */
interface SessionDetailResponse {
  sessionId: number;
  curriculumItemId: number;
  seqno: number | null;
  curriculumTtl: string | null;
  planYmd: string | null;
  actlYmd: string | null;
  /** 회차 진행 내용 (prgrsCn — 옛 cn) */
  prgrsCn: string | null;
  /** 전달사항 (ntcCn — 옛 noticeCn) */
  ntcCn: string | null;
  sttsCd: SesnSttsCd;
  rgtrMbrId: number | null;
  rgtrMbrNm: string | null;
  fileReference: SessionFileReferenceResponse | null;
  attendances: SessionAttendanceResponse[] | null;
  presentCount: number;
  totalCount: number;
  /** 최신 회차 승인·수정요청(acdm_actv_aprv, se_cd=SESSION)이 남긴 사유. 아직 검토 전이면 null */
  latestOpinion: string | null;
}

interface SessionTransitionResponse {
  sessionId: number | null;
  beforeSttsCd: SesnSttsCd | null;
  afterSttsCd: SesnSttsCd | null;
}

/* ── 응답 → 도메인 ─────────────────────────────────────────── */

function toCrossListItem(res: SessionCrossListResponse): SessionCrossListItem {
  return {
    sessionId: res.sessionId,
    academicProgramId: res.academicProgramId,
    // 빈 제목을 "-"로 채우는 것은 표시 규칙이라 뷰가 정한다 — 변환기는 "값이 없다"만 남긴다
    academicProgramTitle: res.academicProgramTitle ?? "",
    typeCd: res.typeCd,
    seqno: res.seqno,
    curriculumTitle: res.curriculumTtl ?? "",
    actualYmd: res.actlYmd,
    sesnSttsCd: res.sttsCd,
    presentCount: res.presentCount,
    totalCount: res.totalCount,
    hasFileReference: res.hasFileReference,
  };
}

function toAttendance(res: SessionAttendanceResponse): AcademicSessionAttendance {
  return {
    eventParticipantId: res.eventPtcpId,
    memberName: res.mbrNm ?? "",
    atndYn: res.atndYn,
  };
}

function toFileReference(
  res: SessionFileReferenceResponse | null,
): AcademicSessionFileReference | null {
  return res === null
    ? null
    : { fileReferenceId: res.fileReferenceId, fileUrlAddr: res.fileUrlAddr };
}

function toSessionDetail(res: SessionDetailResponse): AcademicSessionDetail {
  return {
    sessionId: res.sessionId,
    curriculumItemId: res.curriculumItemId,
    seqno: res.seqno,
    curriculumTitle: res.curriculumTtl ?? "",
    planYmd: res.planYmd,
    actualYmd: res.actlYmd,
    progressContent: res.prgrsCn,
    noticeContent: res.ntcCn,
    sesnSttsCd: res.sttsCd,
    registrantMemberId: res.rgtrMbrId,
    registrantMemberName: res.rgtrMbrNm ?? "",
    fileReference: toFileReference(res.fileReference),
    attendances: (res.attendances ?? []).map(toAttendance),
    presentCount: res.presentCount,
    totalCount: res.totalCount,
    latestOpinion: res.latestOpinion,
  };
}

/* ── 승인 대기 목록 (활동 횡단) ────────────────────────────── */

/**
 * GET /v1/academic-programs/reviews/sessions — 승인 대기 회차 목록 (#129 · #136).
 *
 * 여러 활동의 `SUBMITTED` 회차만 내려온다(서버가 `sttsCd=SUBMITTED` 를 고정한 특수형이다).
 * 커서 페이징이라 `page` 봉투가 필요해 `apiFetchList` 를 쓴다. 기본 정렬은 서버가 계획일
 * 오름차순으로 잡는다 — 오래 기다린 회차가 위에 온다.
 */
export async function fetchSessionReviews(
  filter: SessionReviewFilter = {},
): Promise<SessionReviewListPage> {
  const query = new URLSearchParams();
  if (filter.cursor) query.set("cursor", filter.cursor);
  if (filter.size != null) query.set("size", String(filter.size));
  if (filter.sort) query.set("sort", filter.sort);

  const qs = query.toString();
  const { data, page } = await apiFetchList<SessionCrossListResponse>(
    qs
      ? `/v1/academic-programs/reviews/sessions?${qs}`
      : "/v1/academic-programs/reviews/sessions",
  );

  return {
    sessions: data.map(toCrossListItem),
    nextCursor: page?.nextCursor ?? null,
    hasNext: page?.hasNext ?? false,
    totalCount: page?.totalCount ?? data.length,
  };
}

/* ── 선택 항목 상세 ────────────────────────────────────────── */

/**
 * GET /v1/academic-programs/{academicProgramId}/sessions/{sessionId} — 회차 상세 (#129 · #135).
 *
 * 우측 상세 패널이 부른다 — 진행 내용·전달사항·출석부·인증사진을 승인 전에 확인한다.
 * 인증만 요구한다(목록·전이는 ACADEMIC_PROGRAM_MANAGE, 이 조회만 열려 있다). 없는 회차는
 * 404 `SESSION_NOT_FOUND` 다.
 */
export async function fetchAcademicSession(
  academicProgramId: number,
  sessionId: number,
): Promise<AcademicSessionDetail> {
  const res = await apiFetch<SessionDetailResponse>(
    `/v1/academic-programs/${academicProgramId}/sessions/${sessionId}`,
  );
  return toSessionDetail(res);
}

/* ── 승인·수정요청 전이 ────────────────────────────────────── */

/**
 * POST /v1/academic-programs/{academicProgramId}/sessions/{sessionId}/transitions (#129 · #136).
 *
 * 다음 상태가 아니라 "무엇을 하겠다"를 보낸다(work·form·활동 전이와 같은 패턴):
 *  - APPROVE          → APPROVED           (SUBMITTED 에서만)
 *  - REQUEST_REVISION → REVISION_REQUESTED (SUBMITTED 에서만, reason 필수)
 *
 * **REQUEST_REVISION 은 서버가 reason 을 필수로 본다** — 빈 값이면 거절되므로 호출부가
 * 사유 없이 부르지 않게 한다(화면은 사유 입력 전에는 버튼을 잠근다). 두 전이 모두 SUBMITTED
 * 에서만 가능하고, APPROVED 회차를 다시 전이하려 하면 409 `INVALID_SESSION_TRANSITION` 이다.
 */
export async function transitionSession(
  academicProgramId: number,
  sessionId: number,
  input: SessionTransitionInput,
): Promise<SessionTransitionResult> {
  const res = await apiFetch<SessionTransitionResponse | null>(
    `/v1/academic-programs/${academicProgramId}/sessions/${sessionId}/transitions`,
    {
      method: "POST",
      body: JSON.stringify({
        transition: input.transition,
        // APPROVE 에는 사유가 없다 — null 로 보낸다(서버가 무시한다)
        reason: input.reason ?? null,
      }),
    },
  );

  if (!res?.afterSttsCd) {
    throw new ApiError(
      SESSION_REVIEW_ERROR.VALIDATION_FAILED,
      "상태는 바뀌었지만 서버가 전이 결과를 돌려주지 않았습니다. 화면을 새로고침해주세요",
    );
  }

  return {
    sessionId: res.sessionId ?? sessionId,
    // 전이가 성공했으면 before 도 서버가 준다 — 없으면 after 로 폴백(값을 만들어 내지 않되 표시가 깨지지 않게)
    beforeSttsCd: res.beforeSttsCd ?? res.afterSttsCd,
    afterSttsCd: res.afterSttsCd,
  };
}
