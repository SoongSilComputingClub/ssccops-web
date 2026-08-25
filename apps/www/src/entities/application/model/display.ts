import type { BadgeTone } from "@/shared/ui";
import type { ApplicationStatus } from "./types";

/*
 * 신청 상태 표기.
 *
 * **코드값을 화면에 그대로 내보내지 않는다** — 라벨은 여기서만 만든다(행사 배지와 같은 규칙이다,
 * entities/event/model/display.ts).
 *
 * 설명 문장을 라벨과 함께 두는 것은 이 화면이 wave2 **D10**의 전부이기 때문이다. 능동 통보
 * (이메일 등)가 없으므로 신청한 사람은 여기서만 결과를 안다 — 배지 한 단어로는 "승인"과 "확정"이
 * 무엇이 다른지, 지금 무엇을 기다리면 되는지가 전해지지 않는다.
 *
 * **어느 문장도 대기 순번을 말하지 않는다**(D5 — 비공개). 응답에 순번이 없기도 하지만, 없는
 * 값을 "곧 차례가 옵니다" 식으로 짐작해 쓰면 그것대로 약속이 된다.
 */
export const APPLICATION_STATUS_BADGE: Record<
  ApplicationStatus,
  { label: string; tone: BadgeTone; note: string }
> = {
  SUBMITTED: {
    label: "제출됨",
    tone: "outline",
    note: "신청서가 접수되었습니다 — 결과가 정해지면 이 화면에 표시됩니다",
  },
  ACCEPTED: {
    label: "승인",
    tone: "outline-accent",
    note: "신청이 승인되었습니다 — 참가 확정 처리를 기다리고 있습니다",
  },
  REJECTED: {
    label: "반려",
    tone: "grey",
    note: "이번에는 선발되지 않았습니다",
  },
  CONFIRMED: {
    label: "확정",
    tone: "blue",
    note: "참가가 확정되었습니다",
  },
  WAITLISTED: {
    label: "대기",
    tone: "amber",
    note: "대기 상태입니다 — 자리가 나면 이 화면에서 확인할 수 있습니다",
  },
  CANCELLED: {
    label: "취소",
    tone: "grey",
    note: "신청이 취소되었습니다",
  },
};

/** 상태 배지 한 벌 — 라벨·색·설명 문장 */
export function applicationStatusBadge(status: ApplicationStatus) {
  return APPLICATION_STATUS_BADGE[status];
}
