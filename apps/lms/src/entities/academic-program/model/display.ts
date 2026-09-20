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

/**
 * 활동 유형 표시명 (#528).
 *
 * **`typeCd`를 가진 슬라이스에 둔다.** 모집 카드가 처음 필요로 했지만 `entities/form`에
 * 두면, 유형이 늘었을 때 고칠 자리를 활동 슬라이스에서 찾게 된다 — 못 찾으면 배지가 조용히
 * raw enum으로 떨어진다.
 *
 * 값은 런타임 코드테이블의 PK 문자열이라 목록 응답에 표시명이 없다(`AcademicProgramSummary`
 * 주석). 그래서 화면이 표시명을 갖는다 — 모르는 코드는 **코드 그대로** 보여 준다(«기타»로
 * 뭉개면 새 유형이 들어온 것을 아무도 모른다).
 *
 * **이름은 서버 `acdm_actv_type.type_nm`과 글자까지 같아야 한다** (#568). 기획안 응답은 유형을
 * 문자열로 저장하고 승인 이관이 그것을 코드로 되돌리므로(서버 `ProposalResponseParser`), 여기서
 * 이름을 다듬으면 화면과 기준정보가 갈린다. `TRACK`은 서버 #510이 세웠다.
 *
 * **`typeCd`를 유니온 타입으로 좁히지 않는다.** 유형은 배포 없이 `acdm_actv_type`에 행을 더하는
 * 것으로 늘어나게 설계됐다 — 유니온으로 박으면 다음 유형이 들어올 때 타입이 먼저 막는다
 * (`AcdmActvSttsCd`가 서버 enum이라 유니온인 것과 갈리는 자리).
 */
const ACADEMIC_PROGRAM_TYPE_NM: Record<string, string> = {
  STUDY: "스터디",
  PROJECT: "프로젝트",
  TRACK: "트랙",
};

export function acdmActvTypeNm(typeCd: string): string {
  return ACADEMIC_PROGRAM_TYPE_NM[typeCd] ?? typeCd;
}
