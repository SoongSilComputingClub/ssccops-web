import { CNTNT_CLSF_NM, PUB_STTS_NM, type CntntClsfCd, type PubSttsCd } from "@/shared/config/codes";
import type { BadgeTone } from "@/shared/ui";

/*
 * 콘텐츠 배지 표기 (#521). 표시명은 기준 코드 사전에서 오고 여기서는 색만 정한다 —
 * 행사(entities/event/model/display.ts)와 같은 판단. '게시'만 blue인 것은 공개 화면에 실제로
 * 보이는 유일한 상태이기 때문이다.
 */

export const PUB_STTS_BADGE_TONE: Record<PubSttsCd, BadgeTone> = {
  DRAFT: "outline",
  PUBLISHED: "blue",
};

/** 게시 상태 배지 한 벌 — 화면은 이 함수 하나로 라벨·색을 함께 얻는다 */
export function pubSttsBadge(cd: PubSttsCd): { label: string; tone: BadgeTone } {
  return { label: PUB_STTS_NM[cd], tone: PUB_STTS_BADGE_TONE[cd] };
}

/** 분류 필 — 세 값 다 같은 색이다. 분류는 상태가 아니라 «어느 묶음인가»라 색으로 가르지 않는다 */
export function cntntClsfLabel(cd: CntntClsfCd): string {
  return CNTNT_CLSF_NM[cd];
}
