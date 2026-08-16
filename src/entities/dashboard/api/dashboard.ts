import type { AprvSttsCd, AutzrRoleCd, WorkSttsCd } from "@/shared/config/codes";
import { apiFetch } from "@/shared/lib/api/client";
import type {
  ApprovalChecklistSummary,
  ApprovalInboxItem,
  ApprovalQuorum,
} from "@/entities/approval";
import type {
  SubWorkListItem,
  SubWorkMemberRef,
  SubWorkWorkRef,
  VoteChoice,
} from "@/entities/sub-work";
import type { DashboardData } from "../model/types";

/*
 * 운영 대시보드 API (ssccops-server OPS-038 · GET /v1/dashboard · ssccops-web#60).
 *
 * **서버 응답의 모양을 아는 곳은 이 파일 하나로 제한한다** — 승인함(entities/approval/api/
 * approvals.ts)·하위 업무 목록(entities/sub-work/api/sub-works.ts)이 잡아 둔 규칙 그대로다.
 * `pendingApproval`은 승인함 카드(ApprovalInboxItemResponse)와, `upcomingDeadlines`·`myTasks`는
 * 하위 업무 목록 행(SubWorkSummaryResponse)과 서버 쪽에서 같은 DTO를 쓰지만, 이 파일은 그
 * 계약을 다시 옮겨 적는다 — 두 계약 중 하나만 바뀌어도 이 파일이 따로 깨져야 알아챌 수 있다
 * (approvals.ts가 QuorumResponse·ChecklistSummaryResponse를 다시 옮겨 적은 것과 같은 판단).
 *
 * 인가는 WORK_MANAGE 권한이다(서버 #9 · DashboardController 클래스 애노테이션) — 업무·하위
 * 업무를 요약하는 화면이라 그 둘과 같은 권한으로 잠긴다. 쿼리 파라미터는 없다 — 세 영역 모두
 * 조회 주체·조회 시점만으로 정해진다.
 */

interface QuorumResponse {
  needed: boolean | null;
  requiredCount: number | null;
  currentCount: number | null;
  met: boolean | null;
}

interface ChecklistSummaryResponse {
  completedCount: number | null;
  totalCount: number | null;
}

interface ApprovalInboxItemResponse {
  subWorkId: number;
  title: string | null;
  approvalStatus: AprvSttsCd;
  subWorkTypeName: string | null;
  authorizerRoleCode: string | null;
  registrantName: string | null;
  requestedAt: string | null;
  dueAt: string | null;
  quorum: QuorumResponse | null;
  checklistSummary: ChecklistSummaryResponse | null;
  myVote: VoteChoice | null;
  latestRejectionReason: string | null;
  canApprove: boolean | null;
  canReject: boolean | null;
}

interface SubWorkSummaryWorkResponse {
  workId: number | null;
  title: string | null;
}

interface SubWorkSummaryMemberResponse {
  memberId: number | null;
  name: string | null;
}

interface SubWorkSummaryResponse {
  subWorkId: number;
  title: string | null;
  work: SubWorkSummaryWorkResponse | null;
  subWorkTypeId: number | null;
  subWorkTypeName: string | null;
  owner: SubWorkSummaryMemberResponse | null;
  workStatus: WorkSttsCd;
  approvalStatus: AprvSttsCd;
  progressRate: number | null;
  dueAt: string | null;
  isDelayed: boolean | null;
}

interface DashboardResponse {
  pendingApproval: ApprovalInboxItemResponse[] | null;
  upcomingDeadlines: SubWorkSummaryResponse[] | null;
  myTasks: SubWorkSummaryResponse[] | null;
}

/** entities/approval의 toQuorum과 같은 규칙 — 0으로 채우지 않는다 */
function toQuorum(res: QuorumResponse | null): ApprovalQuorum {
  if (!res?.needed) {
    return { needed: false, requiredCount: null, currentCount: null, met: null };
  }
  return {
    needed: true,
    requiredCount: res.requiredCount,
    currentCount: res.currentCount,
    met: res.met,
  };
}

function toChecklistSummary(
  res: ChecklistSummaryResponse | null,
): ApprovalChecklistSummary {
  return { completedCount: res?.completedCount ?? 0, totalCount: res?.totalCount ?? 0 };
}

function toApprovalInboxItem(res: ApprovalInboxItemResponse): ApprovalInboxItem {
  return {
    subWorkId: res.subWorkId,
    title: res.title ?? "",
    approvalStatus: res.approvalStatus,
    subWorkTypeName: res.subWorkTypeName ?? "",
    authorizerRoleCode: res.authorizerRoleCode as AutzrRoleCd | string | null,
    registrantName: res.registrantName,
    requestedAt: res.requestedAt,
    dueAt: res.dueAt,
    quorum: toQuorum(res.quorum),
    checklistSummary: toChecklistSummary(res.checklistSummary),
    myVote: res.myVote,
    latestRejectionReason: res.latestRejectionReason,
    canApprove: res.canApprove === true,
    canReject: res.canReject === true,
  };
}

function toMemberRef(member: SubWorkSummaryMemberResponse | null): SubWorkMemberRef | null {
  if (!member || member.memberId == null) return null;
  return { memberId: member.memberId, name: member.name ?? "" };
}

function toWorkRef(work: SubWorkSummaryWorkResponse | null): SubWorkWorkRef | null {
  if (!work || work.workId == null) return null;
  return { workId: work.workId, title: work.title ?? "" };
}

/** DECIMAL(5,2) — 서버는 60.00처럼 내려준다. 값이 없으면 0% */
function toProgressRate(value: number | null): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toSubWorkListItem(res: SubWorkSummaryResponse): SubWorkListItem {
  return {
    subWorkId: res.subWorkId,
    title: res.title ?? "",
    work: toWorkRef(res.work),
    subWorkTypeId: res.subWorkTypeId ?? 0,
    subWorkTypeName: res.subWorkTypeName ?? "",
    owner: toMemberRef(res.owner),
    workStatus: res.workStatus,
    approvalStatus: res.approvalStatus,
    progressRate: toProgressRate(res.progressRate),
    dueAt: res.dueAt,
    isDelayed: res.isDelayed === true,
  };
}

/**
 * GET /v1/dashboard — 운영 대시보드 (OPS-038).
 *
 * 화면 진입 한 번으로 세 영역을 함께 채운다 — 승인 대기 미리보기 · 다가오는 마감(±5일) ·
 * 내 업무 목록(담당자 본인 전량, 전체·마감임박·지연 필터는 화면이 그 위에서 나눈다).
 */
export async function fetchDashboard(): Promise<DashboardData> {
  const res = await apiFetch<DashboardResponse>("/v1/dashboard");
  return {
    pendingApproval: (res.pendingApproval ?? []).map(toApprovalInboxItem),
    upcomingDeadlines: (res.upcomingDeadlines ?? []).map(toSubWorkListItem),
    myTasks: (res.myTasks ?? []).map(toSubWorkListItem),
  };
}
