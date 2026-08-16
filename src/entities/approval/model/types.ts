import type { AprvSttsCd, AutzrRoleCd, EmrgSeCd } from "@/shared/config/codes";
import type { VoteChoice } from "@/entities/sub-work";

/** table: sub_work_aprv — 하위_업무_승인 */
export interface SubWorkAprv {
  /** 식별자N19 · PK */
  subWorkAprvId: number;
  /** FK sub_work.sub_work_id */
  subWorkId: number;
  /** 승인 처리 주체 회원 — 유형의 승인자_역할에 해당하는 회원 */
  mbrId: number;
  /** 일시TS — 책임자 승인 일시. 미승인은 null */
  subWorkAprvDt: string | null;
  /** 여부B — 등록자=승인자 식별 */
  rgtrAprvYn: boolean;
  /** 일반 / 긴급 */
  emrgSeCd: EmrgSeCd;
  /** 사유T — 긴급 시 필수 */
  emrgRsn: string | null;
  /** 일자D — 사후 승인 기한 */
  epfcAprvTermYmd: string | null;
  /** 단계V20 — 위험도 기반 승인 단계 */
  aprvStp: string | null;
}

/** table: sub_work_aprv_vote — 하위_업무_승인_투표 */
export interface SubWorkAprvVote {
  aprvVoteId: number;
  subWorkAprvId: number;
  mbrId: number;
  /** 여부B — 찬성/반대 */
  agreYn: boolean | null;
  voteDt: string | null;
}

/** table: sub_work_rjct — 하위_업무_반려 */
export interface SubWorkRjct {
  subWorkRjctId: number;
  subWorkId: number;
  /** 반려 처리 회원 */
  mbrId: number;
  /** 사유T */
  rjctRsn: string | null;
}

/** 정족수 집계 — sub_work_type.minNeedAgreCnt + 투표 결과에서 파생 */
export interface AgreTally {
  need: number;
  agre: number;
  dsagre: number;
}

/* ── 서버 연동 타입 (ssccops-server OPS-017 · GET /v1/approvals · ssccops-web#45) ── */

/**
 * 승인함 화면의 탭. 서버 ApprovalInboxTab과 이름이 같다 — 값 자체가 `status` 쿼리
 * 파라미터로 그대로 나간다.
 */
export type ApprovalInboxTab = "PENDING" | "APPROVED" | "REJECTED";

/**
 * 정족수 진행 (OPS-017 quorum). `needed`가 false면 단독 승인 유형이라 나머지는 전부 null이다
 * — 0으로 채우면 '정족수가 있는데 아무도 찬성하지 않은 상태'와 구별되지 않는다
 * (entities/sub-work의 SubWorkQuorum과 같은 규칙 · 서버 ApprovalQuorumResponse 주석).
 */
export interface ApprovalQuorum {
  needed: boolean;
  requiredCount: number | null;
  currentCount: number | null;
  met: boolean | null;
}

/** 완료 점검 목록 진행 (OPS-017 checklistSummary) — '승인'이 409로 떨어지는 근거를 카드에 싣는다 */
export interface ApprovalChecklistSummary {
  completedCount: number;
  totalCount: number;
}

/**
 * 승인함 카드 한 장 (OPS-017).
 *
 * `canApprove`·`canReject`는 **권한만** 답한다 — "이 회원이 승인자인가"이지 "지금 누르면
 * 성공하는가"가 아니다(entities/sub-work의 SubWorkDetail.canApprove와 같은 규칙). 누를 수
 * 있는지는 quorum.met·checklistSummary로 화면이 따로 판단한다.
 *
 * `myVote`는 **이번 회차**의 내 표다. 반려 후 재상정되면 회차가 바뀌므로 이전 회차의 표는
 * 여기 실리지 않는다(서버가 이미 걸러서 내려준다).
 */
export interface ApprovalInboxItem {
  subWorkId: number;
  title: string;
  approvalStatus: AprvSttsCd;
  subWorkTypeName: string;
  /** 승인자 역할 코드. 기준 코드에 없는 값이 오면 안내 문구만 총칭으로 떨어진다 */
  authorizerRoleCode: AutzrRoleCd | string | null;
  /** 이관 데이터는 등록자가 없다 */
  registrantName: string | null;
  /** 검토요청 일시 — 검토요청을 한 번도 하지 않은 건은 null이다 */
  requestedAt: string | null;
  dueAt: string | null;
  quorum: ApprovalQuorum;
  checklistSummary: ApprovalChecklistSummary;
  myVote: VoteChoice | null;
  /** 탭과 무관하게 직전 반려의 사유다 — 반려된 적이 없으면 null */
  latestRejectionReason: string | null;
  canApprove: boolean;
  canReject: boolean;
}
