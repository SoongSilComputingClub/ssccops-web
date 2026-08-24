import { apiFetch } from "@/shared/lib/api/client";
import type { EventCategory } from "../model/types";

/*
 * 행사 분류 API (ssccops#140 · D13 — 분류 코드테이블).
 *
 * 역할 분류(entities/role/api/role-classifications.ts)와 같은 모양의 사용자 관리 코드테이블이다.
 * 다만 인가는 갈린다 — 역할 분류는 조회가 열려 있지만 **행사 관리 API는 조회까지 전부
 * EVENT_MANAGE다**(서버 판정). 그래서 분류 관리 화면은 메뉴부터 게이트되고, 화면 안의 변경
 * 버튼도 같은 권한으로 잠근다.
 */

/** 행사 분류 API가 돌려주는 오류 코드 (서버와 합의된 계약) */
export const EVENT_CATEGORY_ERROR = {
  /** 404 — 없는 분류 코드. 화면이 들고 있는 목록이 낡았다는 뜻이다 */
  EVENT_CLASSIFICATION_NOT_FOUND: "EVENT_CLASSIFICATION_NOT_FOUND",
  /** 409 — 행사가 쓰고 있어 지울 수 없다. 행사의 분류를 먼저 옮겨야 한다 */
  EVENT_CLASSIFICATION_IN_USE: "EVENT_CLASSIFICATION_IN_USE",
} as const;

/**
 * 분류 코드 표기 — 역할 분류와 같은 규칙을 선검사로 쓴다.
 *
 * 대문자로 시작하고 대문자·숫자·밑줄만 2~20자. `event_clsf_cd`도 데이터사전의 표준코드 시트에
 * 사람이 등재하는 값이라 뜻이 읽혀야 한다(RECRUIT·SEMINAR처럼) — 웹이 채번하지 않는다.
 * **최종 판정은 서버다** — 서버 검증이 이보다 느슨하게 확정되면 이 선검사부터 푼다(웹이
 * 서버보다 더 잠그면 서버가 허용하는 코드를 만들 길이 사라진다).
 */
export const EVENT_CLSF_CD_PATTERN = /^[A-Z][A-Z0-9_]{1,19}$/;
export const EVENT_CLSF_NM_MAX_LENGTH = 50;

/** 서버가 내려주는 분류 한 건 — 숫자 필드가 null로 올 수 있다 */
interface EventCategoryResponse {
  eventClsfCd: string;
  eventClsfNm: string;
  indctSeqno: number | null;
}

function toEventCategory(res: EventCategoryResponse): EventCategory {
  return {
    eventClsfCd: res.eventClsfCd,
    eventClsfNm: res.eventClsfNm,
    indctSeqno: res.indctSeqno ?? 0,
  };
}

/**
 * GET /v1/event-categories — 분류 전체 (표시 순번 정렬 · 페이지 봉투 없음).
 *
 * 운영진이 손으로 만드는 기준 데이터라 수십 건을 넘지 않는다 — 필터 칩·편집기 셀렉트·관리
 * 표가 전량을 한 번에 그린다.
 */
export async function fetchEventCategories(): Promise<EventCategory[]> {
  const list = await apiFetch<EventCategoryResponse[] | null>("/v1/event-categories");
  return (list ?? []).map(toEventCategory);
}

/** 분류 생성 본문 */
export interface EventCategoryCreateInput {
  /** 사용자가 직접 입력한다 — 서버도 웹도 채번하지 않는다 */
  eventClsfCd: string;
  eventClsfNm: string;
  /** 생략하면 서버가 뒤쪽으로 밀어 둔다 */
  indctSeqno?: number;
}

/**
 * POST /v1/event-categories — 분류 생성 (EVENT_MANAGE).
 *
 * 응답 본문을 쓰지 않는다. 생성 직후 화면은 목록을 다시 받는다 — 새 분류가 몇 번째로
 * 그려지는지는 서버가 정하는데, 응답 한 행을 웹이 배열에 끼워 넣기 시작하면 그 규칙을 웹이
 * 흉내 내게 된다(역할 분류와 같은 판단).
 */
export async function createEventCategory(input: EventCategoryCreateInput): Promise<void> {
  await apiFetch<unknown>("/v1/event-categories", {
    method: "POST",
    body: JSON.stringify({
      eventClsfCd: input.eventClsfCd,
      eventClsfNm: input.eventClsfNm,
      // 생략과 null이 같은 뜻이다(둘 다 "서버가 정하라")
      indctSeqno: input.indctSeqno ?? null,
    }),
  });
}

/**
 * PATCH /v1/event-categories/{eventClsfCd} — 이름·순번 수정 (EVENT_MANAGE).
 *
 * **`eventClsfCd`는 본문에 없다.** PK이자 행사가 FK로 가리키는 값이라 편집 대상이 아니다 —
 * 코드를 바꾸는 경로는 '새로 만들고 → 행사를 옮기고 → 기존 것을 지운다' 하나뿐이다
 * (역할 분류와 같은 판단).
 */
export async function updateEventCategory(
  eventClsfCd: string,
  input: { eventClsfNm: string; indctSeqno?: number },
): Promise<void> {
  await apiFetch<unknown>(`/v1/event-categories/${encodeURIComponent(eventClsfCd)}`, {
    method: "PATCH",
    body: JSON.stringify({
      eventClsfNm: input.eventClsfNm,
      indctSeqno: input.indctSeqno ?? null,
    }),
  });
}

/**
 * DELETE /v1/event-categories/{eventClsfCd} — 분류 삭제 (EVENT_MANAGE).
 *
 * 이 분류를 쓰는 행사가 하나라도 있으면 409 EVENT_CLASSIFICATION_IN_USE다. 목록 응답에 사용
 * 건수 집계가 없어 화면이 먼저 잠글 근거가 없다 — 서버 거절을 그대로 문구로 안내한다.
 */
export async function deleteEventCategory(eventClsfCd: string): Promise<void> {
  await apiFetch<unknown>(`/v1/event-categories/${encodeURIComponent(eventClsfCd)}`, {
    method: "DELETE",
  });
}
