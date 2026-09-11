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
import { MEMBER_CHANGE_WARNING } from "../api/members";

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

/**
 * 등급·상태 변경 경고 코드 → 무엇이 남았는지를 가리키는 짧은 이름 (#48 · 서버 #78).
 *
 * 상세의 경고 패널과 일괄 변경의 행별 결과(#382)가 같은 배지를 그린다 — 한 곳이 "역할"이고
 * 다른 곳이 "현재 역할"이면 같은 경고가 화면마다 다른 것처럼 읽힌다. 모르는 코드는
 * "확인 필요"로 두고 서버 문장을 그대로 보여 준다 — 화면이 모르는 경고를 삼키면 그 사실만
 * 조용히 사라진다.
 */
export function changeWarningLabel(code: string): string {
  switch (code) {
    case MEMBER_CHANGE_WARNING.CURRENT_ROLES_REMAIN:
      return "역할";
    case MEMBER_CHANGE_WARNING.ASSIGNED_SUB_WORKS_REMAIN:
      return "하위 업무";
    default:
      return "확인 필요";
  }
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

/**
 * 동아리 가입 시기 표기 — "2020년 3월" · 월을 모르면 "2020년" · 아무것도 없으면 `-`.
 *
 * **월이 비어 있는 것은 정상이다.** 모르는 달을 비워 두라고 만든 값이라, 없는 달을 1월로
 * 굳히거나 "미상"처럼 사실이 아닌 낱말을 붙이지 않는다.
 *
 * `-`를 여기서 정하는 것은 이것이 **표시 규칙**이기 때문이다. 서버 응답을 옮기는 변환 함수
 * (`to*`)에서 채우면 "값이 없다"와 "서버가 `-`를 줬다"가 구별되지 않는다.
 */
export function clubJoinPeriodText(
  clubJoinYear: number | null,
  clubJoinMonth: number | null,
): string {
  if (clubJoinYear == null) return "-";
  return clubJoinMonth == null ? `${clubJoinYear}년` : `${clubJoinYear}년 ${clubJoinMonth}월`;
}
