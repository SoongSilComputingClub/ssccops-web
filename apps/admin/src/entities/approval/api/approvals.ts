import type { AprvSttsCd } from "@/shared/config/codes";
import { apiFetchList } from "@/shared/lib/api/client";
import type { VoteChoice } from "@/entities/sub-work";
import type {
  ApprovalChecklistSummary,
  ApprovalInboxItem,
  ApprovalInboxTab,
  ApprovalQuorum,
} from "../model/types";

/*
 * 승인함 API (ssccops-server OPS-017 · GET /v1/approvals · ssccops-web#45).
 *
 * **서버 응답의 모양을 아는 곳은 이 파일 하나로 제한한다** — 하위 업무 도메인(entities/
 * sub-work/api/sub-works.ts)이 잡아 둔 규칙 그대로다. quorum·checklistSummary는 하위 업무
 * 상세와 모양이 같지만, 승인함 카드가 무엇을 필요로 하는지는 그 화면의 사정이라 타입을
 * 공유하지 않고 이 파일이 따로 옮긴다 — 두 계약 중 하나만 바뀌어도 알아챌 수 있어야 한다.
 *
 * 조회는 인가(#9)를 걸지 않는다(서버 ApprovalController 주석) — 화면이 운영진 전체에게 같은
 * 승인함을 보여주기 때문이다. 그래서 하위 업무 도메인과 달리 "권한이 없습니다" 오류 문구를
 * 따로 두지 않는다.
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
  authorizerAuthorityCode: string | null;
  authorizerAuthorityName: string | null;
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

/** entities/sub-work의 toQuorum과 같은 규칙 — 0으로 채우지 않는다 */
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
    authorizerAuthorityCode: res.authorizerAuthorityCode,
    authorizerAuthorityName: res.authorizerAuthorityName,
    registrantName: res.registrantName,
    requestedAt: res.requestedAt,
    dueAt: res.dueAt,
    quorum: toQuorum(res.quorum),
    checklistSummary: toChecklistSummary(res.checklistSummary),
    myVote: res.myVote,
    latestRejectionReason: res.latestRejectionReason,
    // 권한 값이 빠진 응답을 '가능'으로 읽지 않는다 (하위 업무 상세와 같은 판단)
    canApprove: res.canApprove === true,
    canReject: res.canReject === true,
  };
}

export interface ApprovalInboxPage {
  approvals: ApprovalInboxItem[];
  /** 다음 페이지 커서 — 마지막 페이지면 null */
  nextCursor: string | null;
  hasNext: boolean;
  /** 이 탭 기준 건수 */
  totalCount: number;
  /** 탭(필터) 없는 전체 건수 */
  overallCount: number;
}

export interface ApprovalInboxFilter {
  tab: ApprovalInboxTab;
  /** 직전 응답의 nextCursor. 첫 페이지는 생략한다 */
  cursor?: string | null;
  /** 1~100 · 서버 기본 20 */
  size?: number | null;
}

/**
 * GET /v1/approvals — 승인함 조회 (OPS-017).
 *
 * 화면 진입과 탭(대기·승인·반려) 전환이 모두 이 하나를 부른다. 정렬은 서버가 마감 오름차순으로
 * 고정한다 — 이 화면에는 정렬 컨트롤이 없다(서버 ApprovalInboxSearchCondition 주석).
 */
export async function fetchApprovals(
  filter: ApprovalInboxFilter,
): Promise<ApprovalInboxPage> {
  const query = new URLSearchParams();
  query.set("status", filter.tab);
  if (filter.cursor) query.set("cursor", filter.cursor);
  if (filter.size != null) query.set("size", String(filter.size));

  const { data, page } = await apiFetchList<ApprovalInboxItemResponse>(
    `/v1/approvals?${query.toString()}`,
  );

  return {
    approvals: data.map(toApprovalInboxItem),
    nextCursor: page?.nextCursor ?? null,
    hasNext: page?.hasNext ?? false,
    totalCount: page?.totalCount ?? data.length,
    overallCount: page?.overallCount ?? data.length,
  };
}
