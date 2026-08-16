/*
 * 회원 표시 규칙.
 *
 * 목 스토어(`model/store.ts`)가 지고 있던 것 중 **데이터가 아니라 표시 규칙인 것**만 여기 남았다
 * (#54). 목 시드를 훑던 파생 함수(`genNoText`·`isGraduate`·`currentRoleRels`·`rprsRoleRel`)는
 * 목 행 타입을 인자로 받던 것이라 시드와 함께 사라졌다 — 지금 화면이 받는 것은 서버 응답이고,
 * 그쪽은 필요한 값을 이미 필드로 들고 온다.
 *
 * 여기 있는 함수는 전부 **코드값 하나 또는 원시값 하나**를 받는다. 서버 응답 타입을 인자로
 * 받지 않는 것은 의도한 것이다 — 응답 스키마가 바뀌어도 표시 규칙은 그대로여야 하고, 목록·상세·
 * 내 계정처럼 모양이 다른 응답이 같은 규칙을 공유할 수 있어야 한다.
 */

import { MBR_GRD_NM, MBR_STTS_NM, type MbrGrdCd, type MbrSttsCd } from "@/shared/config/codes";

/* ── 코드 → 표시명 ─────────────────────────────────────────── */

/**
 * 회원_등급_코드 → 표시명.
 *
 * **회원 API를 쓰는 화면은 이 함수 대신 서버가 준 `membershipGradeName`을 쓴다**
 * (근거는 api/members.ts 첫 주석). 여기 남은 것은 등급명을 함께 내려주지 않는 응답
 * (응답 목록·상세의 회원 요약)이 코드값만 들고 오기 때문이다.
 */
export function mbrGrdNm(cd: MbrGrdCd): string {
  return MBR_GRD_NM[cd];
}

/** 회원_상태_코드 → 표시명. {@link mbrGrdNm}과 같은 자리에서만 쓴다 */
export function mbrSttsNm(cd: MbrSttsCd): string {
  return MBR_STTS_NM[cd];
}

/* ── 뱃지 톤 ───────────────────────────────────────────────── */

/**
 * 등급 배지 톤: 임시회원=grey, 그 외=blue.
 *
 * 색은 표시 문자열이 아니라 **코드의 의미**에 달려 있어, 기준정보에서 이름을 바꿔도 그대로여야
 * 한다 — 그래서 이름은 서버 값을 쓰면서 색만 코드로 정한다(api/members.ts 첫 주석).
 */
export function mbrGrdTone(cd: MbrGrdCd): "grey" | "blue" {
  return cd === "TEMP" ? "grey" : "blue";
}

/** 상태 배지 톤: 탈퇴·제명=red, 그 외=grey */
export function mbrSttsTone(cd: MbrSttsCd): "red" | "grey" {
  return cd === "WITHDRAWN" || cd === "EXPELLED" ? "red" : "grey";
}

/* ── 파생 표기 ─────────────────────────────────────────────── */

/**
 * 기수_번호 표기 — "12기".
 *
 * 서버는 기수 미배정을 null로 표현한다. 값 하나를 받는 이 함수가 그것을 한 문장으로 옮긴다 —
 * 화면마다 `?? "미배정"`을 적으면 0을 "0기"로 그리는 자리가 생긴다.
 */
export function generationText(generationNumber: number | null): string {
  return generationNumber ? `${generationNumber}기` : "미배정";
}
