import type { SesnSttsCd } from "@/shared/config/codes";

/**
 * table: sesn — 학술 회차 실적 · #122
 *
 * ⚠️ **entities/session 이 아니라 여기다.** entities/session 은 인증 세션(GET /v1/auth/session)
 * 이고 그 안에 CAPABILITY·MemberProfile 이 산다 — 학술 '회차'와 이름이 정면으로 부딪히므로
 * 이 슬라이스(academic-session)로 따로 만든다(#122). 기존 슬라이스에 회차 타입을 섞지 않는다.
 *
 * 회차 제출·재제출·조회 API 자체는 이 이슈 범위 밖이다(서버 #135·#136). 여기 두는 것은
 * 화면이 쓰게 될 도메인 타입뿐이다 — 커리큘럼 조회(#134)가 회차 상태(sesnSttsCd)를 항목에
 * 붙여 내려주므로, 그 값을 담을 타입이 지금 필요하다. 실제 서버 record 필드명(리네임 이후,
 * ssccops-server#178)을 그대로 옮겨 둔다 — 옛 이름(cn·noticeCn·realDt·presentYn·fileUrl)으로
 * 쓰면 타입은 통과하고 값만 조용히 빈다.
 *
 * 날짜는 서버가 LocalDate("2026-03-01")로 내려준다(일자, 일시 아님).
 */

/** 회차 목록(GET .../sessions) 한 줄 (SessionSummaryResponse) */
export interface AcademicSessionSummary {
  /** sesn_id · PK */
  sessionId: number;
  /** 이 회차가 붙은 커리큘럼 항목 */
  curriculumItemId: number;
  /** 커리큘럼 항목의 회차 순번 */
  seqno: number | null;
  /** 커리큘럼 항목 제목 (curriculumTtl) */
  curriculumTitle: string;
  /** 계획일 (planYmd). YYYY-MM-DD */
  planYmd: string | null;
  /** 실제 진행일 (actlYmd — 옛 realDt). YYYY-MM-DD */
  actualYmd: string | null;
  sesnSttsCd: SesnSttsCd;
  /** 회차 기록 등록자 */
  registrantMemberId: number | null;
  registrantMemberName: string | null;
  /** 출석 집계 — 저장하지 않는 파생값. 출석부가 빈 회차는 0/0 */
  presentCount: number;
  totalCount: number;
}

/** 회차 상세(GET .../sessions/{id})의 출석부 한 줄 (SessionAttendanceResponse) */
export interface AcademicSessionAttendance {
  /** event_ptcp_id — 참가자 식별자. 회원명은 event_ptcp → mbr 조인이라 개명이 반영된다 */
  eventParticipantId: number;
  memberName: string;
  /** 출석 여부 (atndYn — 옛 presentYn) */
  atndYn: boolean;
}

/**
 * 회차 상세의 출석 인증사진 참조 (SessionFileReferenceResponse).
 *
 * 사진이 없는 회차는 이 블록 자체가 null 이다 — 화면은 블록 유무 하나로 "사진 있음/없음"을
 * 가른다. `fileUrlAddr`이 가리키는 오브젝트가 실제로 있다는 보장은 없다(서버가 PUT 을 관측하지
 * 않는다 · 서버 #137) — 이미지가 깨지면 재업로드가 UPSERT 다.
 */
export interface AcademicSessionFileReference {
  fileReferenceId: number;
  /** 인증사진 URL (fileUrlAddr — 옛 fileUrl) */
  fileUrlAddr: string;
}

/** 회차 상세 (SessionDetailResponse) — 제출·재제출·단건 조회가 같은 모양 */
export interface AcademicSessionDetail {
  sessionId: number;
  curriculumItemId: number;
  seqno: number | null;
  /** 계획 쪽 값을 함께 싣는다 — "계획 대비 실제"를 나란히 보여주려고(재조회 안 함) */
  curriculumTitle: string;
  planYmd: string | null;
  actualYmd: string | null;
  /** 회차 진행 내용 (prgrsCn — 옛 cn) */
  progressContent: string | null;
  /** 전달사항 (ntcCn — 옛 noticeCn) */
  noticeContent: string | null;
  sesnSttsCd: SesnSttsCd;
  registrantMemberId: number | null;
  registrantMemberName: string | null;
  /** 인증사진이 없으면 null */
  fileReference: AcademicSessionFileReference | null;
  attendances: AcademicSessionAttendance[];
  /** 저장하지 않는 파생값 — attendances 를 센 값 */
  presentCount: number;
  totalCount: number;
  /**
   * 최신 회차 승인·수정요청(acdm_actv_aprv, se_cd=SESSION)이 남긴 사유. 아직 검토되지 않은
   * 회차는 null. 이 값을 만들어 내지 않는다 — 없으면 없는 대로 드러난다.
   */
  latestOpinion: string | null;
}

/* ── 회차·출석 승인 (활동 횡단) · #129 · ssccops-server #136 ──── */

/**
 * 활동 횡단 회차 한 줄 (SessionCrossListResponse).
 *
 * `GET /v1/academic-programs/reviews/sessions`(승인 대기 — SUBMITTED 만)와
 * `GET /v1/academic-programs/sessions`(회차 이력 — 후속 이슈)가 **같은 DTO** 를 공유한다.
 * 활동 상세의 `AcademicSessionSummary` 와 달리 이 줄은 활동명·유형을 함께 실어 활동 경계 없이
 * 목록에 세울 수 있다. 인증사진은 참조 유무만(`hasFileReference`) 온다 — 실제 이미지는 선택
 * 항목 상세(`AcademicSessionDetail.fileReference`)에서 본다.
 */
export interface SessionCrossListItem {
  /** sesn_id · PK */
  sessionId: number;
  /** 이 회차가 속한 활동 */
  academicProgramId: number;
  academicProgramTitle: string;
  /** acdm_actv_type_cd — 표시명은 이 응답에 없다(목록 응답은 코드 문자열뿐) */
  typeCd: string;
  /** 커리큘럼 항목의 회차 순번 */
  seqno: number | null;
  /** 커리큘럼 항목 제목 (curriculumTtl) */
  curriculumTitle: string;
  /** 실제 진행일 (actlYmd — 옛 realDt). YYYY-MM-DD */
  actualYmd: string | null;
  sesnSttsCd: SesnSttsCd;
  /** 출석 집계 — 저장하지 않는 파생값. 출석부가 빈 회차는 0/0 */
  presentCount: number;
  totalCount: number;
  /** 인증사진 참조가 있는가 (오브젝트 실제 존재는 보장하지 않는다) */
  hasFileReference: boolean;
}

/** 승인 대기 목록 필터 — 커서 페이징이라 페이지 번호가 없다 */
export interface SessionReviewFilter {
  /** 직전 응답의 nextCursor. 첫 페이지는 생략한다 */
  cursor?: string | null;
  /** 1~100 · 서버 기본값 있음 */
  size?: number | null;
  /** 정렬 표기 — 서버 기본은 계획일 오름차순. 오타는 서버가 400 으로 끊는다 */
  sort?: string | null;
}

/** 승인 대기 목록 한 페이지 */
export interface SessionReviewListPage {
  sessions: SessionCrossListItem[];
  /** 다음 페이지 커서 — 마지막 페이지면 null */
  nextCursor: string | null;
  hasNext: boolean;
  totalCount: number;
}

/**
 * 학술국장이 부르는 회차 전이 두 종 (SessionTransition).
 *
 * 다음 상태가 아니라 "무엇을 하겠다"를 보낸다 — APPROVE 는 SUBMITTED → APPROVED,
 * REQUEST_REVISION 은 SUBMITTED → REVISION_REQUESTED(사유 필수). APPROVED 는 되돌리지 않는다.
 */
export type SessionTransition = "APPROVE" | "REQUEST_REVISION";

/** 전이 입력 — REQUEST_REVISION 은 reason 이 필수다(빈 값이면 서버가 거절) */
export interface SessionTransitionInput {
  transition: SessionTransition;
  /** 수정요청 사유. APPROVE 에는 없다 */
  reason?: string | null;
}

/** 전이 결과 (SessionTransitionResponse) */
export interface SessionTransitionResult {
  sessionId: number;
  beforeSttsCd: SesnSttsCd;
  afterSttsCd: SesnSttsCd;
}
