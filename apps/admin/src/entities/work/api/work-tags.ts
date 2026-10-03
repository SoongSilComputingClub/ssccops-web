import { apiFetch } from "@/shared/lib/api/client";
import type { WorkTag, WorkTagSummary } from "../model/types";

/*
 * 업무 태그 API (#757 · 서버 #631 · ssccops#565).
 *
 * 모양은 폼 라벨(entities/form/api/form-labels.ts)을 본떴고 갈리는 자리 셋은 서버와 같다 —
 * 사용_여부가 없고 **지우면 지정도 함께 떨어진다**(업무는 그대로) · 이름을 바꿀 수 있다 · 관리와
 * 지정이 같은 권한(WORK_MANAGE)이다. 목록 조회만 WORK_READ다(국원도 목록 태그 필터를 쓴다).
 *
 * 태그 목록은 **관리 화면 · 목록 필터 칩 · 지정 칩**이 함께 쓴다. 호출은 이 파일 하나로 모은다.
 *
 * ── 지정은 전체 교체 하나뿐이다 ──────────────────────────────────
 * 업무 등록·수정 본문은 태그를 받지 않는다(서버 WorkDetailResponse 주석). 태그는
 * `PUT /v1/works/{workId}/tags`로만 바뀌고, 빈 배열은 «전부 떼기»라는 정상 요청이다.
 */

/** 태그 API가 돌려주는 오류 코드 (서버 OperationErrorCode) */
export const WORK_TAG_ERROR = {
  /** 이름 누락·50자 초과 (400) */
  VALIDATION_FAILED: "VALIDATION_FAILED",
  /** 같은 이름의 태그가 이미 있다 (409) */
  WORK_TAG_NAME_DUPLICATED: "WORK_TAG_NAME_DUPLICATED",
  /** 없는 태그 (404) — 지정 교체에 없는 태그가 섞여도 이 코드다 */
  WORK_TAG_NOT_FOUND: "WORK_TAG_NOT_FOUND",
} as const;

/** 태그_명 최대 길이 (work_tag.tag_nm 명V50) — 서버 400을 기다리지 않고 먼저 걸러 준다 */
export const TAG_NM_MAX_LENGTH = 50;

interface WorkTagResponse {
  workTagId: number;
  tagNm: string | null;
  usageCount: number | null;
  crtDt: string | null;
  mdfcnDt: string | null;
}

interface WorkTagAssignmentResponse {
  workTagRelId: number;
  workTagId: number;
  tagNm: string | null;
  crtDt: string | null;
}

function toWorkTag(res: WorkTagResponse): WorkTag {
  return {
    workTagId: res.workTagId,
    tagNm: res.tagNm ?? "",
    usageCount: res.usageCount ?? 0,
    crtDt: res.crtDt,
    mdfcnDt: res.mdfcnDt,
  };
}

/** GET /v1/work-tags — 태그 전체(이름 오름차순 · 페이징 없음) */
export async function fetchWorkTags(): Promise<WorkTag[]> {
  const tags = await apiFetch<WorkTagResponse[] | null>("/v1/work-tags");
  return (tags ?? []).map(toWorkTag);
}

/**
 * POST /v1/work-tags — 태그 만들기.
 *
 * 응답 본문을 쓰지 않는다 — 관리 화면은 변이 뒤 목록을 다시 받는다(정렬·`usageCount`는 서버가 정한다).
 */
export async function createWorkTag(tagNm: string): Promise<void> {
  await apiFetch<WorkTagResponse | null>("/v1/work-tags", {
    method: "POST",
    body: JSON.stringify({ tagNm: tagNm.trim() }),
  });
}

/** PATCH /v1/work-tags/{workTagId} — 이름 바꾸기. 달린 업무의 칩도 새 이름이 된다 */
export async function renameWorkTag(workTagId: number, tagNm: string): Promise<void> {
  await apiFetch<WorkTagResponse | null>(`/v1/work-tags/${workTagId}`, {
    method: "PATCH",
    body: JSON.stringify({ tagNm: tagNm.trim() }),
  });
}

/** DELETE /v1/work-tags/{workTagId} — 지우면 달려 있던 업무에서 태그만 떨어진다 */
export async function deleteWorkTag(workTagId: number): Promise<void> {
  await apiFetch<void>(`/v1/work-tags/${workTagId}`, { method: "DELETE" });
}

/**
 * PUT /v1/works/{workId}/tags — 업무의 태그를 고른 목록으로 통째로 바꾼다.
 *
 * 응답은 지정 한 건씩(`crtDt`는 태그가 아니라 지정 시각)이다. 화면은 칩에 쓸 이름과 식별자만
 * 옮겨 돌려준다.
 */
export async function replaceWorkTags(
  workId: number,
  tagIds: readonly number[],
): Promise<WorkTagSummary[]> {
  const res = await apiFetch<WorkTagAssignmentResponse[] | null>(`/v1/works/${workId}/tags`, {
    method: "PUT",
    body: JSON.stringify({ tagIds }),
  });
  return (res ?? []).map((r) => ({ workTagId: r.workTagId, tagNm: r.tagNm ?? "" }));
}
