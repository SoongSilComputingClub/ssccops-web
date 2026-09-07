import type { BadgeTone } from "@/shared/ui";
import type { ResponseStatus } from "./types";

/*
 * 응답 상태 표기.
 *
 * **코드값을 화면에 그대로 내보내지 않는다** — 라벨은 여기서만 만든다(신청 상태 배지와 같은
 * 규칙이다, `entities/application/model/display.ts`).
 *
 * 색은 그쪽 표와 맞춘다. 한 앱에서 '반려'가 화면마다 다른 색이면 사용자는 두 화면이 다른
 * 이야기를 한다고 읽는다 — 어드민은 반려에 붉은색을 쓰지만 이 앱의 팔레트에는 그 톤이 없고,
 * '내 신청'이 이미 회색으로 그리고 있다.
 */
export const RESPONSE_STATUS_BADGE: Record<
  ResponseStatus,
  { label: string; tone: BadgeTone }
> = {
  /** 아직 내지 않은 답 — 심사 축이 아니라는 것이 한눈에 보여야 해서 무채색으로 둔다 */
  DRAFT: { label: "작성 중", tone: "outline" },
  SUBMITTED: { label: "제출됨", tone: "outline-accent" },
  /*
   * 수정요청은 응답자의 차례로 넘어간 상태다 — 결론(승인·반려)도 아니고 검토를 기다리는 중도
   * 아니라, 앞뒤 어느 쪽과도 같은 색이면 목록에서 구별되지 않는다.
   */
  CHANGES_REQUESTED: { label: "수정요청", tone: "amber" },
  ACCEPTED: { label: "승인", tone: "blue" },
  REJECTED: { label: "반려", tone: "grey" },
};
