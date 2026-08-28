import type { RspnsCn } from "@ssccops/form-renderer";
import {
  RSPNS_PRCS_SE_NM,
  RSPNS_STTS_NM,
  type RspnsPrcsSeCd,
  type RspnsSttsCd,
} from "@/shared/config/codes";
import type { BadgeTone } from "@/shared/ui";

/*
 * 응답 표시 헬퍼 (#171). 어드민 `entities/response/model/display.ts`에서 옮겨 왔다.
 *
 * lms의 배지 어휘가 어드민과 일부 다르다 — 이 앱에는 `red` 톤이 없어(badge.tsx는 blue·grey·
 * amber·outline·outline-accent) 반려는 `outline`으로 둔다. 색으로만 구분하지 않고 라벨이
 * 함께 말하므로(승인/반려) 문제되지 않는다.
 */

/** 응답 상태 배지 — 라벨은 코드 사전에서 가져와 표기가 갈라지지 않게 한다 */
export const RSPNS_STTS_BADGE: Record<RspnsSttsCd, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: RSPNS_STTS_NM.DRAFT, tone: "outline" },
  SUBMITTED: { label: RSPNS_STTS_NM.SUBMITTED, tone: "blue" },
  // 수정요청은 응답자의 차례로 넘어간 상태다 — 앞뒤 어느 쪽과도 같은 색이면 구별되지 않는다
  CHANGES_REQUESTED: { label: RSPNS_STTS_NM.CHANGES_REQUESTED, tone: "amber" },
  ACCEPTED: { label: RSPNS_STTS_NM.ACCEPTED, tone: "blue" },
  REJECTED: { label: RSPNS_STTS_NM.REJECTED, tone: "outline" },
};

/** 처리 이력 줄의 처리 구분 배지 — 상태 배지와 색 어휘를 맞춘다 */
export const RSPNS_PRCS_SE_BADGE: Record<
  RspnsPrcsSeCd,
  { label: string; tone: BadgeTone }
> = {
  SUBMIT: { label: RSPNS_PRCS_SE_NM.SUBMIT, tone: "outline" },
  ACCEPT: { label: RSPNS_PRCS_SE_NM.ACCEPT, tone: "blue" },
  REQUEST_CHANGES: { label: RSPNS_PRCS_SE_NM.REQUEST_CHANGES, tone: "amber" },
  REJECT: { label: RSPNS_PRCS_SE_NM.REJECT, tone: "outline" },
};

/** 응답값 표시 문자열 — 다중선택은 ", "로 잇는다. 답이 없으면 빈 문자열 */
export function rspnsValueText(rspnsCn: RspnsCn, qitemId: string): string {
  const v = rspnsCn[qitemId];
  if (v === undefined) return "";
  return Array.isArray(v) ? v.join(", ") : v;
}
