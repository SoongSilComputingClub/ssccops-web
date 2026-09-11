import type { EventReceiptStatus } from "@/entities/event";

/**
 * 신청할 수 없는 이유 한 줄 — **코드로 가른다**(표시 문자열로 비교하지 않는다).
 *
 * 아직 시작하지 않은 모집만 따로 말한다. 그때는 기다리면 열리지만 마감·종료는 그렇지 않아,
 * 하나로 뭉뚱그리면 다시 올 이유가 있는 사람과 없는 사람이 같은 문장을 읽는다.
 *
 * 서버 컴포넌트(패널 — 폼을 가리키지 못하는 행사)와 클라이언트 컴포넌트(버튼 자리)가 함께
 * 쓰므로 "use client" 파일 밖에 둔다 — 그 안의 함수는 서버 컴포넌트가 가져다 쓸 수 없다.
 */
export function closedMessage(receiptStatus: EventReceiptStatus): string {
  return receiptStatus === "SCHEDULED" || receiptStatus === "DRAFT"
    ? "아직 모집이 시작되지 않았습니다 — 모집 기간에 다시 확인해주세요"
    : "지금은 신청을 받지 않습니다 — 모집 기간에 다시 확인해주세요";
}
