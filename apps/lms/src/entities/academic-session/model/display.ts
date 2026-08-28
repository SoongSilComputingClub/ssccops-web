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

export function sesnSttsBadge(code: SesnSttsCd) {
  return SESN_STTS_BADGE[code];
}
