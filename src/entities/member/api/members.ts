import type { MbrGrdCd, MbrSttsCd } from "@/shared/config/codes";
import { apiFetch, apiFetchList } from "@/shared/lib/api/client";

/*
 * 회원 조회 API (ssccops-server #76 · MemberController · MemberCodeController).
 *
 * ── 왜 목 `Mbr` 타입과 섞지 않는가 ─────────────────────────────
 * 여기 선언된 타입은 **서버 응답 스키마를 그대로 옮긴 것**이다(memberId·studentNumber …).
 * 데이터사전 표기(mbrId·stdntNo …)를 쓰는 `model/types.ts`의 `Mbr`과 필드 이름이 다른 것은
 * 의도한 것이며, 세션 계약(`entities/session/model/types.ts`)이 같은 판단을 한 것과 같은
 * 이유다 — 두 벌을 한 타입에 섞으면 응답이 바뀌었을 때 어디를 고쳐야 하는지가 흐려진다.
 * 목 스토어(`model/store.ts`)는 아직 운영·회의 화면이 읽고 있어 그대로 두었고, 목록·상세
 * 화면만 이 파일 위로 옮겼다(제거는 ssccops-web#54).
 *
 * ── 등급·상태의 표시 명칭은 서버가 준 값을 쓴다 ────────────────
 * `membershipGradeName`·`membershipStatusName`을 그대로 화면에 뿌린다. `shared/config/codes.ts`의
 * `MBR_GRD_NM`·`MBR_STTS_NM`을 조회하면 기준정보 화면에서 이름을 바꿔도 화면이 따라오지 않는다.
 * 반대로 **뱃지 색은 코드값으로 정한다**(`mbrGrdTone`·`mbrSttsTone`) — 색은 표시 문자열이 아니라
 * 코드의 의미(임시회원인가·탈퇴인가)에 달려 있어 이름이 바뀌어도 그대로여야 한다.
 *
 * 목록·단건 모두 `@RequireAuthority(MEMBER_MANAGE)`다. **조회부터 막혀 있으므로** 화면은 권한이
 * 없으면 아예 열지 않는다(#52의 진입 가드). 기준 코드 두 종은 인증만 요구한다.
 */

/* ── 서버 응답(Response DTO) ────────────────────────────────── */

/** 회원이 현재 맡고 있는 역할 한 건 (MemberRoleResponse) */
export interface MemberRoleRef {
  roleId: number;
  roleName: string;
  /** 여러 현재 역할 중 대표로 표시할 하나 */
  representative: boolean;
}

/**
 * 변경 이력의 종류 (서버 `MemberChangeType` enum을 그대로 옮김).
 *
 * 등급 이력(mbr_grd_hstry)과 상태 이력(mbr_stts_hstry)이 한 목록에 섞여 오므로 각 줄이 어느
 * 쪽에서 왔는지를 이 값이 가른다.
 */
export type MemberChangeType = "GRADE" | "STATUS";

/** 최근 변경 한 줄 (MemberChangeHistoryResponse) */
export interface MemberChange {
  changeType: MemberChangeType;
  /** 가입 시점의 최초 부여에서는 null이다 — 화면은 그 자리를 '신규'로 그린다 */
  previousCode: string | null;
  previousName: string | null;
  newCode: string;
  newName: string;
  /** 일자D — 언제부터 적용되는가 */
  appliedDate: string;
  changeReason: string | null;
  /** 이관·배치로 생긴 이력에는 사람이 없어 null이다 */
  changedByMemberId: number | null;
  changedByName: string | null;
  /** 일시TS — 언제 기록됐는가. 목록 정렬의 기준이다 */
  createdAt: string;
}

/**
 * 회원 목록 한 줄 (MemberSummaryResponse).
 *
 * 등급·상태는 **코드와 명칭이 함께** 내려온다. 분기는 코드로, 표시는 명칭으로 한다.
 * 코드를 `string`이 아니라 유니온으로 두는 것은 뱃지 색 분기가 이 값에 달려 있기 때문이며,
 * 세션 계약(`MemberProfile`)이 같은 자리에서 같은 선택을 했다.
 */
export interface MemberSummary {
  memberId: number;
  studentNumber: string | null;
  generationNumber: number | null;
  name: string;
  departmentName: string | null;
  academicYear: number | null;
  phoneNumber: string | null;
  email: string | null;
  membershipGradeCode: MbrGrdCd;
  membershipGradeName: string;
  membershipStatusCode: MbrSttsCd;
  membershipStatusName: string;
  /** 일자D — yyyy-MM-dd */
  joinDate: string;
  /**
   * 계정과 연결된 회원인가 — 즉 한 번이라도 로그인한 적이 있는가 (서버 `auth_user_id` 유무).
   *
   * CSV로 이관만 되고 아직 로그인하지 않은 회원을 명부에서 가려내는 값이다. 이 회원들은
   * 시스템으로 연락이 닿지 않으므로 목록에서 구분되어 보여야 한다.
   */
  linkedAccount: boolean;
  roles: MemberRoleRef[];
  createdAt: string;
  updatedAt: string;
}

/** 회원 단건 (MemberDetailResponse) — 목록과 같은 프로필에 최근 변경 이력 3건이 붙는다 */
export interface MemberDetail extends MemberSummary {
  /** 등급·상태 이력을 섞어 기록 시각 역순으로 **최근 3건**만 온다 */
  recentChanges: MemberChange[];
}

/** 기준 코드 한 건 (MemberGradeResponse · MemberStatusResponse) — 두 응답의 모양이 같다 */
export interface MemberCodeOption<T extends string> {
  code: T;
  name: string;
  /** 순번N5 — 서버가 이미 이 순서로 내려주지만 근거를 화면에 남긴다 */
  displayOrder: number | null;
}

export type MemberGradeOption = MemberCodeOption<MbrGrdCd>;
export type MemberStatusOption = MemberCodeOption<MbrSttsCd>;

/* ── 오류 코드 ─────────────────────────────────────────────── */

/**
 * 회원 API가 돌려주는 오류 코드 (ssccops-server MemberErrorCode).
 *
 * **enum 이름이 아니라 본문에 실리는 코드 문자열이다.** 서버의 `MEMBER_NOT_FOUND`는 코드로
 * `"NOT_FOUND"`를, `INVALID_CURSOR`는 `"VALIDATION_FAILED"`를 내린다 — enum 이름을 적어 두면
 * 어느 화면도 못 알아본다(업무 도메인에서 같은 자리를 이미 한 번 겪었다).
 */
export const MEMBER_ERROR = {
  /** 없는 회원 (404) */
  MEMBER_NOT_FOUND: "NOT_FOUND",
  /** 커서 해독 실패·조건 형식 오류 (400) */
  VALIDATION_FAILED: "VALIDATION_FAILED",
  /** 기준 코드에 없는 등급·상태·정렬 값 (400) */
  INVALID_CODE_VALUE: "INVALID_CODE_VALUE",
  /** MEMBER_MANAGE 권한 없음 (403) */
  FORBIDDEN: "FORBIDDEN",
} as const;

/* ── 목록 ──────────────────────────────────────────────────── */

/**
 * 정렬 파라미터 (서버 `MemberSortOrder`) — 앞의 `-`가 내림차순이다.
 *
 * 화면의 정렬 토글 4종과 **1:1**로 대응한다. 서버는 여덟 표기(오름/내림 각 4)를 받지만 화면이
 * 쓰는 것은 각 축에서 사람이 기대하는 한 방향뿐이다 — 이름은 가나다순(오름), 기수·가입일·수정은
 * 최근 것이 위(내림). 서버가 모르는 표기는 조용히 기본값으로 떨어지지 않고 400
 * `INVALID_CODE_VALUE`이므로 문자열을 화면에서 만들지 않고 이 유니온으로 못 박는다.
 */
export type MemberSortParam =
  | "mbrNm"
  | "-mbrNm"
  | "genNo"
  | "-genNo"
  | "joinYmd"
  | "-joinYmd"
  | "mdfcnDt"
  | "-mdfcnDt";

/**
 * 회원 목록 조회 조건.
 *
 * **모든 축이 서버 질의 파라미터다.** 받아 온 페이지를 화면에서 다시 거르면, 목록이 나뉜
 * 순간부터 현재 페이지 밖의 회원이 검색·필터 결과에서 통째로 빠진다 — 명부에서는 "없는
 * 사람"과 "이 페이지에 없는 사람"이 화면상 구별되지 않아 알아채기 어려운 종류의 누락이다.
 */
export interface MemberListFilter {
  /** 이름·학번 부분일치. 빈 문자열이면 보내지 않는다 */
  q?: string | null;
  /** 등급 코드 복수 선택 — 비어 있으면 등급으로 거르지 않는다 */
  mbrGrdCds?: readonly MbrGrdCd[];
  mbrSttsCds?: readonly MbrSttsCd[];
  /** 생략하면 서버 기본값(mbrNm · 이름 오름차순) */
  sort?: MemberSortParam | null;
  /** 직전 응답의 nextCursor. 첫 페이지는 생략한다 */
  cursor?: string | null;
  /** 1~100 · 서버 기본 20 */
  size?: number | null;
}

export interface MemberListPage {
  members: MemberSummary[];
  /** 다음 페이지 커서 — 마지막 페이지면 null */
  nextCursor: string | null;
  hasNext: boolean;
  /** 필터를 적용한 건수 */
  totalCount: number;
  /** 필터 이전 전체 건수 — 화면의 "N명 · 전체 M명"에서 M이다 */
  overallCount: number;
}

/**
 * GET /v1/members — 회원 명부 (AP-11 커서 페이징).
 *
 * 등급·상태는 같은 이름의 파라미터를 **여러 번** 실어 복수 선택을 표현한다(서버가
 * `List<String>`으로 받는다). 빈 배열이면 아예 싣지 않는다 — 빈 값 하나를 보내는 것과 같은
 * 뜻이지만, 보내지 않는 편이 요청 문자열과 "전체"라는 화면 상태가 그대로 겹친다.
 */
export async function fetchMembers(filter: MemberListFilter = {}): Promise<MemberListPage> {
  const query = new URLSearchParams();
  const q = filter.q?.trim();
  if (q) query.set("q", q);
  for (const code of filter.mbrGrdCds ?? []) query.append("mbrGrdCd", code);
  for (const code of filter.mbrSttsCds ?? []) query.append("mbrSttsCd", code);
  if (filter.sort) query.set("sort", filter.sort);
  if (filter.cursor) query.set("cursor", filter.cursor);
  if (filter.size != null) query.set("size", String(filter.size));

  const qs = query.toString();
  const { data, page } = await apiFetchList<MemberSummary>(
    qs ? `/v1/members?${qs}` : "/v1/members",
  );

  return {
    members: data,
    nextCursor: page?.nextCursor ?? null,
    hasNext: page?.hasNext ?? false,
    totalCount: page?.totalCount ?? data.length,
    /*
     * 전체 건수는 필터를 걸지 않았을 때의 수라 걸린 건수보다 작을 수 없다. 봉투가 없으면
     * (목록이 아닌 응답을 목록으로 읽은 경우) 걸린 건수로 떨어뜨려 "3명 · 전체 0명"처럼
     * 앞뒤가 안 맞는 문장이 화면에 뜨지 않게 한다.
     */
    overallCount: page?.overallCount ?? page?.totalCount ?? data.length,
  };
}

/* ── 단건 ──────────────────────────────────────────────────── */

/**
 * GET /v1/members/{memberId} — 프로필 · 현재 역할 · 최근 변경 이력 3건.
 *
 * 목록에서 find()로 고르지 않고 반드시 이 호출을 쓴다 — 목록 응답에는 변경 이력이 없고,
 * URL로 바로 들어온 경우 목록 자체가 메모리에 없다. 없는 회원은 404 `NOT_FOUND`이며 권한이
 * 없으면 403이다(서버가 존재 자체를 404로 감추지 않는다 · VR-M10).
 */
export async function fetchMember(memberId: number): Promise<MemberDetail> {
  return apiFetch<MemberDetail>(`/v1/members/${memberId}`);
}

/* ── 기준 코드 ─────────────────────────────────────────────── */

/**
 * GET /v1/member-grades — 회원 등급 기준 코드 (표시 순번 오름차순).
 *
 * 필터 칩을 이 목록으로 그린다. 코드 사전(`MBR_GRD_CDS`)을 돌리지 않는 것은 등급이 기준정보
 * 테이블(mbr_grd)이라 운영 중에 이름이 바뀔 수 있기 때문이다 — 순서와 명칭의 근거는 서버다.
 */
export async function fetchMemberGrades(): Promise<MemberGradeOption[]> {
  const grades = await apiFetch<MemberGradeOption[] | null>("/v1/member-grades");
  return grades ?? [];
}

/** GET /v1/member-statuses — 회원 상태 기준 코드. 규칙은 등급과 같다 */
export async function fetchMemberStatuses(): Promise<MemberStatusOption[]> {
  const statuses = await apiFetch<MemberStatusOption[] | null>("/v1/member-statuses");
  return statuses ?? [];
}
