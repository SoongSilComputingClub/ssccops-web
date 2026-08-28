/*
 * 학술 회차 도메인 타입 (#128 · ssccops-server#135·#137).
 *
 * ⚠️ **`entities/session`이 아니라 여기다.** `entities/session`은 인증 세션
 * (`GET /v1/auth/session`)이고 그 안에 `CAPABILITY`·`MemberProfile`이 산다 — 학술 '회차'와
 * 이름이 정면으로 부딪히므로 이 슬라이스(`academic-session`)로 따로 만든다(#122·#128 이슈 규칙).
 * 어드민에도 같은 이름의 슬라이스가 있지만 소스를 공유하지 않는다(FSD 레이어는 세 앱이 각자
 * 갖는다 — AGENTS.md).
 *
 * 서버 응답의 실제 모양을 아는 곳은 `entities/academic-session/api` 하나이고 화면은 이 타입만
 * 본다(폼·행사·팀원 도메인이 세운 규칙).
 *
 * ── 서버 record 필드명은 리네임(ssccops-server#178) 이후가 기준이다 ──
 * `actlYmd`·`prgrsCn`·`ntcCn`·`atndYn`·`fileUrlAddr`이 최신 이름이다. 옛 이름
 * (`realDt`·`cn`·`noticeCn`·`presentYn`·`fileUrl`)으로 쓰면 타입은 통과하고 값만 조용히 빈다.
 *
 * 날짜는 서버가 `LocalDate`("2026-03-01")로 내려준다 — 일자, 일시 아님.
 */

/**
 * 회차_실적_상태 (sesn.sesn_stts_cd).
 *
 * 고정 enum(서버 `SessionStatus`)이라 표준코드 테이블 시드가 없다 — 응답은 raw enum 문자열만
 * 온다. 어드민 `SESN_STTS_NM`과 같은 성격이며, lms에는 공유 `codes.ts`가 없어(www도 슬라이스
 * 마다 코드를 둔다) 여기에 둔다.
 *
 * `NOT_SUBMITTED`는 **회차 행이 아직 없다는 뜻**이다 — 커리큘럼 조회(#134)가 실적 없는 항목에
 * 합성해 내려주는 파생 상태다. `SUBMITTED`·`APPROVED`인 회차는 작성할 수 없다(화면이 폼을 열지
 * 않는다). 작성이 열리는 상태는 `NOT_SUBMITTED`(신규 제출) · `REVISION_REQUESTED`(재제출) 둘뿐이다
 * (서버 `SessionStatus.allowsRecording()`).
 */
export type SesnSttsCd = "NOT_SUBMITTED" | "SUBMITTED" | "APPROVED" | "REVISION_REQUESTED";

/** 작성(제출·재제출)이 열리는 상태인가 — 서버 `SessionStatus.allowsRecording()`과 같은 판정 */
export function allowsRecording(code: SesnSttsCd): boolean {
  return code === "NOT_SUBMITTED" || code === "REVISION_REQUESTED";
}

/**
 * table: crclm_artcl + sesn 조인 한 줄 (`CurriculumItemWithSessionResponse` · 서버 #134).
 *
 * 회차 기록 작성 화면은 커리큘럼 항목 하나를 대상으로 연다 — 계획(제목·계획일·순번)을 보여
 * 주고, 그 항목의 회차 상태로 폼을 열지 말지, POST(신규)로 보낼지 PUT(재제출)로 보낼지를
 * 가른다.
 *
 * `sesnSttsCd`는 실적 행이 없어도 서버가 `NOT_SUBMITTED`를 합성해 채워 내려준다 — 화면은 null
 * 분기를 두지 않는다. 반대로 `sessionId`·`actualYmd`·`progressContent`는 실적이 있을 때만
 * 채운다(없는 것을 있는 척하지 않는다).
 *
 * `isEditable`도 **서버 판정**이다 — 스터디장/팀장 본인 여부와 회차 상태의 곱이라, 웹이
 * `leadrMbrId === 내 mbrId`를 다시 계산하면 버튼과 실제 판정이 갈린다(#122·AGENTS.md).
 */
export interface CurriculumItemWithSession {
  /** crclm_artcl_id · PK */
  curriculumItemId: number;
  /** 회차 순번 (1부터). 없으면 null */
  seqno: number | null;
  /** 커리큘럼 항목 제목 (ttl) */
  title: string;
  /** 계획일 (planYmd — 옛 planDt). YYYY-MM-DD. 없으면 null */
  planYmd: string | null;
  /** 실적 행의 PK. 아직 아무도 손대지 않은 계획이면 null */
  sessionId: number | null;
  /** 회차 실적 상태. 실적이 없으면 서버가 `NOT_SUBMITTED`를 합성해 내려준다 */
  sesnSttsCd: SesnSttsCd;
  /** 실제 진행일 (actlYmd — 옛 realDt). 실적이 있을 때만. YYYY-MM-DD */
  actualYmd: string | null;
  /** 회차 진행 내용 (prgrsCn — 옛 cn). 실적이 있을 때만 */
  progressContent: string | null;
  /** 지금 이 회차의 기록을 쓸 수 있는가 — 서버 판정(본인 여부 × 상태). 재계산 금지 */
  isEditable: boolean;
}

/** 회차 상세(GET .../sessions/{id})의 출석부 한 줄 (`SessionAttendanceResponse`) */
export interface AcademicSessionAttendance {
  /** event_ptcp_id — 참가자 식별자(회원 PK 아님). 회원명은 event_ptcp → mbr 조인이라 개명이 반영된다 */
  eventPtcpId: number;
  /** 회원 이름. 서버가 비워 보내면 빈 문자열로 굳힌다(표시 규칙은 뷰가 정한다) */
  memberName: string;
  /** 출석 여부 (atndYn — 옛 presentYn) */
  atndYn: boolean;
}

/**
 * 회차 상세의 출석 인증사진 참조 (`SessionFileReferenceResponse`).
 *
 * 사진이 없는 회차는 이 블록 자체가 null이다 — 화면은 블록 유무 하나로 "사진 있음/없음"을
 * 가른다. `fileUrlAddr`이 가리키는 오브젝트가 실제로 있다는 보장은 없다(서버가 PUT을 관측하지
 * 않는다 · 서버 #137) — 이미지가 깨지면 재업로드가 UPSERT다.
 */
export interface AcademicSessionFileReference {
  fileReferenceId: number;
  /** 인증사진 URL (fileUrlAddr — 옛 fileUrl) */
  fileUrlAddr: string;
}

/**
 * 회차 상세 (`SessionDetailResponse`) — 제출(201)·재제출(200)·단건 조회(200)가 같은 모양이다.
 *
 * 쓰기 직후 화면이 재조회 없이 같은 화면을 그릴 수 있도록 계획 쪽 값(`seqno`·`curriculumTitle`·
 * `planYmd`)을 함께 싣는다. `presentCount`·`totalCount`는 저장하지 않는 파생값(attendances를 센 값)
 * 이다.
 */
export interface AcademicSessionDetail {
  sessionId: number;
  curriculumItemId: number;
  seqno: number | null;
  /** 계획 커리큘럼 항목 제목 (curriculumTtl) */
  curriculumTitle: string;
  planYmd: string | null;
  actualYmd: string | null;
  /** 회차 진행 내용 (prgrsCn — 옛 cn). 없으면 null */
  progressContent: string | null;
  /** 전달사항 (ntcCn — 옛 noticeCn). 없으면 null */
  noticeContent: string | null;
  sesnSttsCd: SesnSttsCd;
  registrantMemberId: number | null;
  registrantMemberName: string | null;
  /** 인증사진이 없으면 null */
  fileReference: AcademicSessionFileReference | null;
  attendances: AcademicSessionAttendance[];
  presentCount: number;
  totalCount: number;
  /**
   * 최신 회차 승인·수정요청(acdm_actv_aprv, se_cd=SESSION)이 남긴 사유. 아직 검토되지 않은
   * 회차는 null. 재제출 화면이 "국장이 요청한 수정 사항"으로 보여 준다 — 이 값을 만들어 내지
   * 않는다(없으면 없는 대로).
   */
  latestOpinion: string | null;
}

/** 출석부 한 줄 (`AttendanceResponse` · GET·PATCH .../attendances) — 상세의 출석 줄에 `attendanceId`가 하나 더 있다 */
export interface AcademicAttendanceRow {
  /** atndc PK — 정정 결과를 화면이 줄 단위로 되짚을 때 쓴다 */
  attendanceId: number;
  eventPtcpId: number;
  memberName: string;
  atndYn: boolean;
}

/** 출석 정정 응답 (`AttendancePatchResponse`) — 갱신된 명단 전체와 다시 센 집계 */
export interface AttendanceCorrection {
  attendances: AcademicAttendanceRow[];
  presentCount: number;
  totalCount: number;
}
