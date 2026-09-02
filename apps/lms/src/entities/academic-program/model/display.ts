import type { BadgeTone } from "@/shared/ui";
import type { AcdmActvSttsCd, PtcpSttsCd } from "./types";

/*
 * 팀원 상태·역할 표기 (#131).
 *
 * **코드값을 화면에 그대로 내보내지 않는다** — 라벨은 여기서만 만든다(apps/www가 슬라이스마다
 * 두는 display 모듈과 같은 규칙). 어드민 `PTCP_STTS_NM`과 어휘를 맞춘다(확정·대기·취소) —
 * 팀원 명단은 스터디장이 보는 화면이라 운영 어휘를 그대로 쓴다.
 */

/** 참가_상태 배지 — 라벨과 색 */
export const PTCP_STTS_BADGE: Record<PtcpSttsCd, { label: string; tone: BadgeTone }> = {
  CONFIRMED: { label: "확정", tone: "blue" },
  WAITLISTED: { label: "대기", tone: "amber" },
  CANCELLED: { label: "취소", tone: "grey" },
};

export function ptcpSttsBadge(code: PtcpSttsCd) {
  return PTCP_STTS_BADGE[code];
}

/**
 * 역할 배지 — 서버가 준 `isLeader`로만 가른다(#131 결정).
 *
 * `leadrMbrId`를 웹에서 다시 계산하지 않는다. 스터디장/팀장 구분(스터디는 '스터디장',
 * 프로젝트는 '팀장')은 이 화면에 활동 유형이 오지 않아 하지 못하므로 '스터디장'으로 적는다 —
 * 프로토타입도 이 화면을 스터디장 메뉴(LEADER_NAV)에 두었다.
 */
export function memberRoleBadge(isLeader: boolean): { label: string; tone: BadgeTone } {
  return isLeader
    ? { label: "스터디장", tone: "outline-accent" }
    : { label: "팀원", tone: "outline" };
}

/**
 * 활동_상태 배지 (#126 · #192).
 *
 * **`APPROVED`("승인")는 배지를 그리지 않는다.** lms의 학술 화면은 이미 승인된 활동만
 * 다루므로(스터디장/팀장으로 지정된 활동 = `mine=leader`) "승인" 라벨은 아무것도 구별해 주지
 * 않는다. 진행 중·수료만 상태로 표시한다 — 그 둘은 "지금 굴러가는가"를 가른다.
 *
 * 어휘는 어드민 `ACDM_ACTV_STTS_NM`과 맞춘다(진행 중·수료).
 */
const ACDM_ACTV_STTS_BADGE: Partial<
  Record<AcdmActvSttsCd, { label: string; tone: BadgeTone }>
> = {
  ONGOING: { label: "진행 중", tone: "blue" },
  COMPLETED: { label: "수료", tone: "grey" },
};

/** 상태 배지 정보 — `APPROVED`는 `null`(배지 없음). 호출부가 null이면 배지 요소를 건너뛴다 */
export function acdmActvSttsBadge(
  code: AcdmActvSttsCd,
): { label: string; tone: BadgeTone } | null {
  return ACDM_ACTV_STTS_BADGE[code] ?? null;
}
