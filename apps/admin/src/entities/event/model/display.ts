import {
  EVENT_STTS_NM,
  PTCP_STTS_NM,
  type EventSttsCd,
  type PtcpSttsCd,
} from "@/shared/config/codes";
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

/**
 * 참가자 상태 배지 (#145 · D5·D16). 표시명은 기준 코드 사전(PTCP_STTS_NM)에서 온다.
 *
 * '확정'만 blue인 것은 행사에 실제로 오는 사람을 가리키는 유일한 상태이기 때문이다(게시
 * 상태 배지와 같은 어휘). 대기는 운영자의 결정이 아직 남은 칸이라 접수 배지의 '기간 종료'와
 * 같은 amber이고, 취소는 지나간 줄이라 무채색이다 — 명단에서 행이 사라지지 않으므로(D16)
 * 남은 줄과 눈으로 갈려야 한다.
 */
export const PTCP_STTS_BADGE: Record<PtcpSttsCd, { label: string; tone: BadgeTone }> = {
  CONFIRMED: { label: PTCP_STTS_NM.CONFIRMED, tone: "blue" },
  WAITLISTED: { label: PTCP_STTS_NM.WAITLISTED, tone: "amber" },
  CANCELLED: { label: PTCP_STTS_NM.CANCELLED, tone: "grey" },
};

/**
 * 지워진 행사의 배지 (ADR-0020 · ssccops-web#391) — «지운 행사» 화면에서 저장 상태 배지 **대신**
 * 선다. 폼의 DELETED_FORM_BADGE와 같은 판단이다: 지워진 행사의 '게시'는 이미 사실이 아니라
 * (공개에서도 사라졌다), 그 배지를 보고 아직 회원에게 보이는 중이라고 읽으면 되살릴지 판단하는
 * 기준이 통째로 어긋난다. 지워졌다는 것이 그 행사에 관한 유일하게 참인 상태다.
 *
 * 톤은 저장 상태(outline·blue·grey)·단계(outline-accent)·모집(amber)이 쓰지 않는 나머지 하나다.
 */
/**
 * 쓰지 않는 행사 분류의 안내 (#588 · ssccops#436 · ADR-0044).
 *
 * «모집»(`RECRUIT`) 분류는 신입회원 모집이 «행사 + 연결 폼»이던 시절의 자리다. ADR-0044로 모집이
 * 지정 폼(폼 상세 → 홍보 사이트 `/join`)으로 옮겨 가면서 이 분류는 **시드에 남기되 쓰지 않는다** —
 * 지난 행사가 가리키고 있어 지울 수 없고(409 `EVENT_CLASSIFICATION_IN_USE`), 이름을 바꾸거나 새
 * 행사에 고르는 것을 막지도 않는다(막을 근거가 서버에 없다). 분류 관리 화면이 이름 옆에 이 사실만
 * 적는다 — 새 운영진이 «모집» 분류 행사를 만들어 `/join`에 뜨길 기다리는 일이 없게.
 *
 * 코드로 매핑한 표다 — 표시명(«모집»)은 운영진이 바꿀 수 있는 값이라 판정 근거가 못 된다.
 */
export const UNUSED_EVENT_CLSF_NOTE: Readonly<Record<string, string>> = {
  RECRUIT: "쓰지 않음 — 신입 모집은 지정 폼(ADR-0044)",
};

export const DELETED_EVENT_BADGE: { label: string; tone: BadgeTone } = {
  label: "삭제됨",
  tone: "outline-red",
};
