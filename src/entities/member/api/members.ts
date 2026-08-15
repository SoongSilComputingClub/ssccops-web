import type { MemberProfile } from "@/entities/session";
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
  /**
   * 지금과 같은 값으로의 등급·상태 변경 (400 · #48 · 서버 `MemberErrorCode.NO_CHANGE`).
   *
   * 서버가 `VALIDATION_FAILED`로 뭉개지 않고 전용 문자열을 내리는 것은 화면이 이것만 다르게
   * 안내해야 하기 때문이다 — 값이 잘못된 것이 아니라 **바뀐 것이 없다**. 시트는 애초에 같은
   * 값이면 저장 버튼을 잠가 여기까지 오지 않게 한다.
   */
  NO_CHANGE: "NO_CHANGE",
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

/* ── 담당자 후보 ───────────────────────────────────────────── */

/**
 * 담당자로 지정할 수 있는 회원 한 명 (MemberAssignableResponse · 서버 #76).
 *
 * ── 왜 `MemberSummary`를 재사용하지 않는가 ─────────────────────
 * **응답이 다르기 때문이다.** 이 목록은 `MEMBER_MANAGE` 없이 인증만으로 열리므로 서버가
 * 연락처·이메일·학번·부서·가입일을 아예 내리지 않는다. `MemberSummary`로 받으면 타입상
 * 있어야 할 값이 런타임에 `undefined`로 비고, 화면이 그것을 "값이 없는 회원"으로 그린다 —
 * 명부에는 있는 값이 담당자 선택 화면에서만 사라진 것처럼 보인다.
 *
 * 그래서 **화면도 여기 있는 값만 그린다.** 담당자를 고를 때 필요한 것은 동명이인을 가르는
 * 정도(기수·등급·대표 역할)이고, 그 이상은 권한 있는 명부 화면(#46)이 보여 준다.
 */
export interface AssignableMember {
  memberId: number;
  name: string;
  /** 아직 기수를 배정받지 않은 회원은 null이다 — 표기는 `generationText` */
  generationNumber: number | null;
  membershipGradeCode: MbrGrdCd;
  membershipGradeName: string;
  /** 현재 맡은 대표 역할 하나. 역할이 없으면 null이다 */
  representativeRoleName: string | null;
}

/**
 * GET /v1/members/assignable — 담당자·책임자로 지정할 수 있는 회원 전량.
 *
 * **인증만 요구한다**(`MEMBER_MANAGE`가 아니다). 담당자를 고르는 일은 운영진이면 누구나
 * 하는데 명부 열람 권한은 그보다 좁아, 같은 권한으로 묶으면 업무를 등록할 수 있는 사람이
 * 담당자 목록을 못 받는 자리가 생긴다.
 *
 * **페이징이 없다.** 서버가 탈퇴·제명 회원을 이미 걸러 활동 회원만 배열로 내린다 — 선택
 * 목록이 페이지로 잘리면 다음 페이지의 회원은 담당자로 지정할 길 자체가 없어진다.
 *
 * 목 회원 스토어에서 후보를 고르지 않는 이유는 `oper.pic_id`·`mtg.mtg_rbprsn_id`가 모두
 * `mbr.mbr_id`를 가리키는 FK이기 때문이다 — 목 데이터의 1~12번은 서버의 같은 번호와 아무
 * 관계가 없어, 화면에 뜬 이름과 실제로 배정되는 사람이 갈린다(#53 · 상위 업무 조회가 #36에서
 * 같은 이유로 서버 재조회가 됐다).
 */
export async function fetchAssignableMembers(): Promise<AssignableMember[]> {
  const members = await apiFetch<AssignableMember[] | null>("/v1/members/assignable");
  return members ?? [];
}

/* ── 수정 ──────────────────────────────────────────────────── */

/**
 * 입력값 길이·범위 상한 (데이터사전 `mbr` 컬럼 · 서버 `MemberUpdateRequest`의 @Size·@Min·@Max).
 *
 * 서버가 400으로 거절할 값을 화면이 먼저 걸러 주려는 것이고, **판정 근거는 서버다** — 여기
 * 숫자가 낡으면 화면이 통과시킨 값이 서버에서 막힐 뿐 그 반대는 없다.
 */
export const MEMBER_FIELD_MAX = {
  /** 회원_명V50 — 유일한 필수 항목이다 */
  name: 50,
  /** 학과_명V100 */
  departmentName: 100,
  /** 전화번호V20 */
  phoneNumber: 20,
  /** 이메일V255 */
  email: 255,
} as const;

/** 학년_번호N1은 1~4다 (서버 @Min(1) @Max(4)) */
export const ACADEMIC_YEAR_MIN = 1;
export const ACADEMIC_YEAR_MAX = 4;

/**
 * PATCH /v1/members/{memberId} 요청 본문 (서버 `MemberUpdateRequest` · #77).
 *
 * ── PATCH이지만 부분 수정이 아니라 **전체 교체**다 ──────────────
 * 서버가 record + 전체 교체(PUT 의미)로 확정했다(근거는 `MemberUpdateRequest` 주석). 그래서
 * **생략한 선택 필드는 '건드리지 마라'가 아니라 '지워라'로 읽힌다.** 바뀐 값만 골라 보내면
 * 나머지 항목이 조용히 비워진다 — 이 파일의 타입에 `?`를 두지 않고 여섯 필드를 모두 필수로
 * 둔 것이 그 사고를 막는 장치다. 화면은 폼을 서버 응답으로 채우고 통째로 되돌려 보낸다.
 *
 * ── 여기 없는 필드가 곧 계약이다 ────────────────────────────────
 * 등급·상태는 변경 이력을 함께 남겨야 해 전용 API가 따로 있고(#48), 학번·가입일은 가입 후
 * 변경 불가로 확정됐다(ssccops#74). 요청 본문에 자리가 없으므로 넣어도 무시된다.
 *
 * `generationNumber`의 null은 '지움'이 아니라 **미배정**이다 — `gen_no`가 NOT NULL이라 지울
 * 자리가 없고, 서버가 null을 0(미배정 센티널)으로 바꿔 저장한다(가입 경로와 같다).
 */
export interface MemberUpdateInput {
  generationNumber: number | null;
  name: string;
  departmentName: string | null;
  academicYear: number | null;
  phoneNumber: string | null;
  email: string | null;
}

/**
 * PATCH /v1/members/me 요청 본문 (서버 `MemberSelfUpdateRequest` · #77).
 *
 * 운영진 경로에서 **기수와 이메일이 빠진** 모양이다. 서버가 DTO를 나눈 것 자체가 권한 차이의
 * 표현이므로 화면도 같은 경계를 그린다 — 기수는 운영진이 배정하는 값이고, 이메일은 Supabase
 * 인증 계정에서 오는 값이라 본인이 바꾸면 로그인 계정과 갈린다.
 *
 * 전체 교체 의미는 운영진 경로와 같다.
 */
export type MemberSelfUpdateInput = Omit<
  MemberUpdateInput,
  "generationNumber" | "email"
>;

/**
 * PATCH /v1/members/{memberId} — 운영진이 남의 회원 정보를 고친다 (`MEMBER_MANAGE`).
 *
 * 응답은 조회와 같은 `MemberDetailResponse`라 저장 직후의 화면을 다시 조회 없이 그릴 수 있다.
 * 오류는 404 `NOT_FOUND` · 400 `VALIDATION_FAILED`(재학 회원이 학과·학년을 비움) · 403이다.
 */
export async function updateMember(
  memberId: number,
  input: MemberUpdateInput,
): Promise<MemberDetail> {
  return apiFetch<MemberDetail>(`/v1/members/${memberId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/**
 * PATCH /v1/members/me — 본인이 자기 정보를 고친다 (인증 + 가입).
 *
 * **경로에도 본문에도 대상 회원을 넣을 자리가 없다.** 대상은 언제나 인증 주체 본인이며, 자리를
 * 만들지 않는 것이 남의 행에 닿는 경로를 막는 방법이라는 것이 서버의 판단이다.
 *
 * 응답이 세션(`GET /v1/auth/session`)의 member 블록과 **같은 모양**이라, 저장 뒤 세션을 다시
 * 조회하지 않고 그대로 스토어에 넣을 수 있다(가입 API가 이미 쓰는 계약이다). 그래서 응답
 * 타입도 세션의 `MemberProfile`을 그대로 가져다 쓴다 — 같은 DTO를 이 파일에 한 벌 더 적으면
 * 서버가 필드를 하나 늘렸을 때 세션과 여기가 갈리고, 그 갈림은 사이드바에 옛 이름이 남는
 * 식으로만 드러난다. 타입만 가져오므로(import type) 런타임 의존은 생기지 않는다.
 */
export async function updateMyProfile(
  input: MemberSelfUpdateInput,
): Promise<MemberProfile> {
  return apiFetch<MemberProfile>("/v1/members/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/* ── 등급·상태 변경 ────────────────────────────────────────── */

/**
 * 변경 사유(`grd_chg_rsn_cn` · `stts_chg_rsn_cn`) 상한 — 서버 `@Size(max = 500)`.
 *
 * `MEMBER_FIELD_MAX`와 같은 이유로 화면이 먼저 걸러 주는 값이며 판정 근거는 서버다.
 */
export const CHANGE_REASON_MAX = 500;

/**
 * 등급·상태 변경 응답에 함께 실리는 경고 한 줄 (MemberChangeWarningResponse · 서버 #78).
 *
 * **경고는 요청을 막지 않는다.** 400이 아니라 200 응답에 실려 오는 사실이다 — 탈퇴·제명으로
 * 옮긴 회원이 아직 쥐고 있는 역할·하위 업무의 건수이며, 서버는 그것들을 자동으로 정리하지
 * 않는다(운영 규칙이 정해지지 않아 부수 효과를 넣지 않기로 했다). 그래서 **화면이 이 사실을
 * 사람에게 넘기는 마지막 지점**이고, 사라지는 토스트로 알리면 아무도 처리하지 않은 채 조직을
 * 떠난 회원이 국장 역할을 그대로 쥐고 남는다.
 *
 * `count`가 문구와 따로 실려 오는 것은 화면이 값으로 쓸 수 있게 하기 위해서다.
 */
export interface MemberChangeWarning {
  code: string;
  message: string;
  count: number;
}

/** 경고 코드 (서버 `MemberChangeWarningResponse`의 상수) — 화면은 코드로 분기한다 */
export const MEMBER_CHANGE_WARNING = {
  /** 조직을 떠난 회원에게 아직 종료되지 않은 역할이 남았다 */
  CURRENT_ROLES_REMAIN: "CURRENT_ROLES_REMAIN",
  /** 조직을 떠난 회원이 아직 담당 중인(완료되지 않은) 하위 업무가 남았다 */
  ASSIGNED_SUB_WORKS_REMAIN: "ASSIGNED_SUB_WORKS_REMAIN",
} as const;

/**
 * 등급·상태 변경 결과 (MemberGradeChangeResponse · MemberStatusChangeResponse).
 *
 * 두 응답의 모양이 같아 타입도 하나로 둔다 — 시트가 한 컴포넌트라 같은 처리로 받는다(서버가
 * 등급 응답에도 `warnings`를 둔 이유가 그것이다. 등급 쪽은 언제나 빈 목록이다).
 *
 * `member`는 조회와 같은 `MemberDetailResponse`이고 `recentChanges` 맨 앞에 방금 남긴 이력이
 * 들어 있다 — **저장 직후 상세를 다시 조회하지 않는다.** 다시 조회하면 왕복 한 번 동안 옛
 * 뱃지가 남고, 그 사이 다른 사람이 바꾼 값이 섞여 방금 내가 한 변경과 구분되지 않는다.
 */
export interface MemberChangeResult {
  member: MemberDetail;
  warnings: MemberChangeWarning[];
}

/**
 * POST /v1/members/{memberId}/grade-changes 요청 본문 (서버 `MemberGradeChangeRequest`).
 *
 * **변경자(`chnrgMbrId`)를 싣지 않는다.** 서버가 인증 주체에서 가져간다 — 화면이 세션의
 * 회원 번호를 적어 보내면 "누가 바꿨는가"를 요청자가 스스로 정하는 것이라 이력이 증거가
 * 되지 못한다. 본문에 자리를 만들지 않는 것이 그 경로를 막는 방법이다.
 *
 * `grdAplcnYmd`를 생략하면 **서버의 오늘**이다. 화면이 자기 시계로 오늘을 채워 보내지 않는
 * 것은 시간대가 다른 기기에서 하루 어긋난 이력이 남기 때문이다. 미래 일자는 400
 * `VALIDATION_FAILED`다.
 *
 * `grdChgRsnCn`은 적지 않았으면 `null`이다 — '사유 미기재' 같은 문자열을 화면이 지어내면
 * 사유가 없다는 사실이 사유처럼 이력에 남는다.
 */
export interface MemberGradeChangeInput {
  aftrMbrGrdCd: MbrGrdCd;
  /** 일자D · 생략하면 서버의 오늘 */
  grdAplcnYmd?: string | null;
  /** 최대 500자 · 없으면 null */
  grdChgRsnCn?: string | null;
}

/**
 * POST /v1/members/{memberId}/status-changes 요청 본문 (서버 `MemberStatusChangeRequest`).
 *
 * 변경자·적용 일자·사유의 규칙은 등급과 같다({@link MemberGradeChangeInput}).
 *
 * `sttsEndPrnmntYmd`(상태_종료_예정_일자)는 **휴학·군휴학에만** 실을 수 있다
 * ({@link statusAllowsExpectedEndDate}). 다른 상태에 실려 오면 서버가 조용히 버리지 않고
 * 400 `VALIDATION_FAILED`로 거절한다 — 이력 행이 뒤에 고칠 수 없게 잠겨 있어, 버리면
 * 운영자는 적어 넣었다고 믿는데 어디에도 남지 않기 때문이다.
 */
export interface MemberStatusChangeInput {
  aftrMbrSttsCd: MbrSttsCd;
  /** 일자D · 생략하면 서버의 오늘 */
  sttsAplcnYmd?: string | null;
  /** 일자D · 휴학·군휴학에만 실을 수 있다. 그 밖의 상태에서는 보내지 않는다 */
  sttsEndPrnmntYmd?: string | null;
  /** 최대 500자 · 없으면 null */
  sttsChgRsnCn?: string | null;
}

/**
 * 종료 예정일을 가질 수 있는 상태인가 (서버 `MemberStatusCode.allowsExpectedEndDate`).
 *
 * 끝이 정해진 상태 — 휴학·군휴학뿐이다. 재학·졸업·탈퇴·제명에는 '언제 끝나는가'가 없다.
 * **판정 근거는 서버**이며 화면의 이 함수는 입력란을 열지 말지를 정하는 것뿐이다. 서버가
 * 목록을 넓히면 화면은 칸을 감춰 사용자가 값을 못 넣을 뿐이고, 반대(화면이 열고 서버가
 * 거절)는 400으로 드러난다.
 */
export function statusAllowsExpectedEndDate(code: MbrSttsCd): boolean {
  return code === "LEAVE" || code === "MIL_LEAVE";
}

/** 서버가 `warnings`를 빠뜨렸어도 화면이 `.map`에서 터지지 않게 배열로 굳힌다 */
function toChangeResult(raw: MemberChangeResult): MemberChangeResult {
  return { member: raw.member, warnings: raw.warnings ?? [] };
}

/**
 * POST /v1/members/{memberId}/grade-changes — 등급 변경 + 이력(mbr_grd_hstry) 기록 (`MEMBER_MANAGE`).
 *
 * 회원 정보 수정(PATCH)에 등급 필드가 없는 것이 곧 계약이다 — 같은 API에 섞으면 이력 없이
 * 등급이 바뀌는 경로가 반드시 생긴다. 서버가 mbr 갱신과 이력 INSERT를 한 트랜잭션으로 묶는다.
 *
 * 201이 아니라 200인 것은 결과가 '새 자원'이 아니기 때문이다(이력 행을 가리키는 조회 경로가
 * 없어 Location에 실을 URI가 없다). 화면이 받는 것은 바뀐 회원이다.
 *
 * 오류는 400 `NO_CHANGE`(같은 값) · 400 `VALIDATION_FAILED`(미래 일자) ·
 * 400 `INVALID_CODE_VALUE`(기준 코드 밖) · 404 `NOT_FOUND` · 403이다.
 */
export async function changeMemberGrade(
  memberId: number,
  input: MemberGradeChangeInput,
): Promise<MemberChangeResult> {
  const raw = await apiFetch<MemberChangeResult>(`/v1/members/${memberId}/grade-changes`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return toChangeResult(raw);
}

/**
 * POST /v1/members/{memberId}/status-changes — 상태 변경 + 이력(mbr_stts_hstry) 기록 (`MEMBER_MANAGE`).
 *
 * 규칙은 등급과 같고, 여기에만 종료 예정일이 있다({@link MemberStatusChangeInput}).
 * 탈퇴·제명으로 옮기면 `warnings`가 채워져 온다 — 남은 역할·하위 업무는 서버가 정리하지
 * 않으므로 화면이 반드시 보여 줘야 한다({@link MemberChangeWarning}).
 */
export async function changeMemberStatus(
  memberId: number,
  input: MemberStatusChangeInput,
): Promise<MemberChangeResult> {
  const raw = await apiFetch<MemberChangeResult>(`/v1/members/${memberId}/status-changes`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return toChangeResult(raw);
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
