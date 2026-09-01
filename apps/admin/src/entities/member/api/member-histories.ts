import type { ChgArtclCd } from "@/shared/config/codes";
import { apiFetch } from "@/shared/lib/api/client";

/*
 * 회원 변경 이력 통합 조회 (ssccops-server #82 · #226 · MemberHistoryController).
 *
 * ── 이 목록에 담기는 것이 전부다 ────────────────────────────────
 * 회원의 변화를 남기는 표는 넷이다 — `mbr_grd_hstry`(등급) · `mbr_stts_hstry`(상태) ·
 * `mbr_role_rel`(역할 부여·종료) · `mbr_chg_hstry`(회원 정보 · #237에서 합류했다).
 * 마지막 하나가 늘어난 것이 학번 잠금을 푼 대가다 — "누가 언제 무엇을 무엇으로"를 남기지
 * 못하면 잠금이 지키던 것이 그냥 사라진다(ssccops#161). **여기에도 없는 것이 있다**:
 * 등급·상태·역할·회원 정보 밖의 조작(예: 폼 상태 전이)은 감사 로그 테이블이 없어 쌓이지
 * 않는다. 그래서 화면은 담기는 범위를 문장으로 밝힌다(views/member-history).
 *
 * **이력이 생기기 전의 수정은 없다.** 회원 정보 변경 표는 서버 #226 배포와 함께 생겼으므로
 * 그전에 고친 값은 어디에도 남아 있지 않다 — 비어 있는 것이 "고친 적이 없다"는 뜻은 아니다.
 *
 * ── 왜 `MemberChange`(api/members.ts)를 재사용하지 않는가 ─────────
 * 서버는 상세의 '최근 변경'과 이 목록에 **같은 record**를 쓰지만, 두 응답에서 실제로 채워지는
 * 자리가 다르다. 상세는 등급·상태만 실어(서버 `MemberServiceImpl.recentChangesOf`가 역할을 빈
 * 목록으로 넘긴다) `newCode`·`newName`이 언제나 채워져 있지만, 여기에는 역할 **종료**가 섞여
 * 오고 그 줄은 `newCode`·`newName`이 null이다("이 역할이었다가 아니게 됐다"). 상세용 타입을
 * 그대로 쓰면 없을 수 없는 값이라고 타입이 말하는 자리가 런타임에 비고, 화면은 그것을
 * `undefined`로 그린다.
 *
 * `@RequireAuthority(MEMBER_MANAGE)`다. 역할 이력이 함께 실리지만 `ROLE_MANAGE`가 아니다 —
 * 상세가 이미 보여 주는 것을 펼쳐 보는 일이라 같은 화면의 '전체 보기'만 403이 되면 안 된다는
 * 것이 서버의 판단이다(MemberHistoryController 주석).
 */

/* ── 필터 어휘와 응답 어휘가 다르다 ────────────────────────────── */

/**
 * `type` 질의 파라미터의 값 (서버 `MemberHistorySource`) — **이력의 출처**다.
 *
 * 아래 {@link MemberHistoryChangeType}와 값이 하나 어긋난다. 역할은 한 행(`mbr_role_rel`)이
 * 부여와 종료라는 두 사건을 담아 응답에서는 두 줄로 나오지만, 화면의 필터는 "역할 이력을 볼
 * 것인가"를 칩 하나로 묻는다 — `ROLE_ASSIGNED`만 거는 필터를 만들면 임기 시작만 보이고 종료는
 * 사라지는 목록이 되는데, 그것은 이력을 보는 사람이 원한 것이 아니다.
 */
export type MemberHistoryType = "GRADE" | "STATUS" | "ROLE" | "PROFILE";

/** 필터 칩이 그리는 순서 — 서버 enum 선언 순서와 같다 */
export const MEMBER_HISTORY_TYPES: readonly MemberHistoryType[] = [
  "GRADE",
  "STATUS",
  "ROLE",
  "PROFILE",
];

/**
 * 응답 한 줄의 종류 (서버 `MemberChangeType`) — **무슨 일이 있었는가**다.
 *
 * 역할이 둘로 갈리는 이유는 {@link MemberHistoryType} 주석에 있다.
 *
 * `PROFILE`은 회원 정보 한 항목이 바뀐 것이다(#237). 학번·이름·연락처처럼 서로 다른 아홉
 * 항목이 이 한 값을 쓰고, 그중 무엇이 바뀌었는지는 {@link MemberHistoryEntry.changeField}가
 * 답한다 — 항목마다 종류를 두면 필터가 아홉 칸이 된다는 것이 서버의 판단이다.
 */
export type MemberHistoryChangeType =
  | "GRADE"
  | "STATUS"
  | "ROLE_ASSIGNED"
  | "ROLE_ENDED"
  | "PROFILE";

/** 응답의 종류 → 필터의 출처. 화면이 칩 상태와 받은 줄을 잇는 자리다 */
export function historyTypeOf(changeType: MemberHistoryChangeType): MemberHistoryType {
  if (changeType === "ROLE_ASSIGNED" || changeType === "ROLE_ENDED") return "ROLE";
  return changeType;
}

/* ── 응답 ──────────────────────────────────────────────────── */

/**
 * 변경 이력 한 줄 (MemberChangeHistoryResponse).
 *
 * ── 이전 → 이후의 양쪽이 비는 자리가 있다 ────────────────────────
 * `previous*`는 가입 시점의 최초 부여와 **역할 부여**에서 null이고(그때는 아무것도 아니었다),
 * `new*`는 **역할 종료**에서 null이다(그 뒤로는 아무것도 아니다). 화면은 빈 쪽에 값을 지어
 * 넣지 않고 "그 자리에 값이 없었다"는 뜻의 말로 그린다(views/member-history의 `NONE_LABEL`).
 *
 * ── 회원 정보 줄은 이름 두 칸만 쓴다 ────────────────────────────
 * `PROFILE` 줄의 값은 `previousName`·`newName`에 담기고 **`previousCode`·`newCode`·
 * `appliedDate`·`changeReason`은 모두 null이다.** 항목마다 타입이 다른 값(학번은 문자열,
 * 기수·학년은 숫자)을 한 자리에 담으므로 코드값이 성립하지 않고, 이름·연락처는 **고친 순간이
 * 곧 적용**이라 적용일이 없으며 사유를 물을 자리도 없다(서버 `mbr_chg_hstry`에 그 컬럼 자체가
 * 없다). 화면은 그 자리를 '-'로도 채우지 않고 아예 비운다 — 없는 값을 만들어 내지 않는다.
 * 비운 쪽 이름은 그 항목이 그때 비어 있었다는 뜻이다(예: 학과가 없다가 채워졌다).
 *
 * ── 역할 줄은 변경자·사유가 언제나 null이다 ─────────────────────
 * `mbr_role_rel`에 변경자(`chnrg_mbr_id`)·사유 컬럼이 **없어서** 서버가 답할 근거를 갖고 있지
 * 않다. 요청자나 회원 자신을 대신 채우면 이력이 사실이 아닌 것을 말하게 되고, 그 순간 이
 * 목록은 근거로 쓸 수 없다 — 화면은 '-'로 그리고 왜 비었는지를 한 줄로 밝힌다.
 *
 * ── `createdAt`은 UTC 순간이다 ──────────────────────────────────
 * 서버가 `Instant`로 내리므로 `"2026-08-15T10:00:00Z"`처럼 온다(등급·상태의 `crt_dt`이고,
 * 역할은 시작일·종료일 그날의 서울 자정이다). **문자열을 잘라 쓰면 아홉 시간 어긋난 시각이
 * 화면에 뜬다** — 표시는 `formatInstant`(shared/lib/date.ts)로 서비스 시간대로 옮겨 한다.
 */
export interface MemberHistoryEntry {
  changeType: MemberHistoryChangeType;
  /**
   * 무엇이 바뀌었는가 — **회원 정보 줄에만 값이 있고** 등급·상태·역할 줄에서는 null이다
   * (#237 · 서버 `MemberChangeField`).
   */
  changeField: ChgArtclCd | null;
  /**
   * 그 항목의 표시명 — **서버가 준 값을 그대로 쓴다.**
   *
   * 코드 → 이름 사전을 웹에 만들지 않는다. 서버가 이 값을 함께 내리는데도 대응표를 한 벌 더
   * 두면 서버가 말을 다듬는 날 화면만 옛 이름을 그린다(`shared/config/codes.ts`의
   * `ChgArtclCd` 주석 · 승인자 권한명이 같은 판단을 했다). `changeField`와 짝이라 등급·상태·
   * 역할 줄에서는 함께 null이다.
   */
  changeFieldName: string | null;
  /**
   * 등급·상태는 기준 코드값이고, **역할은 `role_id`를 문자열로 담은 값**이다(역할은 코드가
   * 아니라 IDENTITY라 환경마다 다른 숫자다). 화면이 이 값으로 이름을 만들지 않는 이유는
   * `previousName`·`newName` 주석에 있다.
   */
  previousCode: string | null;
  previousName: string | null;
  newCode: string | null;
  /**
   * 표시 명칭은 **서버가 준 이 값을 그대로** 쓴다.
   *
   * `shared/config/codes.ts`의 `MBR_GRD_NM`·`MBR_STTS_NM`을 코드로 조회하면 기준정보 화면에서
   * 이름을 바꿔도 이력 표시가 따라오지 않는다 — 역할 이름은 아예 그 사전에 있지도 않다.
   * 목록·상세가 같은 자리에서 같은 판단을 했다(api/members.ts 첫 주석).
   */
  newName: string | null;
  /** 일자D — 언제부터 적용되는가. 역할은 시작일·종료일이고, 회원 정보 줄은 언제나 null이다 */
  appliedDate: string | null;
  /** 역할·회원 정보 줄에서는 언제나 null이다 (위 주석) */
  changeReason: string | null;
  changedByMemberId: number | null;
  /** 역할 줄에서는 언제나 null이다. 배치·이관으로 생긴 등급·상태 이력에도 사람이 없다 */
  changedByName: string | null;
  /** 일시TS(UTC) — 발생 시각이자 목록 정렬의 기준. 서버가 이미 역순으로 내린다 */
  createdAt: string;
}

/** 조회 조건 — 파라미터는 `type` 하나뿐이다 (페이징이 없다) */
export interface MemberHistoryFilter {
  /**
   * 볼 출처. **비어 있으면 아예 싣지 않는다** — 서버가 생략을 '전부'로 읽으므로 요청 문자열과
   * "전체"라는 화면 상태가 그대로 겹친다(회원 목록의 등급·상태 필터와 같은 판단).
   */
  types?: readonly MemberHistoryType[];
}

/**
 * GET /v1/members/{memberId}/histories — 등급·상태·역할을 합친 타임라인.
 *
 * **페이징이 없다.** 세 테이블을 합치므로 단일 컬럼 커서가 성립하지 않고 한 회원의 이력은
 * 많아야 수십 건이라, 서버가 배열을 그대로 내리기로 했다(서버 `MemberHistoryServiceImpl`
 * 주석). 그래서 화면도 '더 보기'를 두지 않는다.
 *
 * **정렬은 서버가 끝낸 것이다.** 발생 시각 역순이며 같은 시각은 종류로 끊는다 — 받은 순서를
 * 화면에서 다시 정렬하면 그 규칙이 두 곳에서 정해진다.
 *
 * 이력이 없는 회원은 **빈 배열**이고 없는 회원은 404 `NOT_FOUND`다. 서버가 존재 검사를 따로
 * 하는 것이 그 둘을 가르기 위해서이므로, 화면도 빈 목록을 오류로 그리지 않는다.
 * 알 수 없는 `type`은 400 `VALIDATION_FAILED`, 권한이 없으면 403이다.
 */
export async function fetchMemberHistories(
  memberId: number,
  filter: MemberHistoryFilter = {},
): Promise<MemberHistoryEntry[]> {
  const query = new URLSearchParams();
  for (const type of filter.types ?? []) query.append("type", type);

  const qs = query.toString();
  const path = `/v1/members/${memberId}/histories${qs ? `?${qs}` : ""}`;

  const entries = await apiFetch<MemberHistoryEntry[] | null>(path);
  return entries ?? [];
}
