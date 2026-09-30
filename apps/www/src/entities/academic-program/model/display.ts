import type { BadgeTone } from "@/shared/ui";
import type { AcdmActvSttsCd } from "./types";

/*
 * 활동_상태 배지 — lms `acdmActvSttsBadge`와 같은 어휘 (#518).
 *
 * **`APPROVED`("승인")는 배지를 그리지 않는다.** `mine=leader`가 주는 활동은 이미 승인된
 * 것뿐이라 "승인" 라벨은 아무것도 구별해 주지 않는다. 진행 중·수료·폐지만 상태로 표시한다 —
 * 셋이 "지금 굴러가는가"를 가른다. 어휘·색은 어드민 `ACDM_ACTV_STTS_NM`·lms와 맞춘다(폐지는
 * 빨강 면 · #741 — 수료와 같은 회색이면 «끝까지 한 것»과 «중단된 것»이 갈리지 않는다).
 */
const ACDM_ACTV_STTS_BADGE: Partial<Record<AcdmActvSttsCd, { label: string; tone: BadgeTone }>> = {
  ONGOING: { label: "진행 중", tone: "blue" },
  COMPLETED: { label: "수료", tone: "grey" },
  DISCONTINUED: { label: "폐지", tone: "red" },
};

/** 상태 배지 정보 — `APPROVED`는 `null`(배지 없음). 호출부가 null이면 배지 요소를 건너뛴다 */
export function acdmActvSttsBadge(
  code: AcdmActvSttsCd,
): { label: string; tone: BadgeTone } | null {
  return ACDM_ACTV_STTS_BADGE[code] ?? null;
}
