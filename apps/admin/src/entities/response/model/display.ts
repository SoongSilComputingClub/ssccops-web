import {
  RSPNS_STTS_NM,
  RVW_PRCS_SE_NM,
  type RspnsSttsCd,
  type RvwPrcsSeCd,
} from "@/shared/config/codes";
import type { RspnsCn } from "@ssccops/form-renderer";
import type { BadgeTone } from "@/shared/ui";

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
  /*
   * 수정요청은 응답자의 차례로 넘어간 상태다 — 결론(승인·반려)도 아니고 검토를 기다리는
   * 중도 아니라, 앞뒤 어느 쪽과도 같은 색이면 목록에서 구별되지 않는다. 회의 상태의
   * '진행 중' 계열과 같은 amber를 쓴다.
   */
  CHANGES_REQUESTED: { label: RSPNS_STTS_NM.CHANGES_REQUESTED, tone: "amber" },
  ACCEPTED: { label: RSPNS_STTS_NM.ACCEPTED, tone: "blue" },
  REJECTED: { label: RSPNS_STTS_NM.REJECTED, tone: "red" },
};

/** 처리 이력 줄의 처리 구분 배지 — 상태 배지와 색 어휘를 맞춘다(같은 일을 같은 색으로) */
export const RVW_PRCS_SE_BADGE: Record<
  RvwPrcsSeCd,
  { label: string; tone: BadgeTone }
> = {
  // 제출은 응답자가 한 일이라 검토자의 처리 셋과 색으로 갈라 둔다
  SUBMIT: { label: RVW_PRCS_SE_NM.SUBMIT, tone: "outline" },
  ACCEPT: { label: RVW_PRCS_SE_NM.ACCEPT, tone: "blue" },
  REQUEST_CHANGES: { label: RVW_PRCS_SE_NM.REQUEST_CHANGES, tone: "amber" },
  REJECT: { label: RVW_PRCS_SE_NM.REJECT, tone: "red" },
};

/** 응답값 표시 문자열 — 다중선택은 ", "로 잇는다 */
export function rspnsValueText(rspnsCn: RspnsCn, qitemId: string): string {
  const v = rspnsCn[qitemId];
  if (v === undefined) return "";
  return Array.isArray(v) ? v.join(", ") : v;
}
