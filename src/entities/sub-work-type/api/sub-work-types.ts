import { AUTZR_ROLE_NM, type AutzrRoleCd } from "@/shared/config/codes";
import { apiFetch } from "@/shared/lib/api/client";
import type { SubWorkTypeSummary } from "../model/types";

/*
 * 하위 업무 유형 API (ssccops-server OPS-018 목록 · OPS-019 등록·수정·사용 전환 · #67).
 *
 * **서버 응답의 모양을 아는 곳은 이 파일 하나로 제한한다** — 폼·업무 도메인이 잡아 둔 규칙
 * 그대로다. 화면이 응답 객체를 그대로 들고 다니면 계약이 바뀔 때마다 뷰 전체를 훑어야 한다.
 *
 * 인가는 핸들러마다 갈린다 (서버 #9): 조회는 `SUB_WORK_TYPE_READ`(국장까지 닿는다),
 * 등록·수정·사용 전환은 `SUB_WORK_TYPE_MANAGE`(회장·부회장·총무만 닿는다). 그래서 **목록은
 * 보이는데 저장만 403**인 상태가 정상적으로 존재한다 — 화면을 미리 막지 않고 서버가 거절하면
 * 그 사유를 보여 준다.
 *
 * 유형을 지우는 엔드포인트는 없다. 하위 업무가 FK로 참조하므로 하드 삭제가 불가능하고,
 * 대신 사용 여부를 내린다 (form_lbl과 같은 축).
 */

/** 유형_명 최대 길이 (sub_work_type.type_nm 명V100) — 서버 400을 기다리지 않고 먼저 걸러 준다 */
export const TYPE_NAME_MAX_LENGTH = 100;

/**
 * 하위 업무 유형 API가 돌려주는 오류 코드 (ssccops-server OperationErrorCode).
 *
 * **enum 이름이 아니라 본문에 실리는 코드 문자열이다.** 서버의 `SUB_WORK_TYPE_NOT_FOUND`는
 * 코드로 `"NOT_FOUND"`를, `INVALID_APPROVAL_POLICY`는 `"VALIDATION_FAILED"`를 내린다 —
 * enum 이름을 적어 두면 어느 화면도 못 알아본다.
 */
export const SUB_WORK_TYPE_ERROR = {
  /** 유형_명 누락·100자 초과, 성립하지 않는 승인 정책 조합 (400) */
  VALIDATION_FAILED: "VALIDATION_FAILED",
  /** 승인자_역할_코드가 기준 코드 밖 (400) — 역직렬화 단계에서 걸린다 */
  INVALID_CODE_VALUE: "INVALID_CODE_VALUE",
  /** 없는 유형 (404) — 목록을 다시 불러와야 한다 */
  SUB_WORK_TYPE_NOT_FOUND: "NOT_FOUND",
  /** 같은 이름의 유형이 이미 있다 (409) */
  DUPLICATE_SUB_WORK_TYPE_NAME: "DUPLICATE_SUB_WORK_TYPE_NAME",
  /** SUB_WORK_TYPE_READ·SUB_WORK_TYPE_MANAGE 권한 없음 (403) */
  FORBIDDEN: "FORBIDDEN",
} as const;

/* ── 서버 응답(Response DTO) ────────────────────────────────── */

interface SubWorkTypeResponse {
  subWorkTypeId: number;
  typeName: string | null;
  approvalNeeded: boolean;
  authorizerRoleCode: string | null;
  minAgreeCountNeeded: boolean;
  minAgreeCount: number | null;
  completionCheckArticles: string[] | null;
  useYn: boolean;
}

/* ── 응답 → 도메인 ─────────────────────────────────────────── */

/**
 * 승인자_역할_코드. 서버는 enum이 아니라 문자열 컬럼(autzr_role_cd V20)으로 들고 있어
 * 기준 코드에 없는 값이 이관 데이터에 남아 있을 수 있다. 그런 값은 null로 떨어뜨린다 —
 * 그대로 넘기면 `AUTZR_ROLE_NM[cd]`가 undefined가 되어 표에 빈칸이 나타난다.
 */
function toAuthorizerRole(code: string | null): AutzrRoleCd | null {
  if (!code) return null;
  return code in AUTZR_ROLE_NM ? (code as AutzrRoleCd) : null;
}

function toSubWorkType(res: SubWorkTypeResponse): SubWorkTypeSummary {
  return {
    subWorkTypeId: res.subWorkTypeId,
    typeName: res.typeName ?? "",
    approvalNeeded: res.approvalNeeded,
    authorizerRoleCode: toAuthorizerRole(res.authorizerRoleCode),
    minAgreeCountNeeded: res.minAgreeCountNeeded,
    minAgreeCount: res.minAgreeCount,
    completionCheckArticles: res.completionCheckArticles ?? [],
    useYn: res.useYn,
  };
}

/* ── 목록 ──────────────────────────────────────────────────── */

/**
 * GET /v1/sub-work-types — 유형 목록 (OPS-018).
 *
 * `useYn`을 주지 않으면 비활성 유형까지 전부 온다. 관리 화면은 그래야 한다 — 여기서 활성만
 * 받으면 방금 끈 유형이 목록에서 사라져 되돌릴 방법이 없어진다. 반대로 하위 업무 등록 폼의
 * 유형 드롭다운은 반드시 `true`를 넘긴다(안 거르면 서버가 400 SUB_WORK_TYPE_INACTIVE로 끊는다).
 *
 * 커서 페이징이 없다 — 기준 데이터라 서버가 전량을 한 번에 내린다. `apiFetchList`가 아니라
 * `apiFetch`를 쓰는 이유다.
 */
export async function fetchSubWorkTypes(useYn?: boolean): Promise<SubWorkTypeSummary[]> {
  const qs = useYn === undefined ? "" : `?useYn=${useYn}`;
  const types = await apiFetch<SubWorkTypeResponse[] | null>(`/v1/sub-work-types${qs}`);
  return (types ?? []).map(toSubWorkType);
}

/* ── 등록 · 수정 ───────────────────────────────────────────── */

/**
 * 유형 등록·수정 공용 입력 (OPS-019).
 *
 * 등록과 수정이 같은 모양인 것은 화면의 '새 하위 업무 유형'과 '하위 업무 유형 수정'이 같은
 * 폼이기 때문이다. **수정은 부분 수정이 아니라 폼 전체 저장이라 생략한 값은 지워진다.**
 *
 * 사용_여부는 여기 없다 — 목록의 토글이 /activation으로 따로 바꾸므로, 폼 저장에 실어 보내면
 * 화면이 들고 있지 않은 값을 되돌리게 된다.
 *
 * 승인이 필요 없는데 승인자·정족수가 실려 오는 것은 **서버가 지운다**(거절하지 않는다).
 * 그러니 화면은 칩에 남아 있는 값을 그대로 보내도 되고, 오히려 웹에서 미리 지우면 '불필요'로
 * 바꿨다가 되돌릴 때 고르던 값이 사라진다.
 */
export interface SubWorkTypeSaveInput {
  typeName: string;
  approvalNeeded: boolean;
  /** 승인 불필요 유형은 null. 승인이 필요한데 null이면 서버가 400으로 끊는다 */
  authorizerRoleCode: AutzrRoleCd | null;
  minAgreeCountNeeded: boolean;
  /** 정족수 유형에서만 1 이상. 1도 단독과 다르다 — 다른 한 명의 찬성이 먼저 있어야 한다 */
  minAgreeCount: number | null;
  /** 한 줄에 한 항목. 빈 항목은 서버가 버린다 */
  completionCheckArticles: string[];
}

function toSaveBody(input: SubWorkTypeSaveInput): string {
  return JSON.stringify({
    typeName: input.typeName.trim(),
    approvalNeeded: input.approvalNeeded,
    authorizerRoleCode: input.authorizerRoleCode,
    minAgreeCountNeeded: input.minAgreeCountNeeded,
    minAgreeCount: input.minAgreeCount,
    completionCheckArticles: input.completionCheckArticles,
  });
}

/*
 * 등록·수정 응답 본문을 쓰지 않는다. 관리 화면은 저장 직후 목록을 다시 부르는데(정렬 순서를
 * 서버가 정한다) 응답의 한 행을 배열에 끼워 넣으면 그 규칙을 웹이 흉내 내게 된다 —
 * 성공 여부만 보고 목록은 서버에서 다시 받는다 (폼_라벨 #10이 밟은 경로).
 */

/** POST /v1/sub-work-types — 유형 등록. 새 유형은 항상 활성으로 만들어진다 */
export async function createSubWorkType(input: SubWorkTypeSaveInput): Promise<void> {
  await apiFetch<SubWorkTypeResponse | null>("/v1/sub-work-types", {
    method: "POST",
    body: toSaveBody(input),
  });
}

/**
 * PATCH /v1/sub-work-types/{subWorkTypeId} — 유형 수정.
 *
 * 바뀐 승인 규칙은 **이미 등록된 하위 업무에 소급되지 않는다** — 하위 업무가 등록 시점에 값을
 * 복사해 가기 때문이며, 화면 하단 안내 문구와 같은 규칙이다.
 */
export async function updateSubWorkType(
  subWorkTypeId: number,
  input: SubWorkTypeSaveInput,
): Promise<void> {
  await apiFetch<SubWorkTypeResponse | null>(`/v1/sub-work-types/${subWorkTypeId}`, {
    method: "PATCH",
    body: toSaveBody(input),
  });
}

/* ── 사용 여부 전환 ────────────────────────────────────────── */

/**
 * PATCH /v1/sub-work-types/{subWorkTypeId}/activation — 목록의 '사용' 토글.
 *
 * 저장 폼과 엔드포인트가 나뉜 것은 토글만 누르는 흐름이 폼 값 전체를 들고 있지 않기 때문이다.
 */
export async function setSubWorkTypeUse(
  subWorkTypeId: number,
  useYn: boolean,
): Promise<void> {
  await apiFetch<SubWorkTypeResponse | null>(
    `/v1/sub-work-types/${subWorkTypeId}/activation`,
    { method: "PATCH", body: JSON.stringify({ useYn }) },
  );
}
