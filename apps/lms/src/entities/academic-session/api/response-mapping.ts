import type {
  AcademicAttendanceRow,
  AcademicSessionAttendance,
  AcademicSessionDetail,
  AcademicSessionFileReference,
  AcademicSessionSummary,
  CurriculumItemWithSession,
  SesnSttsCd,
} from "../model/types";

/*
 * 회차 도메인의 서버 응답(Response DTO)과 도메인 변환 — **전송 계층에 의존하지 않는 순수
 * 모듈**.
 *
 * 조회(`sessions-read.ts` · 서버)와 제출(`sessions-write.ts` · 브라우저)이 이 파일 하나를 함께
 * 임포트한다. 여기에 `authed-client`(`next/headers`)를 들이면 브라우저 번들이 서버 전용 모듈을
 * 끌어와 빌드가 깨지므로, 응답 모양과 `to*` 변환만 둔다(www가 `browser-client` 한 쪽만 쓰는 것과
 * 갈리는 자리 — 이 앱은 회차 조회는 SSR, 제출은 브라우저라 두 통로가 모두 필요하다).
 *
 * 서버 record 필드명은 리네임(ssccops-server#178) 이후가 기준이다.
 */

/* ── 서버 응답(Response DTO) ────────────────────────────────── */

export interface CurriculumItemWithSessionResponse {
  curriculumItemId: number;
  seqno: number | null;
  ttl: string | null;
  planYmd: string | null;
  sessionId: number | null;
  sesnSttsCd: SesnSttsCd;
  actlYmd: string | null;
  prgrsCn: string | null;
  isEditable: boolean;
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

export interface SessionSummaryResponse {
  sessionId: number;
  curriculumItemId: number;
  seqno: number | null;
  curriculumTtl: string | null;
  planYmd: string | null;
  actlYmd: string | null;
  sesnSttsCd: SesnSttsCd;
  rgtrMbrId: number | null;
  rgtrMbrNm: string | null;
  presentCount: number;
  totalCount: number;
}

export interface SessionDetailResponse {
  sessionId: number;
  curriculumItemId: number;
  seqno: number | null;
  curriculumTtl: string | null;
  planYmd: string | null;
  actlYmd: string | null;
  prgrsCn: string | null;
  ntcCn: string | null;
  sttsCd: SesnSttsCd;
  rgtrMbrId: number | null;
  rgtrMbrNm: string | null;
  fileReference: SessionFileReferenceResponse | null;
  attendances: SessionAttendanceResponse[];
  presentCount: number;
  totalCount: number;
  latestOpinion: string | null;
}

/* ── 응답 → 도메인 ─────────────────────────────────────────── */

export function toCurriculumItem(
  res: CurriculumItemWithSessionResponse,
): CurriculumItemWithSession {
  return {
    curriculumItemId: res.curriculumItemId,
    seqno: res.seqno,
    // 빈 제목을 "-"로 채우는 것은 표시 규칙이라 뷰가 정한다 — 변환기는 "값이 없다"만 남긴다
    title: res.ttl ?? "",
    planYmd: res.planYmd,
    sessionId: res.sessionId,
    sesnSttsCd: res.sesnSttsCd,
    actualYmd: res.actlYmd,
    progressContent: res.prgrsCn,
    isEditable: res.isEditable,
  };
}

export function toSessionSummary(
  res: SessionSummaryResponse,
): AcademicSessionSummary {
  return {
    sessionId: res.sessionId,
    curriculumItemId: res.curriculumItemId,
    seqno: res.seqno,
    // 빈 제목을 "-"로 채우는 것은 표시 규칙이라 뷰가 정한다 — 변환기는 "값이 없다"만 남긴다
    curriculumTitle: res.curriculumTtl ?? "",
    planYmd: res.planYmd,
    actualYmd: res.actlYmd,
    sesnSttsCd: res.sesnSttsCd,
    registrantMemberId: res.rgtrMbrId,
    registrantMemberName: res.rgtrMbrNm ?? "",
    presentCount: res.presentCount,
    totalCount: res.totalCount,
  };
}

function toAttendance(res: SessionAttendanceResponse): AcademicSessionAttendance {
  return {
    eventPtcpId: res.eventPtcpId,
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

/* ── 출석부 한 줄 (GET·PATCH .../attendances — 상세의 출석 줄에 attendanceId가 하나 더 있다) ── */

export interface AttendanceRowResponse {
  attendanceId: number;
  eventPtcpId: number;
  mbrNm: string | null;
  atndYn: boolean;
}

export function toAttendanceRow(res: AttendanceRowResponse): AcademicAttendanceRow {
  return {
    attendanceId: res.attendanceId,
    eventPtcpId: res.eventPtcpId,
    memberName: res.mbrNm ?? "",
    atndYn: res.atndYn,
  };
}

export function toSessionDetail(res: SessionDetailResponse): AcademicSessionDetail {
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
