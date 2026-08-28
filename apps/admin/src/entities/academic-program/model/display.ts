import type { BadgeTone } from "@/shared/ui";
import type { AcdmActvSttsCd, SesnSttsCd } from "@/shared/config/codes";

/*
 * 학술 활동·회차 상태 → 배지 톤 (#125).
 *
 * 표시명은 여기서 만들지 않는다 — ACDM_ACTV_STTS_NM·SESN_STTS_NM(shared/config/codes.ts)이
 * 그 자리다(코드 → 이름 사전은 한 곳). 여기는 그 코드에 어떤 색을 입힐지만 정한다
 * (workSttsTone과 같은 자리).
 */

/** 활동 상태 배지 톤 — 승인(대기 느낌) · 진행 중(파랑) · 수료(회색으로 마감) */
export function acdmActvSttsTone(cd: AcdmActvSttsCd): BadgeTone {
  if (cd === "ONGOING") return "blue";
  if (cd === "COMPLETED") return "grey";
  return "amber";
}

/** 회차 실적 상태 배지 톤 — 미제출은 옅게, 제출은 검토 대기(amber), 승인은 파랑, 수정요청은 빨강 */
export function sesnSttsTone(cd: SesnSttsCd): BadgeTone {
  switch (cd) {
    case "APPROVED":
      return "blue";
    case "SUBMITTED":
      return "amber";
    case "REVISION_REQUESTED":
      return "outline-red";
    default:
      return "outline";
  }
}
