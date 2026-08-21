import type {
  AprvSttsCd,
  OperTypeCd,
  PrrtyRnkCd,
  WorkSttsCd,
} from "@/shared/config/codes";
import { ApiError, apiFetch, apiFetchList } from "@/shared/lib/api/client";
import { withServiceOffset } from "@/shared/lib/date";
import type {
  SubWorkChecklistItem,
  SubWorkChecklistSummary,
  SubWorkChecklistUpdate,
  SubWorkDetail,
  SubWorkListItem,
  SubWorkMemberRef,
  SubWorkQuorum,
  SubWorkRejection,
  SubWorkTransition,
  SubWorkTransitionResult,
  SubWorkVoteResult,
  VoteChoice,
} from "../model/types";

/*
 * 하위 업무 API (ssccops-server OPS-007 등록 · #36 / OPS-009 상세 · OPS-010 전이 ·
 * OPS-013 체크리스트 · OPS-030 기본 정보 수정 · #39).
 *
 * **서버 응답의 모양을 아는 곳은 이 파일 하나로 제한한다** — 폼·업무 도메인이 잡아 둔 규칙
 * 그대로다. 화면이 응답 객체를 그대로 들고 다니면 계약이 바뀔 때마다 뷰 전체를 훑어야 한다.
 *
 * 인가는 상위 업무와 같은 `WORK_MANAGE`다 (서버 #9 · SubWorkController 클래스 애노테이션) —
 * 상위 업무와 하위 업무를 나눠 부여할 이유가 없다는 판단이고, 그래서 화면도 업무 등록과 같은
 * capability로 잠근다. **조회도 함께 막힌다** — 담당자와 진행 상황이 들어 있기 때문이다.
 *
 * 승인·반려 자격은 이 권한과 **별개**다(서버 ApprovalAuthorityPolicy) — '무슨 일을 하는
 * 사람인가'가 아니라 '이 건의 승인자 본인인가'라 건마다 답이 달라진다. 그 판정은 웹이 역할
 * 이름으로 다시 계산하지 않고 상세 응답의 canApprove·canReject를 그대로 쓴다.
 *
 * 투표(OPS-015)도 여기 있다 — 승인함(ssccops-web#45)이 이 파일의 voteOnSubWork를 쓴다.
 * 투표 자격(운영진이면 누구나)은 승인·반려 자격과 또 다르다(서버 ApprovalAuthorityPolicy.
 * requireStaff) — 화면은 그 구분도 판정하지 않고 서버가 던지는 403을 그대로 문구로 옮긴다.
 */

/** 외부_URL_주소 최대 길이 (sub_work.otsd_url_addr 주소V200) — 서버 400을 기다리지 않고 먼저 걸러 준다 */
export const EXTERNAL_LINK_MAX_LENGTH = 200;

/**
 * 하위 업무 API가 돌려주는 오류 코드 (ssccops-server OperationErrorCode).
 *
 * **enum 이름이 아니라 본문에 실리는 코드 문자열이다.** 서버의 `WORK_NOT_FOUND`·
 * `SUB_WORK_TYPE_NOT_FOUND`는 둘 다 `"NOT_FOUND"`를, `OWNER_NOT_ACTIVE_MEMBER`·
 * `INVALID_OPERATION_PERIOD`·`SUB_WORK_TYPE_INACTIVE`는 셋 다 `"VALIDATION_FAILED"`를
 * 내린다 — enum 이름을 적어 두면 어느 화면도 못 알아본다.
 *
 * 그래서 **한 코드에 여러 사유가 겹친다.** 어느 칸을 고쳐야 하는지는 서버 메시지에만 남아
 * 있으므로 이 두 코드는 문구를 뭉개지 말고 서버 문장을 그대로 보여 준다.
 */
export const SUB_WORK_ERROR = {
  /** 담당자 부적격·기간 역전·꺼진 유형·필수값 누락·반려 사유 500자 초과 (400) */
  VALIDATION_FAILED: "VALIDATION_FAILED",
  /** 기준 코드에 없는 값 (400) — 우선_순위·전이 액션이 어긋났을 때 */
  INVALID_CODE_VALUE: "INVALID_CODE_VALUE",
  /**
   * 없는(삭제된) 상위 업무 · 없는 하위 업무 유형 · 없는 하위 업무 · 이 하위 업무의 것이 아닌
   * 체크리스트 항목 (404). 마지막 것을 403으로 나누지 않는 것은 서버가 그렇게 정했기 때문이다 —
   * 남의 하위 업무에 그 번호의 항목이 있는지가 새어 나가지 않는다.
   */
  NOT_FOUND: "NOT_FOUND",
  /** WORK_MANAGE 권한 없음 · **이 건의 승인자가 아님** (403) — 서버가 두 뜻에 같은 코드를 쓴다 */
  FORBIDDEN: "FORBIDDEN",
  /**
   * 전이표(TR-01~TR-04)에 없는 상태 전환 (409). 완료된 건의 체크 해제도 이 코드다 —
   * 서버가 전용 코드를 새로 만들지 않고 재사용한다(SubWorkEntity.requireChecklistEditable).
   */
  TRANSITION_NOT_ALLOWED: "TRANSITION_NOT_ALLOWED",
  /** 완료 점검 목록을 다 채우지 않은 채 완료 승인 (409) */
  COMPLETION_CRITERIA_UNMET: "COMPLETION_CRITERIA_UNMET",
  /** 정족수 유형에서 찬성 수가 모자란 채로 완료 승인 (409) — 투표가 아니라 최종 승인에서 난다 */
  QUORUM_NOT_MET: "QUORUM_NOT_MET",
  /** 반려 사유 누락 (422). **길이 초과는 400 VALIDATION_FAILED로 갈린다** */
  REASON_REQUIRED: "REASON_REQUIRED",
  /** 이미 소프트 삭제된 하위 업무를 다시 삭제 시도 (409, 서버 #125) */
  ALREADY_DELETED: "ALREADY_DELETED",
} as const;

/** 반려 사유 최대 길이 (sub_work_rjct.rjct_rsn · OPS-010 reason) — 초과는 400이다 */
export const REJECT_REASON_MAX_LENGTH = 500;

/* ── 서버 응답(Response DTO) ────────────────────────────────── */

/*
 * 등록 응답에서 **화면이 실제로 쓰는 필드만** 옮긴다.
 *
 * 서버는 담당자·기간·우선순위·체크리스트 항목까지 한 벌을 다 내려주지만, 등록을 마친 화면은
 * 상위 업무 상세로 이동해 그쪽 조회 응답을 다시 받는다 — 여기서 전부 받아 적으면 쓰지도 않는
 * 필드가 계약이 바뀔 때마다 고쳐야 할 자리로만 남는다.
 */
interface SubWorkCreateResponse {
  subWorkId: number | null;
  workId: number | null;
  title: string | null;
  subWorkTypeId: number | null;
  subWorkTypeName: string | null;
  workStatus: WorkSttsCd | null;
  approvalStatus: AprvSttsCd | null;
  /** 유형의 완료 점검 항목을 복사해 서버가 함께 만든다 (등록과 동시에 생긴다) */
  checklist: unknown[] | null;
}

/* ── 등록 ──────────────────────────────────────────────────── */

/**
 * 하위 업무 등록 입력 (OPS-007).
 *
 * 화면에 있는 값 중 여기 없는 것들이 있다 — 업무_상태·승인_상태·지연_여부·완료 체크리스트는
 * **서버가 정한다.** 상태는 항상 기획(PLANNING)이고, 승인_상태는 고른 유형의 승인 필요 여부에서
 * 결정되며, 체크리스트는 그 유형의 완료 점검 항목을 복사해 등록과 동시에 만들어진다.
 * 등록자도 인증 주체에서 온다.
 *
 * `ownerId`는 활동 회원이어야 한다 — 없거나 활동 회원이 아니면 400 VALIDATION_FAILED
 * (OWNER_NOT_ACTIVE_MEMBER)다. `subWorkTypeId`는 **사용 중인 유형**이어야 한다(꺼진 유형은
 * 400 SUB_WORK_TYPE_INACTIVE) — 화면이 유형 목록을 `useYn=true`로 받는 이유다.
 */
export interface SubWorkCreateInput {
  /** 상위 업무 — 하위 업무는 상위 업무 안에서만 생긴다 */
  workId: number;
  title: string;
  subWorkTypeId: number;
  ownerId: number;
  startAt: string | null;
  /** oper의 종료_일시. 화면의 '마감_일시' 한 칸이 dueAt과 함께 이 값도 채운다 */
  endAt: string | null;
  /** sub_work의 마감_일시 — 지연 판정·마감 임박 조회가 이 값에 걸려 있다 */
  dueAt: string | null;
  /** 생략하면 서버가 NORMAL로 저장한다 */
  priority: PrrtyRnkCd;
  /** 업무_내용 — 선택 입력 */
  content: string | null;
  /** 외부_URL_주소 — 선택 입력. URL 형식이어야 하고 200자를 넘을 수 없다 */
  externalLink: string | null;
}

/** 등록 결과 — 화면은 곧바로 상위 업무 상세로 돌아가 이 하위 업무가 붙은 것을 확인한다 */
export interface SubWorkCreateResult {
  subWorkId: number;
  workId: number | null;
  title: string;
  subWorkTypeName: string;
  workStatus: WorkSttsCd;
  approvalStatus: AprvSttsCd | null;
  /** 서버가 유형에서 복사해 만든 완료 점검 항목 수 */
  checklistCount: number;
}

/**
 * POST /v1/sub-works — 하위 업무 등록 (OPS-007).
 *
 * 일시에는 **오프셋을 반드시 붙인다.** `datetime-local` 입력은 `"2026-09-12T10:00"`처럼
 * 오프셋 없는 값을 주는데 서버의 `startAt`·`endAt`·`dueAt`은 `OffsetDateTime`이라 본문 파싱
 * 단계에서 400으로 튕긴다 (업무 등록·폼 저장이 같은 자리에서 겪었다 · withServiceOffset 주석).
 *
 * `subWorkId` 없이 성공으로 처리하지 않는다 — 등록의 목적이 그 하위 업무가 상위 업무에 붙는
 * 것이라, ID를 모른 채 "등록했습니다"만 띄우면 정말 만들어졌는지 확인할 길이 없다.
 */
export async function createSubWork(
  input: SubWorkCreateInput,
): Promise<SubWorkCreateResult> {
  const res = await apiFetch<SubWorkCreateResponse | null>("/v1/sub-works", {
    method: "POST",
    body: JSON.stringify({
      workId: input.workId,
      title: input.title.trim(),
      subWorkTypeId: input.subWorkTypeId,
      ownerId: input.ownerId,
      startAt: withServiceOffset(input.startAt),
      endAt: withServiceOffset(input.endAt),
      dueAt: withServiceOffset(input.dueAt),
      priority: input.priority,
      content: input.content?.trim() || null,
      externalLink: input.externalLink?.trim() || null,
    }),
  });

  if (!res?.subWorkId) {
    throw new ApiError(
      SUB_WORK_ERROR.VALIDATION_FAILED,
      "하위 업무는 등록됐지만 서버가 하위_업무_ID를 돌려주지 않았습니다. 상위 업무 상세에서 확인해주세요",
    );
  }

  return {
    subWorkId: res.subWorkId,
    workId: res.workId ?? input.workId,
    title: res.title ?? input.title.trim(),
    subWorkTypeName: res.subWorkTypeName ?? "",
    // 서버가 기획(PLANNING)으로 고정하는 값이라 폴백도 같은 값이다
    workStatus: res.workStatus ?? "PLANNING",
    approvalStatus: res.approvalStatus ?? null,
    checklistCount: res.checklist?.length ?? 0,
  };
}

/* ── 목록 (OPS-008 · #28·#74) ──────────────────────────────── */

interface SubWorkListWorkResponse {
  workId: number | null;
  title: string | null;
}

interface SubWorkListMemberResponse {
  memberId: number | null;
  name: string | null;
}

interface SubWorkListItemResponse {
  subWorkId: number;
  title: string | null;
  work: SubWorkListWorkResponse | null;
  subWorkTypeId: number | null;
  subWorkTypeName: string | null;
  owner: SubWorkListMemberResponse | null;
  workStatus: WorkSttsCd;
  approvalStatus: AprvSttsCd;
  progressRate: number | null;
  dueAt: string | null;
  isDelayed: boolean | null;
}

function toListMemberRef(member: SubWorkListMemberResponse | null): SubWorkMemberRef | null {
  if (!member || member.memberId == null) return null;
  return { memberId: member.memberId, name: member.name ?? "" };
}

function toWorkRef(work: SubWorkListWorkResponse | null): SubWorkListItem["work"] {
  if (!work || work.workId == null) return null;
  return { workId: work.workId, title: work.title ?? "" };
}

/** DECIMAL(5,2) — 서버는 60.00처럼 내려준다. 값이 없으면 0% */
function toListProgressRate(value: number | null): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toSubWorkListItem(res: SubWorkListItemResponse): SubWorkListItem {
  return {
    subWorkId: res.subWorkId,
    title: res.title ?? "",
    work: toWorkRef(res.work),
    subWorkTypeId: res.subWorkTypeId ?? 0,
    subWorkTypeName: res.subWorkTypeName ?? "",
    owner: toListMemberRef(res.owner),
    workStatus: res.workStatus,
    approvalStatus: res.approvalStatus,
    progressRate: toListProgressRate(res.progressRate),
    dueAt: res.dueAt,
    isDelayed: res.isDelayed === true,
  };
}

/**
 * 하위 업무 목록 필터 — 값을 생략하면(null·undefined) 그 축을 거르지 않는다.
 *
 * 화면의 필터 칩(전체·진행·승인대기·마감임박·지연·완료)은 features/sub-work/model/
 * use-sub-work-list.ts가 이 필터로 옮긴다 — 칩 이름과 쿼리 파라미터의 대응 규칙을 API
 * 파일이 아니라 그 훅 쪽에 둔 것은, 칩 구성이 화면 정책(#28 설계 결정 6)이라 서버 계약과
 * 같은 층에 두면 안 되기 때문이다.
 */
export interface SubWorkListFilter {
  workStatus?: WorkSttsCd | null;
  /** 승인대기 칩이 PENDING·REAPPROVAL_REQUIRED 두 값을 함께 건다 (#28 설계 결정 5) */
  approvalStatus?: AprvSttsCd[] | null;
  /** true만 의미가 있다 — 서버가 false를 필터 없음으로 무시한다 */
  isOverdue?: boolean | null;
  /** ISO-8601 + 오프셋. `dueWithinDays`로 만든다 */
  dueBefore?: string | null;
  /** 직전 응답의 nextCursor. 첫 페이지는 생략한다 */
  cursor?: string | null;
  /** 1~100 · 서버 기본 20 */
  size?: number | null;
}

export interface SubWorkListPage {
  subWorks: SubWorkListItem[];
  /** 다음 페이지 커서 — 마지막 페이지면 null */
  nextCursor: string | null;
  hasNext: boolean;
  /** 필터를 적용한 건수 — 화면 상단 'N건' */
  totalCount: number;
  /** 필터 없는 전체 건수 — 화면 상단 '전체 M건' */
  overallCount: number;
}

/**
 * GET /v1/sub-works — 하위 업무 목록 (OPS-008).
 *
 * '운영 통합 › 하위 업무' 화면이 진입할 때와 필터 칩을 누를 때마다 호출한다. 상위 업무를
 * 가로지르는 목록이라 상위 업무 상세(OPS-003)의 하위 업무 목록과는 다른 리소스다.
 *
 * 승인 상태는 **복수 값**을 반복 쿼리 파라미터로 보낸다(`approvalStatus=PENDING&
 * approvalStatus=REAPPROVAL_REQUIRED`) — 업무 목록(fetchWorks)의 단일값 필터와 다른 점이다.
 */
export async function fetchSubWorks(
  filter: SubWorkListFilter = {},
): Promise<SubWorkListPage> {
  const query = new URLSearchParams();
  if (filter.workStatus) query.set("workStatus", filter.workStatus);
  for (const status of filter.approvalStatus ?? []) {
    query.append("approvalStatus", status);
  }
  if (filter.isOverdue) query.set("isOverdue", "true");
  if (filter.dueBefore) query.set("dueBefore", filter.dueBefore);
  if (filter.cursor) query.set("cursor", filter.cursor);
  if (filter.size != null) query.set("size", String(filter.size));

  const qs = query.toString();
  const { data, page } = await apiFetchList<SubWorkListItemResponse>(
    qs ? `/v1/sub-works?${qs}` : "/v1/sub-works",
  );

  return {
    subWorks: data.map(toSubWorkListItem),
    nextCursor: page?.nextCursor ?? null,
    hasNext: page?.hasNext ?? false,
    totalCount: page?.totalCount ?? data.length,
    overallCount: page?.overallCount ?? data.length,
  };
}

/* ── 상세 · 전이 · 체크리스트 (OPS-009·010·013) ─────────────── */

interface MemberSummaryResponse {
  memberId: number | null;
  name: string | null;
}

interface ChecklistItemResponse {
  checklistItemId: number;
  article: string | null;
  isCompleted: boolean | null;
  sortOrder: number | null;
}

interface ChecklistSummaryResponse {
  completedCount: number | null;
  totalCount: number | null;
}

interface QuorumResponse {
  needed: boolean | null;
  requiredCount: number | null;
  currentCount: number | null;
  met: boolean | null;
}

interface RejectionResponse {
  rejectionId: number | null;
  rejector: MemberSummaryResponse | null;
  reason: string | null;
  rejectedAt: string | null;
}

interface SubWorkDetailResponse {
  subWorkId: number;
  operationId: number | null;
  workId: number | null;
  workTitle: string | null;
  operationType: OperTypeCd | null;
  title: string | null;
  subWorkTypeId: number | null;
  subWorkTypeName: string | null;
  workStatus: WorkSttsCd;
  approvalStatus: AprvSttsCd;
  approvalRequired: boolean | null;
  authorizerAuthorityCode: string | null;
  authorizerAuthorityName: string | null;
  owner: MemberSummaryResponse | null;
  registrant: MemberSummaryResponse | null;
  collaborators: MemberSummaryResponse[] | null;
  startAt: string | null;
  endAt: string | null;
  dueAt: string | null;
  priority: PrrtyRnkCd;
  content: string | null;
  completionCriteria: string | null;
  externalLink: string | null;
  isDelayed: boolean | null;
  completedAt: string | null;
  checklist: ChecklistItemResponse[] | null;
  checklistSummary: ChecklistSummaryResponse | null;
  quorum: QuorumResponse | null;
  /*
   * 이번 회차의 내 표. 상세 화면에서도 투표하므로 받는다(ssccops-web#82) — 승인함은
   * WORK_MANAGE로 잠겨 있는데 투표 자격(운영진)은 그보다 넓어, 국원은 그 화면에 들어가지
   * 못한 채 자격만 갖고 있었다.
   */
  myVote: VoteChoice | null;
  latestRejection: RejectionResponse | null;
  canApprove: boolean | null;
  canReject: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface SubWorkTransitionResponse {
  subWorkId: number | null;
  transition: SubWorkTransition | null;
  previousWorkStatus: WorkSttsCd | null;
  workStatus: WorkSttsCd | null;
  previousApprovalStatus: AprvSttsCd | null;
  approvalStatus: AprvSttsCd | null;
  isSelfApproval: boolean | null;
  completedAt: string | null;
  /* parentWorkProgressRate는 받지 않는다 — 이 화면에 상위 업무 진행률 표기가 없다 */
  changedAt: string | null;
}

interface ChecklistItemUpdateResponse {
  subWorkId: number | null;
  item: ChecklistItemResponse | null;
  checklistSummary: ChecklistSummaryResponse | null;
}

/* ── 응답 → 도메인 ─────────────────────────────────────────── */

/**
 * 회원 요약. 이름이 비었다고 "-"로 채우지 않는다 — 값이 없으면 없는 대로 드러나야 하고,
 * 표시용 폴백은 그리는 쪽(뷰)이 정한다 (업무 도메인이 잡아 둔 규칙 그대로).
 */
function toMemberRef(member: MemberSummaryResponse | null): SubWorkMemberRef | null {
  if (!member || member.memberId == null) return null;
  return { memberId: member.memberId, name: member.name ?? "" };
}

function toChecklistItem(res: ChecklistItemResponse): SubWorkChecklistItem {
  return {
    checklistItemId: res.checklistItemId,
    article: res.article ?? "",
    isCompleted: res.isCompleted === true,
    sortOrder: res.sortOrder ?? 0,
  };
}

/**
 * '2/4 완료' 표기값.
 *
 * 서버가 비워 보낸 경우에도 목록 길이로 다시 세지 않는다 — 세는 규칙이 두 벌이 되는 순간
 * 상세와 상위 업무 상세(OPS-003)의 진행률이 갈린다. 값이 없으면 0/0이다.
 */
function toChecklistSummary(
  res: ChecklistSummaryResponse | null,
): SubWorkChecklistSummary {
  return {
    completedCount: res?.completedCount ?? 0,
    totalCount: res?.totalCount ?? 0,
  };
}

/**
 * 정족수 진행.
 *
 * `needed`가 false면 나머지는 서버가 null로 내리며 **0으로 채우지 않는다** — 0으로 바꾸면
 * '정족수가 있는데 아무도 찬성하지 않은 상태'와 구별되지 않는다(서버 주석).
 */
function toQuorum(res: QuorumResponse | null): SubWorkQuorum {
  if (!res?.needed) return { needed: false, requiredCount: null, currentCount: null, met: null };
  return {
    needed: true,
    requiredCount: res.requiredCount,
    currentCount: res.currentCount,
    met: res.met,
  };
}

function toRejection(res: RejectionResponse | null): SubWorkRejection | null {
  // 사유가 없는 반려는 서버가 만들지 않는다(REASON_REQUIRED) — 빈 사유면 보여줄 것이 없다
  if (!res || res.rejectionId == null || !res.reason) return null;
  return {
    rejectionId: res.rejectionId,
    rejector: toMemberRef(res.rejector),
    reason: res.reason,
    rejectedAt: res.rejectedAt,
  };
}

function toSubWorkDetail(res: SubWorkDetailResponse): SubWorkDetail {
  const checklist = (res.checklist ?? []).map(toChecklistItem);
  return {
    subWorkId: res.subWorkId,
    operationId: res.operationId ?? 0,
    workId: res.workId ?? 0,
    workTitle: res.workTitle ?? "",
    operationType: res.operationType ?? "SUB_WORK",
    title: res.title ?? "",
    subWorkTypeId: res.subWorkTypeId ?? 0,
    subWorkTypeName: res.subWorkTypeName ?? "",
    workStatus: res.workStatus,
    approvalStatus: res.approvalStatus,
    approvalRequired: res.approvalRequired === true,
    authorizerAuthorityCode: res.authorizerAuthorityCode,
    authorizerAuthorityName: res.authorizerAuthorityName,
    owner: toMemberRef(res.owner),
    registrant: toMemberRef(res.registrant),
    collaborators: (res.collaborators ?? [])
      .map(toMemberRef)
      .filter((m): m is SubWorkMemberRef => m !== null),
    startAt: res.startAt,
    endAt: res.endAt,
    dueAt: res.dueAt,
    priority: res.priority,
    content: res.content,
    completionCriteria: res.completionCriteria,
    externalLink: res.externalLink,
    isDelayed: res.isDelayed === true,
    completedAt: res.completedAt,
    checklist,
    checklistSummary: toChecklistSummary(res.checklistSummary),
    quorum: toQuorum(res.quorum),
    // 정족수 유형이 아니면 서버가 null로 내린다 — 그때는 화면에 찬반 버튼 자체가 없다
    myVote: res.myVote ?? null,
    latestRejection: toRejection(res.latestRejection),
    /*
     * 권한 값이 빠진 응답을 '가능'으로 읽지 않는다. 버튼을 그렸다가 누를 때 403을 받는 것보다
     * 승인자에게 버튼이 잠깐 보이지 않는 쪽이 낫다 — 다시 불러오면 값이 채워진다.
     */
    canApprove: res.canApprove === true,
    canReject: res.canReject === true,
    createdAt: res.createdAt,
    updatedAt: res.updatedAt,
  };
}

/**
 * GET /v1/sub-works/{subWorkId} — 상세 (OPS-009).
 *
 * 상세 화면 한 장이 이 호출 하나로 채워진다 — 단계 스테퍼·공통 속성·확장 속성·완료 점검
 * 목록·승인 판단 근거가 모두 여기서 나온다. 상위 업무 상세(OPS-003)의 하위 업무 요약에서
 * 골라 쓰지 않는다: 그 요약에는 체크리스트도 승인 값도 없고, URL로 바로 들어온 경우 목록
 * 자체가 메모리에 없다.
 *
 * 없는 하위 업무·소프트 삭제된 하위 업무는 404 `NOT_FOUND`다.
 */
export async function fetchSubWork(subWorkId: number): Promise<SubWorkDetail> {
  const detail = await apiFetch<SubWorkDetailResponse>(`/v1/sub-works/${subWorkId}`);
  return toSubWorkDetail(detail);
}

/**
 * POST /v1/sub-works/{subWorkId}/transitions — 상태 전이 (OPS-010).
 *
 * 착수·완료 승인 요청·완료 승인·반려가 **모두 이 하나의 경로**를 쓴다. 상태를 직접 쓰는
 * PATCH 경로는 서버에 없다(POL-003·AP-03) — 화면이 다음 상태를 고르는 것이 아니라 액션을
 * 보내고, 다음 상태는 전이표가 정한다.
 *
 * `reason`은 반려에서만 필수다. 누락은 422 `REASON_REQUIRED`, 500자 초과는 400
 * `VALIDATION_FAILED`로 **코드가 갈린다** — 서버가 필수 여부는 전이 메서드에서, 길이는
 * 요청 DTO에서 보기 때문이다.
 */
export async function transitionSubWork(
  subWorkId: number,
  transition: SubWorkTransition,
  reason: string | null = null,
): Promise<SubWorkTransitionResult> {
  const res = await apiFetch<SubWorkTransitionResponse | null>(
    `/v1/sub-works/${subWorkId}/transitions`,
    {
      method: "POST",
      body: JSON.stringify({ transition, reason: reason?.trim() || null }),
    },
  );

  if (!res?.workStatus) {
    throw new ApiError(
      SUB_WORK_ERROR.VALIDATION_FAILED,
      "상태는 바뀌었지만 서버가 전이 결과를 돌려주지 않았습니다. 화면을 새로고침해주세요",
    );
  }

  return {
    subWorkId: res.subWorkId ?? subWorkId,
    transition: res.transition ?? transition,
    previousWorkStatus: res.previousWorkStatus ?? res.workStatus,
    workStatus: res.workStatus,
    previousApprovalStatus: res.previousApprovalStatus ?? "NOT_REQUIRED",
    approvalStatus: res.approvalStatus ?? "NOT_REQUIRED",
    isSelfApproval: res.isSelfApproval === true,
    completedAt: res.completedAt,
    changedAt: res.changedAt,
  };
}

interface SubWorkVoteResponse {
  subWorkId: number | null;
  myVote: VoteChoice | null;
  met: boolean | null;
  currentCount: number | null;
  requiredCount: number | null;
  approvalSequence: number | null;
}

/**
 * POST /v1/sub-works/{subWorkId}/approvals/votes — 정족수 승인 투표 (OPS-015).
 *
 * 승인함 화면 카드의 `동의`·`부동의` 버튼이 부른다. 표를 새로 만들든 기존 표를 바꾸든 결과가
 * 같은 멱등한 호출이라 실패해도 안전하게 재시도할 수 있다(서버 SubWorkController 주석).
 *
 * 정족수를 쓰지 않는 유형·검토 단계가 아닌 건·이미 처리된 건은 서버가 409
 * `TRANSITION_NOT_ALLOWED`로 막는다 — 화면은 대기 탭에서 정족수가 필요한 카드에만 버튼을
 * 그려 이 경로를 피한다.
 */
export async function voteOnSubWork(
  subWorkId: number,
  vote: VoteChoice,
): Promise<SubWorkVoteResult> {
  const res = await apiFetch<SubWorkVoteResponse | null>(
    `/v1/sub-works/${subWorkId}/approvals/votes`,
    { method: "POST", body: JSON.stringify({ vote }) },
  );

  if (!res?.myVote) {
    throw new ApiError(
      SUB_WORK_ERROR.VALIDATION_FAILED,
      "투표는 반영됐지만 서버가 결과를 돌려주지 않았습니다. 화면을 새로고침해주세요",
    );
  }

  return {
    subWorkId: res.subWorkId ?? subWorkId,
    myVote: res.myVote,
    met: res.met === true,
    currentCount: res.currentCount ?? 0,
    requiredCount: res.requiredCount ?? 0,
    approvalSequence: res.approvalSequence ?? 0,
  };
}

/**
 * PATCH /v1/sub-works/{subWorkId}/checklist/{checklistItemId} — 체크·해제 (OPS-013).
 *
 * 체크와 해제가 같은 경로를 쓰므로 토글이 아니라 **값**을 보낸다 — 화면의 체크박스가 같은
 * 자리에서 켜지고 꺼지기 때문이고, 토글로 두면 요청이 엇갈렸을 때 화면과 서버가 반대로 간다.
 *
 * 완료(DONE)된 건은 되돌릴 수 없어 409 `TRANSITION_NOT_ALLOWED`다. 상태 전이가 아니므로
 * 업무_상태·승인_상태는 응답에 없다 — 체크가 스테퍼를 움직이지 않는다.
 */
export async function updateSubWorkChecklistItem(
  subWorkId: number,
  checklistItemId: number,
  isCompleted: boolean,
): Promise<SubWorkChecklistUpdate> {
  const res = await apiFetch<ChecklistItemUpdateResponse | null>(
    `/v1/sub-works/${subWorkId}/checklist/${checklistItemId}`,
    { method: "PATCH", body: JSON.stringify({ isCompleted }) },
  );

  if (!res?.item) {
    throw new ApiError(
      SUB_WORK_ERROR.VALIDATION_FAILED,
      "체크는 저장됐지만 서버가 결과를 돌려주지 않았습니다. 화면을 새로고침해주세요",
    );
  }

  return {
    subWorkId: res.subWorkId ?? subWorkId,
    item: toChecklistItem(res.item),
    checklistSummary: toChecklistSummary(res.checklistSummary),
  };
}

/* ── 기본 정보 수정 ────────────────────────────────────────── */

/**
 * 하위 업무 수정 입력 (OPS-030).
 *
 * 등록(SubWorkCreateInput)과 같은 확장 속성이되 **workId·subWorkTypeId가 없다** — 다른
 * 상위 업무로 옮기거나 유형을 바꾸는 기능이 아니다. 유형이 바뀌면 승인 필요 여부·승인자·
 * 정족수·완료 점검 항목이 통째로 달라지는데, 그 값들은 등록 시점에 이미 복사돼 있다
 * (#43 소급 금지 · 서버 SubWorkUpdateRequest 주석).
 *
 * `completionCriteria`(완료 기준 내용)는 등록 화면에 입력란이 없어 늘 비어 있던 값을
 * 처음으로 채울 수 있는 자리다(서버 #70).
 */
export interface SubWorkUpdateInput {
  title: string;
  ownerId: number;
  startAt: string | null;
  /** oper의 종료_일시. 화면의 '마감_일시' 한 칸이 dueAt과 함께 이 값도 채운다 (등록과 같은 규칙) */
  endAt: string | null;
  dueAt: string | null;
  priority: PrrtyRnkCd;
  content: string | null;
  completionCriteria: string | null;
  externalLink: string | null;
}

/**
 * PATCH /v1/sub-works/{subWorkId} — 기본 정보 수정 (OPS-030).
 *
 * **PATCH이지만 전체 교체다** — content·completionCriteria·externalLink처럼 선택 입력인
 * 필드도 생략하면 서버가 지운 것으로 본다(서버 SubWorkUpdateRequest 주석). 화면은 그래서
 * 현재 값을 전부 입력란에 채워 보여주고, 부분 입력 폼을 만들지 않는다.
 *
 * `workStatus`·`subWorkTypeId`는 요청에 없다 — 이 경로로 상태·유형을 바꿀 수 없다. 응답이
 * 상세 조회와 같은 모양이므로(canApprove·canReject·quorum까지) 화면은 수정 직후 재조회 없이
 * 그대로 갱신할 수 있다.
 */
export async function updateSubWork(
  subWorkId: number,
  input: SubWorkUpdateInput,
): Promise<SubWorkDetail> {
  const res = await apiFetch<SubWorkDetailResponse>(`/v1/sub-works/${subWorkId}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: input.title.trim(),
      ownerId: input.ownerId,
      startAt: withServiceOffset(input.startAt),
      endAt: withServiceOffset(input.endAt),
      dueAt: withServiceOffset(input.dueAt),
      priority: input.priority,
      content: input.content?.trim() || null,
      completionCriteria: input.completionCriteria?.trim() || null,
      externalLink: input.externalLink?.trim() || null,
    }),
  });
  return toSubWorkDetail(res);
}

/* ── 삭제 ──────────────────────────────────────────────────── */

/**
 * DELETE /v1/sub-works/{subWorkId} — 소프트 삭제 (서버 #125).
 *
 * 자기 자신만 삭제한다(상위 업무처럼 계단식으로 번지지 않는다). 상태(완료 등)와 무관하게
 * 항상 허용되고, 소유권(담당자 본인)도 보지 않는다 — 다른 하위 업무 쓰기 작업이 쓰는
 * WORK_MANAGE + 소유권 조합과 달리 **SUB_WORK_DELETE 보유 여부만으로** 판정한다
 * (entities/session의 CAPABILITY.SUB_WORK_DELETE 주석 참고). 이미 삭제된 건은 409
 * ALREADY_DELETED, 대상이 아예 없으면 기존 404 NOT_FOUND다.
 */
export async function deleteSubWork(subWorkId: number): Promise<void> {
  await apiFetch<void>(`/v1/sub-works/${subWorkId}`, { method: "DELETE" });
}
