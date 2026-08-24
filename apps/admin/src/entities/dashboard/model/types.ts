import type { ApprovalInboxItem } from "@/entities/approval";
import type { SubWorkListItem } from "@/entities/sub-work";

/**
 * 운영 대시보드 (ssccops-server OPS-038 · GET /v1/dashboard · ssccops-web#60).
 *
 * 세 영역 모두 다른 화면이 이미 쓰는 항목 타입을 그대로 재사용한다 — 승인 대기는 승인함
 * (ApprovalInboxItem), 다가오는 마감·내 업무는 하위 업무 목록(SubWorkListItem)과 서버 쪽에서
 * 같은 DTO(ApprovalInboxItemResponse·SubWorkSummaryResponse)를 쓴다. 대시보드가 같은 자원을
 * 다른 도메인 타입으로 다시 정의하면 위젯과 원래 화면(승인함·하위 업무 목록)이 다른 값을
 * 보여줄 여지가 생긴다.
 */
export interface DashboardData {
  /** 승인함(OPS-017) 대기 탭의 미리보기 — 마감 오름차순 앞쪽 5건. 전체는 승인함에서 본다 */
  pendingApproval: ApprovalInboxItem[];
  /** 조회 시점 기준 ±5일 범위에 마감이 있고 완료되지 않은 하위 업무 */
  upcomingDeadlines: SubWorkListItem[];
  /** 담당자가 조회 주체 본인인 하위 업무 전량(완료 건 포함) — 전체·마감임박·지연 필터는 화면 몫 */
  myTasks: SubWorkListItem[];
}
