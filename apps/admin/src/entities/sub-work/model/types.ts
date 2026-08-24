import type {
  AprvSttsCd,
  OperTypeCd,
  PrrtyRnkCd,
  TkcgSeCd,
  WorkSttsCd,
} from "@/shared/config/codes";

/**
 * table: sub_work — 하위_업무
 * 담당자는 sub_work_pic_altmnt, 점검 목록은 sub_work_chck_list 로 분리되어 있다.
 * 화면의 D-day·마감임박·진행률은 저장하지 않고 ddlnDt·dlyYn·chckList 에서 파생한다.
 *
 * **아래 SubWork는 아직 목 스토어(model/store.ts)를 쓰는 화면 전용이다.** 상세·전이·체크리스트는
 * 서버 연동(#39)으로 옮겨 갔고 그쪽은 이 파일 뒤쪽의 SubWorkDetail을 쓴다. 남은 사용처는
 * 하위 업무 목록·승인함·운영 통합·대시보드이며, 그 화면들이 연동되면 함께 사라진다
 * (업무 도메인이 #30에서 밟은 경로와 같다).
 */
export interface SubWork {
  /** 식별자N19 · PK */
  subWorkId: number;
  /** FK work.work_id — 상위 업무, 필수 */
  workId: number;
  /** FK oper.oper_id — 대상 운영 */
  operId: number;
  /** 제목V256 */
  subWorkTtl: string;
  /** FK sub_work_type.sub_work_type_id — 승인 정책 결정 */
  subWorkTypeId: number;
  workSttsCd: WorkSttsCd;
  aprvSttsCd: AprvSttsCd;
  /** 내용T — 현재 유효한 계획만 */
  workCn: string | null;
  /** 내용T — 완료 조건 */
  cmptnCrtrCn: string | null;
  /** 여부B — 지연 자동 판정 */
  dlyYn: boolean;
  /** 주소V200 — 상세 논의 외부 링크 */
  otsdUrlAddr: string | null;
  /** 일시TS */
  ddlnDt: string | null;
  /** 일시TS */
  cmptnDt: string | null;
}

/** table: sub_work_chck_list — 하위_업무_점검_목록 */
export interface SubWorkChckList {
  subWorkChckListId: number;
  subWorkId: number;
  /** 내용T — "날짜 확인", "장소 표기 확인" */
  chckArtclCn: string;
  cmptnYn: boolean;
  /** 순서N5 */
  sortSeq: number;
}

/** table: sub_work_pic_altmnt — 하위_업무_담당자_배정 */
export interface SubWorkPicAltmnt {
  subWorkPicAltmntId: number;
  subWorkId: number;
  mbrId: number;
  /** 담당자 / 협업자 */
  tkcgSeCd: TkcgSeCd;
}

/** table: sub_work_stts_hstry — 하위_업무_상태_이력 */
export interface SubWorkSttsHstry {
  subWorkSttsHstryId: number;
  subWorkId: number;
  /** 수행자_ID */
  prfmrId: number;
  /** 사유T */
  chgRsn: string | null;
  /** 일시TS — 사후 수정 불가 */
  chgDt: string | null;
}

/* ── 서버 연동 타입 (ssccops-server OPS-009·010·013) ─────────── */

/*
 * 여기부터는 ssccops-server의 하위 업무 API가 내려주는 값이다.
 *
 * **필드명이 위의 SubWork와 다른 것은 의도한 것이다** — 운영 API는 DB 컬럼 약어가 아니라
 * API camelCase를 쓴다(정의서 01_API_필드: title·workStatus·dueAt). 서버 계약을 그대로
 * 옮겨 두어야 응답이 바뀌었을 때 어디를 고쳐야 하는지가 분명하다 (업무 도메인 #30이 같은
 * 판단을 이미 했다). 값 자체는 같은 기준 코드라 shared/config/codes를 그대로 쓴다.
 *
 * 일시는 서버가 Asia/Seoul 오프셋을 붙여 내려준다 ("2026-08-20T23:59:00+09:00").
 */

/** 담당자·등록자·협업자·반려자 요약 — 서버가 식별자와 이름 두 값만 내린다 */
export interface SubWorkMemberRef {
  memberId: number;
  name: string;
}

/** 완료 점검 목록 한 줄 (sub_work_chck_list) */
export interface SubWorkChecklistItem {
  checklistItemId: number;
  /** 점검 항목 내용 — 유형에서 복사된 값이라 여기서 수정하지 않는다 */
  article: string;
  isCompleted: boolean;
  /** 1부터. 서버가 이 순서로 정렬해 내려준다 */
  sortOrder: number;
}

/**
 * 화면의 '2/4 완료' 표기.
 *
 * 목록 길이로 직접 세지 않고 서버가 준 값을 쓴다 — 세는 규칙이 두 벌이 되면 상세와 상위 업무
 * 상세(OPS-003)의 진행률이 갈린다(서버 SubWorkChecklistSummaryResponse 주석).
 */
export interface SubWorkChecklistSummary {
  completedCount: number;
  totalCount: number;
}

/**
 * 정족수 진행 (OPS-009 quorum).
 *
 * `needed`가 false면 단독 승인 유형이라 나머지는 전부 null이다 — 0으로 채우면 '정족수가 있는데
 * 아무도 찬성하지 않은 상태'와 구별되지 않는다(서버 ApprovalQuorumResponse 주석).
 * 찬성 수는 **이번 회차** 기준이라 반려 후 재상정되면 0부터 다시 센다.
 */
export interface SubWorkQuorum {
  needed: boolean;
  requiredCount: number | null;
  currentCount: number | null;
  met: boolean | null;
}

/** 직전 반려 (OPS-009 latestRejection) — 반려된 적이 없으면 상세의 이 필드가 null이다 */
export interface SubWorkRejection {
  rejectionId: number;
  rejector: SubWorkMemberRef | null;
  reason: string;
  rejectedAt: string | null;
}

/**
 * 하위 업무 상세 (OPS-009).
 *
 * 화면은 '상위 속성 · oper'와 '확장 속성 · sub_work' 두 블록으로 나눠 보여주지만 응답은
 * 평면이다 — 담당자·우선순위·기간은 실은 oper의 값이라 블록대로 중첩하면 같은 값을 두 번
 * 받게 된다(업무 상세와 같은 판단).
 */
export interface SubWorkDetail {
  subWorkId: number;
  /** 화면 '운영_ID' — sub_work_id가 아니라 상위 oper의 식별자다 */
  operationId: number;
  workId: number;
  /** 상위 업무명 (#70에서 서버가 함께 내려준다 — 이름 한 줄 때문에 OPS-003을 또 부르지 않는다) */
  workTitle: string;
  operationType: OperTypeCd;
  title: string;
  subWorkTypeId: number;
  subWorkTypeName: string;
  workStatus: WorkSttsCd;
  approvalStatus: AprvSttsCd;
  /** 하위 업무가 아니라 그 유형이 갖는 값 — 안내 문구와 버튼 노출의 근거다 */
  approvalRequired: boolean;
  /** 승인자 결재 권한 코드 (서버 #123). 판정용 — 표시는 authorizerAuthorityName으로 한다 */
  authorizerAuthorityCode: string | null;
  /** 승인자 결재 권한 표시명 (authrt_nm) — 안내 문구가 이 이름을 쓴다 */
  authorizerAuthorityName: string | null;
  owner: SubWorkMemberRef | null;
  /** 이관 데이터는 등록자가 없다 */
  registrant: SubWorkMemberRef | null;
  /** 배정 테이블(sub_work_pic_altmnt)이 아직 매핑되지 않아 항상 빈 배열이다 */
  collaborators: SubWorkMemberRef[];
  startAt: string | null;
  endAt: string | null;
  dueAt: string | null;
  priority: PrrtyRnkCd;
  content: string | null;
  /** 완료_기준_내용 — 등록 화면에 입력란이 없어 지금은 늘 비어 있다 (서버 #70) */
  completionCriteria: string | null;
  externalLink: string | null;
  /** dly_yn 컬럼이 아니라 **서버가 조회 시점에 판정한 값**이다 — 웹이 마감 일시로 되짚지 않는다 */
  isDelayed: boolean;
  completedAt: string | null;
  checklist: SubWorkChecklistItem[];
  checklistSummary: SubWorkChecklistSummary;
  quorum: SubWorkQuorum;
  /**
   * **이번 회차**의 내 표 (OPS-009 myVote). 아직 던지지 않았으면 null이고, 정족수 유형이
   * 아니면 서버가 늘 null로 내린다. 반려 후 재상정되면 회차가 바뀌어 다시 null이 된다 —
   * 이전 회차의 표를 이번 회차의 선택 상태로 그리지 않기 위해서다(승인함 카드와 같은 값).
   */
  myVote: VoteChoice | null;
  latestRejection: SubWorkRejection | null;
  /**
   * **권한만** 답한다 — "이 회원이 승인자인가"이지 "지금 누르면 성공하는가"가 아니다.
   * 누를 수 있는지는 workStatus·checklistSummary·quorum으로 화면이 따로 판단한다
   * (서버 SubWorkDetailResponse 주석 — 둘을 섞으면 정족수가 모자란 승인자와 권한이 없는
   * 사람이 같은 false가 되어 승인자에게도 버튼이 사라진다).
   */
  canApprove: boolean;
  canReject: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * 상태 전이 액션 (OPS-010 · TR-01~TR-04).
 *
 * 화면의 버튼 문구(착수·완료 승인 요청·완료 승인·반려)가 아니라 이 코드로 보낸다.
 * 전이표에 없는 조합은 서버가 409 TRANSITION_NOT_ALLOWED로 끊는다.
 */
export type SubWorkTransition =
  | "START"
  | "REQUEST_REVIEW"
  | "APPROVE_COMPLETE"
  | "REJECT";

/** 전이 결과 (OPS-010) — 전이 전 상태까지 함께 온다 */
export interface SubWorkTransitionResult {
  subWorkId: number;
  transition: SubWorkTransition;
  previousWorkStatus: WorkSttsCd;
  workStatus: WorkSttsCd;
  previousApprovalStatus: AprvSttsCd;
  approvalStatus: AprvSttsCd;
  /** 등록자 본인이 승인한 건 (POL-006 — 차단이 아니라 표시) */
  isSelfApproval: boolean;
  completedAt: string | null;
  changedAt: string | null;
}

/** 체크 · 해제 결과 (OPS-013) — 바뀐 항목과 다시 센 요약이 함께 온다 */
export interface SubWorkChecklistUpdate {
  subWorkId: number;
  item: SubWorkChecklistItem;
  checklistSummary: SubWorkChecklistSummary;
}

/**
 * 정족수 승인 투표 선택지 (OPS-015). 기권은 없다 — 승인함 화면에 기권 버튼이 없다
 * (서버 VoteChoice 주석).
 */
export type VoteChoice = "AGREE" | "DISAGREE";

/**
 * 투표 결과 (OPS-015).
 *
 * `met`이 true여도 업무_상태·승인_상태는 그대로다 — 정족수는 승인자를 대체하지 않는다.
 * `approvalSequence`는 회차다. 반려 후 재상정되면 집계가 초기화되는데, 화면이 이전 회차의
 * 표를 이번 회차의 선택 상태로 잘못 그리지 않으려면 이 값이 필요하다.
 */
export interface SubWorkVoteResult {
  subWorkId: number;
  myVote: VoteChoice;
  met: boolean;
  currentCount: number;
  requiredCount: number;
  approvalSequence: number;
}

/* ── 목록 (ssccops-server OPS-008 · #28·#74·ssccops-web#41) ──── */

/** 하위 업무 목록의 '상위 업무' 칸 — 배지 문구와 상세(OPS-003)로 갈 식별자만 담는다 */
export interface SubWorkWorkRef {
  workId: number;
  title: string;
}

/**
 * 하위 업무 목록(OPS-008)의 한 행.
 *
 * 상세(SubWorkDetail)와 필드가 겹치지만 별도 타입이다 — 목록은 상위 업무를 가로지르므로
 * 상위 업무 제목·유형명이 더 있고, 반대로 체크리스트·승인 판단 근거는 없다(서버
 * SubWorkSummaryResponse 주석과 같은 판단).
 */
export interface SubWorkListItem {
  subWorkId: number;
  title: string;
  /** 스키마상 항상 채워진다(sub_work.work_id NOT NULL) — nullable로 두는 것은 방어적 표기다 */
  work: SubWorkWorkRef | null;
  subWorkTypeId: number;
  subWorkTypeName: string;
  owner: SubWorkMemberRef | null;
  workStatus: WorkSttsCd;
  approvalStatus: AprvSttsCd;
  progressRate: number;
  dueAt: string | null;
  /** dly_yn 컬럼이 아니라 서버가 조회 시점에 판정한 값이다 (SubWorkDetail.isDelayed와 같다) */
  isDelayed: boolean;
}
