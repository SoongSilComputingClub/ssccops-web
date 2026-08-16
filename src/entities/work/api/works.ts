import type {
  AprvSttsCd,
  OperTypeCd,
  PrrtyRnkCd,
  WorkSttsCd,
  WorkTypeCd,
} from "@/shared/config/codes";
import { ApiError, apiFetch, apiFetchList } from "@/shared/lib/api/client";
import { withServiceOffset } from "@/shared/lib/date";
import type {
  WorkDetail,
  WorkListItem,
  WorkMemberRef,
  WorkSubWorkSummary,
} from "../model/types";

/*
 * 업무 API (ssccops-server OPS-002 등록 · OPS-003 상세 · OPS-020 목록 · #66).
 *
 * **서버 응답의 모양을 아는 곳은 이 파일 하나로 제한한다** — 폼 도메인(api/forms.ts)이 잡아
 * 둔 규칙 그대로다. 화면이 응답 객체를 그대로 들고 다니면 계약이 바뀔 때마다 뷰 전체를
 * 훑어야 한다. 여기서 도메인 타입으로 옮기고 나면 고칠 곳은 아래 `to*` 함수뿐이다.
 *
 * 세 엔드포인트 모두 WORK_MANAGE 권한이 걸려 있다 (서버 #9 · WorkController 클래스 애노테이션).
 * **조회도 함께 막힌다** — 목록·상세에 담당자와 진행 상황이 들어 있기 때문이다. 권한이 없으면
 * 403 FORBIDDEN이며, 미가입(SIGNUP_REQUIRED)과 달리 apiFetch가 화면을 옮기지 않는다.
 */

/* ── 서버 응답(Response DTO) ────────────────────────────────── */

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

interface WorkSubWorkSummaryResponse {
  subWorkId: number;
  title: string | null;
  owner: MemberSummaryResponse | null;
  workStatus: WorkSttsCd;
  approvalStatus: AprvSttsCd;
  progressRate: number | null;
  dueAt: string | null;
}

interface WorkDetailResponse {
  workId: number;
  operationId: number;
  operationType: OperTypeCd;
  title: string | null;
  workType: WorkTypeCd;
  workStatus: WorkSttsCd;
  priority: PrrtyRnkCd;
  owner: MemberSummaryResponse | null;
  registrant: MemberSummaryResponse | null;
  startAt: string | null;
  endAt: string | null;
  generalReview: string | null;
  progressRate: number | null;
  subWorkCount: number | null;
  subWorks: WorkSubWorkSummaryResponse[] | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface WorkCreateResponse {
  workId: number | null;
  operationId: number | null;
  title: string | null;
  itemType: WorkTypeCd | null;
  workStatus: WorkSttsCd | null;
  ownerId: number | null;
  registrantId: number | null;
  startAt: string | null;
  endAt: string | null;
  priority: PrrtyRnkCd | null;
  review: string | null;
  progressRate: number | null;
  createdAt: string | null;
}

/* ── 응답 → 도메인 ─────────────────────────────────────────── */

/**
 * 담당자 요약. 서버는 담당자를 반드시 채우지만 등록자는 이관 데이터에서 null이다.
 *
 * 이름이 비었다고 "-"로 채우지 않는다 — 값이 없으면 없는 대로 드러나야 하고, 표시용 폴백은
 * 그리는 쪽(뷰)이 정한다.
 */
function toMemberRef(member: MemberSummaryResponse | null): WorkMemberRef | null {
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

function toSubWorkSummary(res: WorkSubWorkSummaryResponse): WorkSubWorkSummary {
  return {
    subWorkId: res.subWorkId,
    title: res.title ?? "",
    owner: toMemberRef(res.owner),
    workStatus: res.workStatus,
    approvalStatus: res.approvalStatus,
    progressRate: toProgressRate(res.progressRate),
    dueAt: res.dueAt,
  };
}

function toWorkDetail(res: WorkDetailResponse): WorkDetail {
  const subWorks = (res.subWorks ?? []).map(toSubWorkSummary);
  return {
    workId: res.workId,
    operationId: res.operationId,
    operationType: res.operationType,
    title: res.title ?? "",
    workType: res.workType,
    workStatus: res.workStatus,
    priority: res.priority,
    owner: toMemberRef(res.owner),
    registrant: toMemberRef(res.registrant),
    startAt: res.startAt,
    endAt: res.endAt,
    generalReview: res.generalReview,
    progressRate: toProgressRate(res.progressRate),
    // 건수는 목록 길이와 같은 값이지만 서버가 준 값을 그대로 쓴다 (분모가 갈리지 않게)
    subWorkCount: res.subWorkCount ?? subWorks.length,
    subWorks,
    createdAt: res.createdAt,
    updatedAt: res.updatedAt,
  };
}

/* ── 오류 코드 ─────────────────────────────────────────────── */

/**
 * 업무 API가 돌려주는 오류 코드 (ssccops-server OperationErrorCode).
 *
 * **enum 이름이 아니라 본문에 실리는 코드 문자열이다.** 서버의 `WORK_NOT_FOUND`는 코드로
 * `"NOT_FOUND"`를, `OWNER_NOT_ACTIVE_MEMBER`·`INVALID_OPERATION_PERIOD`는 둘 다
 * `"VALIDATION_FAILED"`를 내린다 — enum 이름을 적어 두면 어느 화면도 못 알아본다
 * (폼 도메인에서 실제로 그렇게 어긋난 적이 있다).
 */
export const WORK_ERROR = {
  /** 없는 업무 · 소프트 삭제된 업무 (404) */
  WORK_NOT_FOUND: "NOT_FOUND",
  /** 필수값 누락·형식 오류·담당자 부적격·기간 역전 (400) */
  VALIDATION_FAILED: "VALIDATION_FAILED",
  /** 기준 코드에 없는 값 (400) — 상태·유형·정렬 파라미터가 어긋났을 때 */
  INVALID_CODE_VALUE: "INVALID_CODE_VALUE",
  /** WORK_MANAGE 권한 없음 (403) */
  FORBIDDEN: "FORBIDDEN",
} as const;

/* ── 목록 ──────────────────────────────────────────────────── */

/** 업무 목록 필터 — 값이 없으면(null) 그 축을 거르지 않는다 */
export interface WorkListFilter {
  workStatus?: WorkSttsCd | null;
  workType?: WorkTypeCd | null;
  /** 직전 응답의 nextCursor. 첫 페이지는 생략한다 */
  cursor?: string | null;
  /** 1~100 · 서버 기본 20 */
  size?: number | null;
}

export interface WorkListPage {
  works: WorkListItem[];
  /** 다음 페이지 커서 — 마지막 페이지면 null */
  nextCursor: string | null;
  hasNext: boolean;
  /** 필터를 적용한 건수 */
  totalCount: number;
}

/**
 * GET /v1/works — 카드 목록 (OPS-020).
 *
 * 커서 페이징이라 `page` 봉투가 필요하다 — `apiFetch`는 data만 돌려주므로 `apiFetchList`를
 * 쓴다. 정렬은 서버 기본값(-createdAt · 등록 최신순)에 맡긴다. 방금 등록한 업무가 맨 위에
 * 오는 순서라 등록 직후 목록으로 돌아오는 흐름과 맞고, 시안에 정렬 UI가 없다.
 */
export async function fetchWorks(filter: WorkListFilter = {}): Promise<WorkListPage> {
  const query = new URLSearchParams();
  if (filter.workStatus) query.set("workStatus", filter.workStatus);
  if (filter.workType) query.set("workType", filter.workType);
  if (filter.cursor) query.set("cursor", filter.cursor);
  if (filter.size != null) query.set("size", String(filter.size));

  const qs = query.toString();
  const { data, page } = await apiFetchList<WorkListItemResponse>(
    qs ? `/v1/works?${qs}` : "/v1/works",
  );

  return {
    works: data.map(toWorkListItem),
    nextCursor: page?.nextCursor ?? null,
    hasNext: page?.hasNext ?? false,
    totalCount: page?.totalCount ?? data.length,
  };
}

/* ── 상세 ──────────────────────────────────────────────────── */

/**
 * GET /v1/works/{workId} — 상세 (OPS-003).
 *
 * 목록에서 find()로 고르지 않고 반드시 이 호출을 쓴다 — 목록 응답에는 하위 업무 목록도
 * 우선순위도 총평도 없고, URL로 바로 들어온 경우 목록 자체가 메모리에 없다.
 * 없는 업무·소프트 삭제된 업무는 404 `NOT_FOUND`다.
 */
export async function fetchWork(workId: number): Promise<WorkDetail> {
  const work = await apiFetch<WorkDetailResponse>(`/v1/works/${workId}`);
  return toWorkDetail(work);
}

/* ── 수정 ──────────────────────────────────────────────────── */

/**
 * PATCH /v1/works/{workId} — 기본 정보 수정 (OPS-004).
 *
 * 등록(OPS-002)과 같은 입력이라 {@link WorkCreateInput}을 그대로 재사용한다 — 서버 요청
 * 필드가 실제로 같고(WorkUpdateRequest), 같은 값을 담는 타입을 하나 더 선언하면 등록·수정이
 * 갈릴 때 어느 쪽을 고쳤는지 헷갈리는 자리가 하나 생긴다.
 *
 * **PATCH이지만 전체 교체다** — review처럼 선택 입력인 필드도 생략하면 서버가 지운 것으로
 * 본다(서버 WorkUpdateRequest 주석). 화면은 그래서 현재 값을 전부 입력란에 채워 보여주고,
 * 부분 입력 폼을 만들지 않는다.
 *
 * `workStatus`는 요청에 없다 — 이 경로로 상태를 바꿀 수 없다(POL-003). 응답이 상세 조회와
 * 같은 모양이므로 화면은 수정 직후 재조회 없이 그대로 갱신할 수 있다.
 */
export async function updateWork(
  workId: number,
  input: WorkCreateInput,
): Promise<WorkDetail> {
  const res = await apiFetch<WorkDetailResponse>(`/v1/works/${workId}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: input.title.trim(),
      itemType: input.itemType,
      ownerId: input.ownerId,
      startAt: withServiceOffset(input.startAt),
      endAt: withServiceOffset(input.endAt),
      priority: input.priority,
      review: input.review?.trim() || null,
    }),
  });
  return toWorkDetail(res);
}

/* ── 등록 ──────────────────────────────────────────────────── */

/**
 * 업무 등록 입력 (OPS-002).
 *
 * 화면에 있는 값 중 여기 없는 것들이 있다 — 업무_상태·진행률·등록자·등록일시는 **서버가
 * 정한다.** 상태는 항상 기획(PLANNING)으로 고정되고 등록자는 인증 주체에서 온다. 진행률은
 * 하위 업무가 붙어야 나오는 집계값이라 등록 시점에 받지 않는다.
 *
 * `ownerId`는 활동 회원이어야 한다 — 없거나 활동 회원이 아니면 400 VALIDATION_FAILED
 * (OWNER_NOT_ACTIVE_MEMBER)다.
 */
export interface WorkCreateInput {
  title: string;
  /** 업무_유형 — 서버는 같은 값을 요청에서만 itemType으로 부른다 (응답·상세는 workType) */
  itemType: WorkTypeCd;
  ownerId: number;
  startAt: string | null;
  endAt: string | null;
  /** 생략하면 서버가 NORMAL로 저장한다 */
  priority: PrrtyRnkCd;
  /** 총평_내용 — "지금은 비워도 됩니다" 안내대로 선택 입력이다 */
  review: string | null;
}

/** 등록 결과 — 화면은 곧바로 이 workId의 상세로 이동한다 */
export interface WorkCreateResult {
  workId: number;
  operationId: number | null;
  title: string;
  workStatus: WorkSttsCd;
}

/**
 * POST /v1/works — 업무 등록 (OPS-002).
 *
 * 일시에는 **오프셋을 반드시 붙인다.** `datetime-local` 입력은 `"2026-09-12T10:00"`처럼
 * 오프셋 없는 값을 주는데 서버의 `startAt`·`endAt`은 `OffsetDateTime`이라 본문 파싱 단계에서
 * 400으로 튕긴다 (폼 저장이 같은 자리에서 한 번 겪었다 · withServiceOffset 주석).
 *
 * `workId` 없이 성공으로 처리하지 않는다 — 등록의 목적이 그 업무의 상세로 가는 것이라,
 * ID를 모른 채 "등록했습니다"만 띄우면 사용자가 방금 만든 업무를 목록에서 스스로 찾아야 한다.
 */
export async function createWork(input: WorkCreateInput): Promise<WorkCreateResult> {
  const res = await apiFetch<WorkCreateResponse | null>("/v1/works", {
    method: "POST",
    body: JSON.stringify({
      title: input.title.trim(),
      itemType: input.itemType,
      ownerId: input.ownerId,
      startAt: withServiceOffset(input.startAt),
      endAt: withServiceOffset(input.endAt),
      priority: input.priority,
      review: input.review?.trim() || null,
    }),
  });

  if (!res?.workId) {
    throw new ApiError(
      WORK_ERROR.VALIDATION_FAILED,
      "업무는 등록됐지만 서버가 업무_ID를 돌려주지 않았습니다. 목록에서 확인해주세요",
    );
  }

  return {
    workId: res.workId,
    operationId: res.operationId ?? null,
    title: res.title ?? input.title.trim(),
    // 서버가 PLANNING으로 고정하는 값이라 폴백도 같은 값이다
    workStatus: res.workStatus ?? "PLANNING",
  };
}
