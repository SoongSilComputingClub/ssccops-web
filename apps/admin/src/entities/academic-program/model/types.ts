import type {
  AcdmActvSttsCd,
  PtcpSttsCd,
  RspnsSttsCd,
} from "@/shared/config/codes";

/**
 * table: acdm_actv — 학술 활동 (스터디/프로젝트) · #122
 *
 * 제목·기간·장소는 상위 테이블 event 에 있고, 서버가 상세·목록 응답에서 합성해 함께
 * 내려준다(클라이언트가 두 번 호출하지 않게). 커리큘럼(계획)은 entities/curriculum-item,
 * 회차(실적)는 entities/academic-session 에 둔다 — entities/session 은 인증 세션이라
 * 이름이 정면으로 부딪히므로 섞지 않는다(#122).
 *
 * ── 서버 계약을 그대로 옮긴다 ──────────────────────────────────
 * 필드명이 DB 컬럼 약어(acdm_actv_id 등)가 아니라 서버 record 필드명 그대로인 것은
 * 의도한 것이다 — entities/work·entities/session 이 이미 한 판단이다. 서버가
 * `ssccops-server#178`(2026-08-28)로 학술 7개 테이블·컬럼·DTO 필드를 데이터사전 표준
 * 약어로 리네임했고, URL 경로는 그대로이고 JSON 필드명만 바뀌었다 — 옛 이름으로 쓰면
 * 타입은 통과하고 값만 조용히 빈다. 아래는 리네임 이후 record가 기준이다.
 *
 * 일시는 서버가 Asia/Seoul 오프셋을 붙여 내려준다("2026-03-01T00:00:00+09:00").
 * 화면은 shared/lib/date 로 앞자리를 잘라 쓴다 — new Date() 로 파싱해 로컬 시간대로
 * 그리면 서울 밖에서 다른 시각이 보인다(#122).
 */

/** 목록(GET /v1/academic-programs) 카드 한 장 (AcademicProgramSummaryResponse) */
export interface AcademicProgramSummary {
  /** acdm_actv_id · PK */
  academicProgramId: number;
  /** 상위 event 의 식별자 */
  eventId: number;
  /** event.title — 카드 제목 */
  title: string;
  /** acdm_actv_type_cd — 런타임 코드테이블의 PK 문자열 (STUDY·PROJECT · 세미나 등 확장 가능) */
  typeCd: string;
  sttsCd: AcdmActvSttsCd;
  /** 스터디장/팀장 이름. 이관 직후 리더 미지정이면 null */
  leaderName: string | null;
  eventBeginAt: string | null;
  eventEndAt: string | null;
  /** 0~100 (DECIMAL) — 계획 항목 수 대비 승인 회차 수. Session 엔티티 신설 전에는 0 */
  progressRatio: number;
  /** 내가 이 활동의 스터디장/팀장인가 — 서버 판정(재계산 금지) */
  isLeader: boolean;
}

/** 상세 응답의 진행률 (AcademicProgramProgressResponse) — 저장하지 않는 파생값 */
export interface AcademicProgramProgress {
  totalSessionCount: number;
  approvedSessionCount: number;
  /** 0~100 (DECIMAL) */
  ratio: number;
}

/**
 * 상세(GET /v1/academic-programs/{id}) (AcademicProgramDetailResponse).
 *
 * `formId`·`formReceiptStatus`는 옵셔널이다 — 모집 시작(START_RECRUITMENT) 전에는 폼이
 * 연결돼 있어도 접수 상태가 없고, 서버가 아직 이 필드를 싣지 않는 배포에서는 비어 온다.
 * 옵셔널로 받아 null 로 굳힌다(행사 앱이 세운 규칙 · #122).
 */
export interface AcademicProgramDetail {
  academicProgramId: number;
  eventId: number;
  title: string;
  eventBeginAt: string | null;
  eventEndAt: string | null;
  /** event.plc_nm — 장소 */
  placeName: string | null;
  typeCd: string;
  /** acdm_actv_type.type_nm — 서버가 함께 내려주는 표시명 (코드 → 이름 사전을 웹에 두지 않는다) */
  typeName: string;
  sttsCd: AcdmActvSttsCd;
  /** 목표_내용 */
  goalContent: string | null;
  /** 준비물_내용 */
  prepContent: string | null;
  /** 일정_내용 (schdlCn — 옛 scheduleTxt) */
  scheduleText: string | null;
  /** 모집 정원 하한 (pscpMinCnt — 옛 cpctyMinCnt) */
  participantMinCount: number | null;
  /** 모집 정원 상한 (pscpMaxCnt — 옛 cpctyMaxCnt) */
  participantMaxCount: number | null;
  /** 기획안 제출자 */
  proposerMemberId: number | null;
  proposerMemberName: string | null;
  /** 스터디장/팀장. 이관 직후 미지정이면 null */
  leaderMemberId: number | null;
  leaderMemberName: string | null;
  /** 서버 판정 — leadrMbrId 본인 여부를 웹에서 재계산하지 않는다 */
  isLeader: boolean;
  isProposer: boolean;
  /** 연결된 모집 폼. 모집 시작 전이거나 서버 옛 버전이면 null */
  formId: number | null;
  /** 파생 접수 상태 (FormReceiptStatus enum 문자열). 모집 시작 전에는 null */
  formReceiptStatus: string | null;
  progress: AcademicProgramProgress;
  /** 커리큘럼 항목 수 */
  curriculumItemCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

/** 목록 필터 — 값이 없으면(null) 그 축을 거르지 않는다 */
export interface AcademicProgramListFilter {
  /** 런타임 코드테이블 PK — 서버가 형식 검증하지 않는다(없는 코드면 빈 목록) */
  typeCd?: string | null;
  sttsCd?: AcdmActvSttsCd | null;
  /** 제목 부분 일치 */
  keyword?: string | null;
  /** 내가 스터디장/팀장인 활동만 */
  mine?: boolean | null;
  /** 직전 응답의 nextCursor. 첫 페이지는 생략한다 */
  cursor?: string | null;
  /** 1~100 · 서버 기본 20 */
  size?: number | null;
  /**
   * 정렬 표기 — 내림차순은 '-' 접두. 서버 어휘: `-createdAt`(기본) · `createdAt` ·
   * `eventBgngDt` · `-eventBgngDt`. 오타는 서버가 400 으로 끊는다(조용히 기본값으로
   * 떨어뜨리지 않는다).
   */
  sort?: string | null;
}

/** 목록 한 페이지 — 커서 페이징이라 페이지 번호가 없다 */
export interface AcademicProgramListPage {
  academicPrograms: AcademicProgramSummary[];
  /** 다음 페이지 커서 — 마지막 페이지면 null */
  nextCursor: string | null;
  hasNext: boolean;
  /** 필터를 적용한 건수 */
  totalCount: number;
}

/* ── 상태 전이 (POST /v1/academic-programs/{id}/transitions) ──── */

/**
 * 학술국장이 부르는 전이 두 종 (AcademicProgramTransition).
 *
 * 다음 상태가 아니라 "무엇을 하겠다"를 보낸다 — work·form 도메인과 같은 패턴이다.
 * START_RECRUITMENT 는 APPROVED → ONGOING(연결된 폼을 OPEN 전이),
 * APPROVE_COMPLETION 은 ONGOING → COMPLETED. 되돌리는 전이는 없다.
 */
export type AcademicProgramTransition =
  | "START_RECRUITMENT"
  | "APPROVE_COMPLETION";

/** 전이 입력 — 모집 기간은 START_RECRUITMENT 에서만 쓰인다(APPROVE_COMPLETION 에 실려도 서버가 무시) */
export interface AcademicProgramTransitionInput {
  transition: AcademicProgramTransition;
  /** 모집 시작일 (ISO-8601, 오프셋 포함). START_RECRUITMENT 전용 */
  recruitmentStartAt?: string | null;
  /** 모집 종료일 (ISO-8601, 오프셋 포함). START_RECRUITMENT 전용 */
  recruitmentEndAt?: string | null;
}

/** 전이 결과 (AcademicProgramTransitionResponse) */
export interface AcademicProgramTransitionResult {
  academicProgramId: number;
  /**
   * 전이 **전** 상태 — 서버가 주지 않으면 `null`이다 (#686).
   *
   * 그전에는 `?? afterSttsCd`로 메웠는데, 그러면 before == after 인 이력 줄이 생겨
   * 화면이 «승인 → 승인»으로 그린다 — **아무것도 바뀌지 않은 것처럼 보인다.** 표시가
   * 깨지는 것보다 나쁘다: 깨지면 보이지만 이건 그럴듯해서 아무도 못 본다.
   */
  beforeSttsCd: AcdmActvSttsCd | null;
  afterSttsCd: AcdmActvSttsCd;
  /** START_RECRUITMENT 직후의 파생 접수 상태(FormReceiptStatus 문자열). APPROVE_COMPLETION 은 null */
  formReceiptStatus: string | null;
}

/* ── 모집 신청자·선발 (GET·POST /v1/academic-programs/{id}/recruitment/...) · #127 ─ */

/**
 * 모집 신청자 한 줄 (FormResponseSummaryResponse 재사용 · 서버 #138).
 *
 * 모집 신청은 시스템 폼으로 처리되므로 신청자는 곧 폼 응답이다 — 이 타입은 그 응답 요약을
 * 화면이 쓰는 모양으로 옮긴 것이다. 응답 내용(지원 동기 등 답 본문)은 목록에 실리지 않는다
 * (필요하면 폼 응답 상세를 따로 조회 · 이 화면 범위 밖).
 */
export interface RecruitmentApplication {
  /** form_rspns_hstry PK — 선발 요청이 신청자를 가리키는 값 */
  formRspnsId: number;
  /** 응답 순번 — 같은 회원의 두 응답을 가르는 값. 모르는 배포면 null */
  rspnsSeq: number | null;
  /** 응답 심사 상태 — 선발하면 서버가 ACCEPTED 로 바꾼다 */
  rspnsSttsCd: RspnsSttsCd;
  /** 제출 일시. 작성 중(DRAFT)이면 null */
  sbmsnDt: string | null;
  /** 응답자 회원 PK. 조인이 빠진 배포면 null */
  memberId: number | null;
  /** 응답자 이름. 빈 값이면 뷰가 "-"로 표시한다(변환기는 채우지 않는다) */
  memberName: string;
  studentNo: string | null;
  /** 학과명 */
  subjectName: string | null;
  /**
   * 이 신청자의 **참가 상태** — 확정(CONFIRMED)·대기(WAITLISTED)·취소(CANCELLED) (서버 #198).
   *
   * **선발 전이면 `null`이다.** 서버가 대체값을 만들지 않으므로 화면이 "미선발"로 읽는다.
   *
   * ── 왜 `rspnsSttsCd`로는 안 되는가 ────────────────────────────
   * 선발은 응답 심사와 참가 등록을 **함께** 하므로 확정이든 대기든 응답은 똑같이 `ACCEPTED`가
   * 된다. 응답 상태로 그리면 대기로 뽑은 신청자가 확정자와 구별되지 않는다(#209가 그 버그다).
   *
   * 서버는 이 값을 응답이 아니라 **회원**으로 잇는다 — 명단의 열쇠가 (event_id, mbr_id)
   * UNIQUE라 한 사람의 참가 상태는 하나다. 같은 회원이 낸 응답이 여러 줄이면 그 줄들에 같은
   * 상태가 함께 실린다.
   */
  ptcpSttsCd: PtcpSttsCd | null;
  /**
   * event_ptcp PK — 명단에 오른 뒤에만 있다(선발 전이면 `null`).
   *
   * 이 화면은 선발을 `POST .../recruitment/select`로 저장하므로 이 값을 요청에 쓰지 않는다.
   * 그래도 받아 두는 것은 "명단 행이 있는가"가 곧 선발 여부이고, 참가자 단건을 고치는 경로
   * (`PATCH /v1/events/{eventId}/participants/{eventPtcpId}`)가 이 값을 요구하기 때문이다.
   */
  eventParticipantId: number | null;
}

/** 신청자 목록 필터 — 값이 없으면(null) 서버 기본(= 작성 중 제외)으로 조회한다 */
export interface RecruitmentApplicationFilter {
  /** ResponseStatus 로 거른다 */
  rspnsSttsCd?: RspnsSttsCd | null;
  /** 직전 응답의 nextCursor. 첫 페이지는 생략한다 */
  cursor?: string | null;
  /** 1~100 · 서버 기본 20 */
  size?: number | null;
}

/**
 * 선발 확정 한 건 (SelectionRequest 항목).
 *
 * `ptcpSttsCd` 는 CONFIRMED · WAITLISTED 만 받는다(`PTCP_RGST_STTS_CDS` — 취소로 시작하는
 * 선발은 계약에 없다).
 */
export interface RecruitmentSelection {
  formRspnsId: number;
  ptcpSttsCd: PtcpSttsCd;
}

/**
 * 선발 뒤 갱신된 팀원 한 줄 (AcademicProgramMemberResponse · GET .../members 와 같은 모양).
 */
export interface RecruitmentTeamMember {
  /** event_ptcp PK */
  eventParticipantId: number;
  memberId: number | null;
  memberName: string;
  ptcpSttsCd: PtcpSttsCd;
  /** 스터디장/팀장 여부 — 서버 판정 */
  isLeader: boolean;
  /** 명단에 오른 일시 */
  joinedAt: string | null;
}

/**
 * 모집 일정 (GET·PATCH .../recruitment/schedule · 서버 신설).
 *
 * 연결된 신청서(폼)의 접수 기간과 그것에서 파생된 접수 상태다. **두 일시가 null 이면 "제한
 * 없음"이지 "미정"이 아니다** — 종료가 비면 수동 마감할 때까지 열리고, 시작이 비면 곧바로
 * 접수가 열린다(서버 FormReceiptPolicy). 모집 시작 전 활동만이 "아직 정해지지 않았다"이며
 * 그때는 활동 상태가 APPROVED다.
 *
 * `receiptStatus` 를 화면이 다시 계산하지 않는다 — 서버의 Clock 과 브라우저 시각이 갈리면
 * "미래로 미뤘는데 여전히 모집 중"으로 보이는 구간이 생긴다(#528 의 `isEditable` 과 같은 판단).
 */
export interface RecruitmentSchedule {
  academicProgramId: number;
  formId: number | null;
  /** 접수 시작 일시 (오프셋 포함) — null 이면 제한 없음 */
  rcptBgngDt: string | null;
  rcptEndDt: string | null;
  /**
   * 서버가 파생한 접수 상태 — 화면은 그대로 배지로 그린다.
   *
   * 문자열 유니온을 여기 옮겨 적지 않고 `entities/form` 의 것을 쓴다 — 이 화면(모집 관리)이
   * 이미 그 타입으로 배지를 그리고 있어(`FORM_RECEIPT_BADGE`) 사본을 두면 값이 하나 늘었을 때
   * 한쪽만 고쳐져 배지가 조용히 빈다. 슬라이스 참조 금지는 **뷰가 두 슬라이스를 함께 읽는
   * 것**까지 막지 않으므로, 타입을 옮겨 적는 대신 값의 정의를 한 곳에 남긴다.
   */
  receiptStatus: string | null;
}

/** 모집 일정 변경 입력 — **전체 교체**라 바꾸지 않는 값도 현재 값을 그대로 실어 보낸다 */
export interface RecruitmentScheduleInput {
  /** datetime-local 값이거나 오프셋이 붙은 값. 비우면 null(제한 없음) */
  rcptBgngDt: string | null;
  rcptEndDt: string | null;
}

/* ── 유형 코드테이블 (GET·POST·PATCH /v1/academic-program-types) ─ */

/** 학술 활동 유형 한 줄 (AcademicProgramTypeResponse) — 목록·등록·수정·사용 전환이 같은 모양 */
export interface AcademicProgramType {
  /** acdm_actv_type_cd · PK. IDENTITY 가 아니라 클라이언트가 지정한다(대문자·숫자·밑줄) */
  typeCd: string;
  /** 명V50 */
  typeName: string;
  /** 표시_순번 — 목록 정렬 기준 */
  displayOrder: number;
  /** 비활성 유형은 새 활동이 고를 수 없을 뿐, 이미 그 유형인 활동은 그대로 남는다 */
  useYn: boolean;
}

/** 유형 등록·수정 공용 입력 (AcademicProgramTypeSaveRequest) — 부분 수정이 아니라 폼 전체 저장 */
export interface AcademicProgramTypeSaveInput {
  /** 등록에서만 쓰인다 — 수정(PATCH)은 경로의 값이 유일한 식별자이고 본문의 typeCd 는 무시된다 */
  typeCd: string;
  typeName: string;
  displayOrder: number;
}
