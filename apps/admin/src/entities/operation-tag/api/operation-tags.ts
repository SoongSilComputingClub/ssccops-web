import { apiFetch } from "@/shared/lib/api/client";
import type { OperationTag, OperationTagSummary } from "../model/types";

/*
 * 운영 태그 API (#771 · 서버 #640 · ssccops#576 — 업무 태그 #757·서버 #631을 운영 건 단위로 옮겼다).
 *
 * 모양은 폼 라벨(entities/form/api/form-labels.ts)을 본떴고 갈리는 자리 셋은 서버와 같다 —
 * 사용_여부가 없고 **지우면 지정도 함께 떨어진다**(운영 건은 그대로) · 이름을 바꿀 수 있다 · 관리와
 * 지정이 같은 권한(WORK_MANAGE)이다. 목록 조회만 WORK_READ다(국원도 목록 태그 필터를 쓴다).
 * 회의에 다는 것도 WORK_MANAGE다 — 유형마다 권한을 가르면 같은 칩 편집기가 화면마다 다르게 잠긴다(서버 주석).
 *
 * 태그 목록은 **관리 화면 · 목록 필터 칩 · 지정 칩**이 함께 쓴다. 호출은 이 파일 하나로 모은다.
 *
 * ── 지정은 운영 건 단위 전체 교체 하나뿐이다 ──────────────────────
 * 업무·하위 업무·회의의 등록·수정 본문은 태그를 받지 않는다. 태그는 각 상세 응답의 `operationId`로
 * `PUT /v1/operations/{operationId}/tags`를 불러서만 바뀌고, 빈 배열은 «전부 떼기»라는 정상 요청이다.
 */

/** 태그 API가 돌려주는 오류 코드 (서버 OperationErrorCode) */
export const OPERATION_TAG_ERROR = {
  /** 이름 누락·50자 초과 (400) */
  VALIDATION_FAILED: "VALIDATION_FAILED",
  /** 같은 이름의 태그가 이미 있다 (409) */
  OPERATION_TAG_NAME_DUPLICATED: "OPERATION_TAG_NAME_DUPLICATED",
  /** 없는 태그 (404) — 지정 교체에 없는 태그가 섞여도 이 코드다 */
  OPERATION_TAG_NOT_FOUND: "OPERATION_TAG_NOT_FOUND",
  /** 없거나 지운 운영 건 (404) — 지정 교체에서만 나온다 */
  OPERATION_NOT_FOUND: "NOT_FOUND",
} as const;

/** 태그_명 최대 길이 (oper_tag.tag_nm 명V50) — 서버 400을 기다리지 않고 먼저 걸러 준다 */
export const TAG_NM_MAX_LENGTH = 50;

interface OperationTagResponse {
  operationTagId: number;
  tagNm: string | null;
  usageCount: number | null;
  crtDt: string | null;
  mdfcnDt: string | null;
}

interface OperationTagAssignmentResponse {
  operationTagRelId: number;
  operationTagId: number;
  tagNm: string | null;
  crtDt: string | null;
}

function toOperationTag(res: OperationTagResponse): OperationTag {
  return {
    operationTagId: res.operationTagId,
    tagNm: res.tagNm ?? "",
    usageCount: res.usageCount ?? 0,
    crtDt: res.crtDt,
    mdfcnDt: res.mdfcnDt,
  };
}

/** GET /v1/operation-tags — 태그 전체(이름 오름차순 · 페이징 없음) */
export async function fetchOperationTags(): Promise<OperationTag[]> {
  const tags = await apiFetch<OperationTagResponse[] | null>("/v1/operation-tags");
  return (tags ?? []).map(toOperationTag);
}

/**
 * POST /v1/operation-tags — 태그 만들기.
 *
 * 응답 본문을 쓰지 않는다 — 관리 화면은 변이 뒤 목록을 다시 받는다(정렬·`usageCount`는 서버가 정한다).
 */
export async function createOperationTag(tagNm: string): Promise<void> {
  await apiFetch<OperationTagResponse | null>("/v1/operation-tags", {
    method: "POST",
    body: JSON.stringify({ tagNm: tagNm.trim() }),
  });
}

/** PATCH /v1/operation-tags/{operationTagId} — 이름 바꾸기. 달린 운영 건의 칩도 새 이름이 된다 */
export async function renameOperationTag(operationTagId: number, tagNm: string): Promise<void> {
  await apiFetch<OperationTagResponse | null>(`/v1/operation-tags/${operationTagId}`, {
    method: "PATCH",
    body: JSON.stringify({ tagNm: tagNm.trim() }),
  });
}

/** DELETE /v1/operation-tags/{operationTagId} — 지우면 달려 있던 운영 건에서 태그만 떨어진다 */
export async function deleteOperationTag(operationTagId: number): Promise<void> {
  await apiFetch<void>(`/v1/operation-tags/${operationTagId}`, { method: "DELETE" });
}

/**
 * PUT /v1/operations/{operationId}/tags — 운영 건의 태그를 고른 목록으로 통째로 바꾼다.
 *
 * `operationId`는 업무·하위 업무·회의 id가 아니라 각 상세 응답의 상위 oper 식별자다. 응답은 지정
 * 한 건씩(`crtDt`는 태그가 아니라 지정 시각)이고, 화면은 칩에 쓸 이름과 식별자만 옮겨 돌려준다.
 */
export async function replaceOperationTags(
  operationId: number,
  tagIds: readonly number[],
): Promise<OperationTagSummary[]> {
  const res = await apiFetch<OperationTagAssignmentResponse[] | null>(
    `/v1/operations/${operationId}/tags`,
    { method: "PUT", body: JSON.stringify({ tagIds }) },
  );
  return (res ?? []).map((r) => ({ operationTagId: r.operationTagId, tagNm: r.tagNm ?? "" }));
}
