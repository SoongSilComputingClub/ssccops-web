import { EVENT_STTS_NM, type EventSttsCd } from "@/shared/config/codes";
import type { BadgeTone } from "@/shared/ui";
import type { EventPhase, EventReceiptStatus } from "./types";

/*
 * 행사 배지 표기.
 *
 * 목록 카드 한 장에 배지가 세 종류까지 나란히 선다 — 저장 상태(eventSttsCd) · 진행 단계
 * (eventPhase) · 모집(receiptStatus). 셋이 말하는 것이 다르므로 하나로 합치지 않는다:
 * 상태는 운영자가 정하는 값(작성 중/게시/보관), 단계는 행사 일시에서 서버가 파생한 값,
 * 모집은 연결된 폼의 접수 상태다(D3 — 모집 기간은 폼이 유일한 진실).
 */

/**
 * 저장 상태 배지 (D9). 표시명은 기준 코드 사전(EVENT_STTS_NM)에서 온다 — 여기서는 색만 정한다.
 * '게시'만 blue인 것은 회원에게 실제로 보이는 유일한 상태이기 때문이다.
 */
export const EVENT_STTS_BADGE_TONE: Record<EventSttsCd, BadgeTone> = {
  DRAFT: "outline",
  PUBLISHED: "blue",
  ARCHIVED: "grey",
};

/** 저장 상태 배지 한 벌 — 화면은 이 함수 하나로 라벨·색을 함께 얻는다 */
export function eventSttsBadge(cd: EventSttsCd): { label: string; tone: BadgeTone } {
  return { label: EVENT_STTS_NM[cd], tone: EVENT_STTS_BADGE_TONE[cd] };
}

/**
 * 진행 단계 배지 (서버 파생값 — entities/event/model/types.ts의 EventPhase 주석 참고).
 *
 * **NONE 키가 없다.** 일시 미설정이라 단계를 말할 수 없는 상태이므로 화면은 배지를 그리지
 * 않는다 — 맵에 "미정" 같은 라벨을 두면 다음 화면이 무심코 그려 카드마다 뜻 없는 배지가 남는다.
 */
export const EVENT_PHASE_BADGE: Record<
  Exclude<EventPhase, "NONE">,
  { label: string; tone: BadgeTone }
> = {
  UPCOMING: { label: "예정", tone: "outline" },
  ONGOING: { label: "진행 중", tone: "outline-accent" },
  ENDED: { label: "종료", tone: "grey" },
};

/**
 * 모집 배지 — 연결된 폼의 접수 상태로 그린다. 폼 미연결(receiptStatus === null)이면 그리지 않는다.
 *
 * 어휘는 폼 목록의 FORM_RECEIPT_BADGE와 맞추되 DRAFT만 '폼 작성 중'으로 쓴다 — 행사 카드에는
 * 저장 상태 배지 '작성 중'(행사 자체)이 함께 서므로, 같은 글자를 두 번 세우면 어느 쪽이 폼
 * 이야기인지 읽히지 않는다. 'EXPIRED'만 amber인 것도 폼과 같은 판단이다 — 기간을 늘리든
 * 마감하든 운영자의 결정이 필요한 유일한 칸이다.
 */
export const EVENT_RECEIPT_BADGE: Record<
  EventReceiptStatus,
  { label: string; tone: BadgeTone }
> = {
  DRAFT: { label: "폼 작성 중", tone: "outline" },
  SCHEDULED: { label: "접수 예정", tone: "outline" },
  ACCEPTING: { label: "접수중", tone: "blue" },
  EXPIRED: { label: "기간 종료", tone: "amber" },
  CLOSED: { label: "마감", tone: "grey" },
};
