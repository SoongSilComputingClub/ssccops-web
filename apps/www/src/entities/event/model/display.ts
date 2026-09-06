import type { BadgeTone } from "@/shared/ui";
import type { EventPhase, EventReceiptStatus } from "./types";

/*
 * 행사 배지 표기.
 *
 * 카드 한 장에 배지가 둘까지 나란히 선다 — 진행 단계(eventPhase)와 모집(receiptStatus)이다.
 * 둘이 말하는 것이 달라 하나로 합치지 않는다: 단계는 행사 자체가 언제인가이고, 모집은 지금
 * 신청할 수 있는가다(끝난 모집과 끝난 행사는 다른 이야기다).
 *
 * **코드값을 화면에 그대로 내보내지 않는다.** 라벨은 전부 여기서만 만든다.
 */

/**
 * 진행 단계 배지.
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
 * 모집 배지 — 연결된 폼의 접수 상태로 그린다.
 *
 * 어드민의 어휘와 갈리는 자리가 둘 있다. DRAFT는 어드민에서 '폼 작성 중'이지만 공개 화면에는
 * 폼이라는 말이 없으므로 '모집 준비 중'으로 쓰고, ACCEPTING은 '접수중'이 아니라 '모집 중'으로
 * 쓴다 — 공개 화면에서 사람들이 찾는 말이 그쪽이다. 어느 쪽도 코드값을 드러내지 않는다.
 */
export const EVENT_RECEIPT_BADGE: Record<
  EventReceiptStatus,
  { label: string; tone: BadgeTone }
> = {
  DRAFT: { label: "모집 준비 중", tone: "outline" },
  SCHEDULED: { label: "모집 예정", tone: "outline" },
  ACCEPTING: { label: "모집 중", tone: "blue" },
  EXPIRED: { label: "모집 기간 종료", tone: "amber" },
  CLOSED: { label: "모집 마감", tone: "grey" },
};

/** 진행 단계 배지 한 벌 — NONE이면 null이고 화면은 배지 자리를 비운다 */
export function eventPhaseBadge(
  phase: EventPhase,
): { label: string; tone: BadgeTone } | null {
  return phase === "NONE" ? null : EVENT_PHASE_BADGE[phase];
}

/** 모집 배지 한 벌 — 폼 미연결(null)이면 null이다 */
export function eventReceiptBadge(
  receiptStatus: EventReceiptStatus | null,
): { label: string; tone: BadgeTone } | null {
  return receiptStatus ? EVENT_RECEIPT_BADGE[receiptStatus] : null;
}

/**
 * 정원 표기 — "확정 12 / 30". 정원이 없으면 "확정 12명"으로 쓴다.
 *
 * 정원이 없는 행사에 `12 / -` 같은 표기를 두지 않는 것은, 분모가 비면 사람들이 남은 자리를
 * 세려다 실패하기 때문이다. 정원이 없다는 것은 자리 걱정이 없다는 뜻이므로 그냥 인원만 적는다.
 */
export function formatCapacity(confirmedCount: number, ptcpLmtCnt: number | null): string {
  return ptcpLmtCnt === null
    ? `확정 ${confirmedCount}명`
    : `확정 ${confirmedCount} / ${ptcpLmtCnt}`;
}
