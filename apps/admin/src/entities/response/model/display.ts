import { RSPNS_STTS_NM, type RspnsSttsCd } from "@/shared/config/codes";
import type { BadgeTone } from "@/shared/ui";
import type { RspnsCn } from "./types";

/*
 * 응답 표시 헬퍼.
 *
 * 목 스토어(model/store.ts)에서 떼어 냈다. 목록·상세는 이제 서버에서 데이터를 받으므로
 * 배지 표기 하나 쓰자고 zustand 스토어와 목 시드 JSON을 함께 끌어올 이유가 없다.
 */

/** 응답 상태 배지 표기 — 라벨은 기준 코드 사전에서 가져와 표기가 갈라지지 않게 한다 */
export const RSPNS_STTS_BADGE: Record<RspnsSttsCd, { label: string; tone: BadgeTone }> = {
  // 작성 중은 심사 대상이 아니라는 것이 한눈에 보여야 해서 무채색으로 둔다
  DRAFT: { label: RSPNS_STTS_NM.DRAFT, tone: "outline" },
  SUBMITTED: { label: RSPNS_STTS_NM.SUBMITTED, tone: "blue" },
  ACCEPTED: { label: RSPNS_STTS_NM.ACCEPTED, tone: "blue" },
  REJECTED: { label: RSPNS_STTS_NM.REJECTED, tone: "red" },
};

/** 응답값 표시 문자열 — 다중선택은 ", "로 잇는다 */
export function rspnsValueText(rspnsCn: RspnsCn, qitemId: string): string {
  const v = rspnsCn[qitemId];
  if (v === undefined) return "";
  return Array.isArray(v) ? v.join(", ") : v;
}
