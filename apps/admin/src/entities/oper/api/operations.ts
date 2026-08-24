import type {
  AprvSttsCd,
  AtndTrgtCd,
  MtgSeCd,
  MtgSttsCd,
  WorkSttsCd,
  WorkTypeCd,
} from "@/shared/config/codes";
import { apiFetch } from "@/shared/lib/api/client";
import type { MeetingListItem } from "@/entities/meeting";
import type { SubWorkListItem } from "@/entities/sub-work";
import type { WorkListItem } from "@/entities/work";
import type { OperationsHubData } from "../model/types";

/*
 * 운영 통합 조회 API (ssccops-server OPS-001 · GET /v1/operations · ssccops-web#63).
 *
 * **서버 응답의 모양을 아는 곳은 이 파일 하나로 제한한다** — entities/dashboard/api/
 * dashboard.ts가 잡아 둔 규칙 그대로다. works[]·subWorks[]·meetings[]는 업무 목록(OPS-020)·
 * 하위 업무 목록(OPS-008)·회의 목록(OPS-031)과 서버 쪽에서 같은 DTO를 쓰지만, 이 파일은 그
 * 계약을 다시 옮겨 적는다 — 세 계약 중 하나만 바뀌어도 이 파일이 따로 깨져야 알아챌 수 있다.
 *
 * 인가는 WORK_MANAGE 권한이다(서버 #9 · OperationController 클래스 애노테이션) — 업무·하위
 * 업무·대시보드와 같은 권한이다. 쿼리 파라미터·페이징이 없다 — 전체/업무/하위업무/회의 탭과
 * 우측 트리 묶음은 화면이 응답 배열 위에서 나눈다.
 */

interface MemberSummaryResponse {
  memberId: number | null;
  name: string | null;
}

interface WorkListItemResponse {
  workId: number;
  title: string | null;
  workType: WorkTypeCd;
  workStatus: WorkSttsCd;
  owner: MemberSummaryResponse | null;
  startAt: string | null;
  endAt: string | null;
  progressRate: number | null;
  subWorkCount: number | null;
}

interface SubWorkSummaryWorkResponse {
  workId: number | null;
  title: string | null;
}

interface SubWorkSummaryResponse {
  subWorkId: number;
  title: string | null;
  work: SubWorkSummaryWorkResponse | null;
  subWorkTypeId: number | null;
  subWorkTypeName: string | null;
  owner: MemberSummaryResponse | null;
  workStatus: WorkSttsCd;
  approvalStatus: AprvSttsCd;
  progressRate: number | null;
  dueAt: string | null;
  isDelayed: boolean | null;
}

interface MeetingListItemResponse {
  meetingId: number;
  operationId: number;
  title: string | null;
  meetingCategory: MtgSeCd | null;
  meetingStatus: MtgSttsCd | null;
  attendeeScope: AtndTrgtCd | null;
  personInCharge: MemberSummaryResponse | null;
  location: string | null;
  agendaCount: number | null;
  startAt: string | null;
  endAt: string | null;
  createdAt: string | null;
}

interface OperationHubResponse {
  works: WorkListItemResponse[] | null;
  subWorks: SubWorkSummaryResponse[] | null;
  meetings: MeetingListItemResponse[] | null;
}

/* ── 응답 → 도메인 ─────────────────────────────────────────── */

/** 담당자 요약. 값이 없으면(이관 데이터 등) null로 떨어뜨린다 — 표시 폴백은 뷰의 몫 */
function toMemberRef(member: MemberSummaryResponse | null) {
  if (!member || member.memberId == null) return null;
  return { memberId: member.memberId, name: member.name ?? "" };
}

/** DECIMAL(5,2) — 서버는 70.00처럼 내려준다. 값이 없으면 0% */
function toProgressRate(value: number | null): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toWorkListItem(res: WorkListItemResponse): WorkListItem {
  return {
    workId: res.workId,
    title: res.title ?? "",
    workType: res.workType,
    workStatus: res.workStatus,
    owner: toMemberRef(res.owner),
    startAt: res.startAt,
    endAt: res.endAt,
    progressRate: toProgressRate(res.progressRate),
    subWorkCount: res.subWorkCount ?? 0,
  };
}

function toSubWorkListItem(res: SubWorkSummaryResponse): SubWorkListItem {
  const work =
    res.work && res.work.workId != null
      ? { workId: res.work.workId, title: res.work.title ?? "" }
      : null;
  return {
    subWorkId: res.subWorkId,
    title: res.title ?? "",
    work,
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

function toMeetingListItem(res: MeetingListItemResponse): MeetingListItem {
  return {
    meetingId: res.meetingId,
    operationId: res.operationId,
    title: res.title ?? "",
    meetingCategory: res.meetingCategory,
    meetingStatus: res.meetingStatus,
    attendeeScope: res.attendeeScope,
    personInCharge: toMemberRef(res.personInCharge),
    location: res.location,
    agendaCount: res.agendaCount ?? 0,
    startAt: res.startAt,
    endAt: res.endAt,
    createdAt: res.createdAt,
  };
}

/**
 * GET /v1/operations — 운영 통합 조회 (OPS-001).
 *
 * 화면 진입 한 번으로 세 배열을 함께 받는다 — 상단 유형 카드(건수)·좌측 목록(탭 필터)·
 * 우측 트리(업무→하위 업무 묶음 + 회의)가 전부 이 응답으로 그려진다. 트리는
 * `subWorks[].work.workId`로 묶는다.
 */
export async function fetchOperationsHub(): Promise<OperationsHubData> {
  const res = await apiFetch<OperationHubResponse>("/v1/operations");
  return {
    works: (res.works ?? []).map(toWorkListItem),
    subWorks: (res.subWorks ?? []).map(toSubWorkListItem),
    meetings: (res.meetings ?? []).map(toMeetingListItem),
  };
}
