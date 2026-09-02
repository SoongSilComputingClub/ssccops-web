import type { BadgeTone } from "@/shared/ui";
import type { SesnSttsCd } from "./types";

/*
 * 회차_실적_상태 표기 (#128).
 *
 * **코드값을 화면에 그대로 내보내지 않는다** — 라벨은 여기서만 만든다(www가 슬라이스마다 두는
 * display 모듈과 같은 규칙). 어드민 `SESN_STTS_NM`과 어휘를 맞춘다(미제출·제출·승인·수정요청).
 * 이 상태들은 표준코드 시드가 아니라 서버 enum이라 `data.sql`과 글자를 맞출 대상이 없다 —
 * 화면이 갖는 어휘다(#122 결정).
 */

export const SESN_STTS_BADGE: Record<SesnSttsCd, { label: string; tone: BadgeTone }> = {
  NOT_SUBMITTED: { label: "미제출", tone: "amber" },
  SUBMITTED: { label: "제출", tone: "blue" },
  APPROVED: { label: "승인", tone: "grey" },
  REVISION_REQUESTED: { label: "수정요청", tone: "outline-accent" },
};

/**
 * 상태 코드 → 배지. **없는 코드에도 반드시 배지를 돌려준다.**
 *
 * 이 함수는 목록을 그리는 `map` 안에서 불리므로, `undefined`를 돌려주면 호출부의
 * `badge.tone`이 화면 전체를 런타임 오류로 무너뜨린다(서버가 필드명을 바꾸거나 상태를 새로
 * 추가하면 타입은 통과한 채 값만 비는데, 그때 회차 한 줄이 아니라 활동 상세가 통째로 죽었다).
 * 코드값을 그대로 노출하지 않는 규칙은 지키되(라벨은 빈 값 표기로 둔다), 한 줄의 결손이 페이지를
 * 끌어내리지는 않게 한다.
 */
export function sesnSttsBadge(code: SesnSttsCd): { label: string; tone: BadgeTone } {
  return SESN_STTS_BADGE[code] ?? { label: "-", tone: "grey" };
}
