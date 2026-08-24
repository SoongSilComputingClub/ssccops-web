import { apiFetch } from "@/shared/lib/api/client";
import type { MemberProfile } from "../model/types";

/*
 * 이관 회원 계정 연결 API (POST /v1/members/link · ssccops-server #86 · ssccops#78 A안).
 *
 * ── 왜 entities/session에 있는가 ───────────────────────────────
 * 이 호출의 결과는 "새로 만든 회원"이 아니라 **이 계정이 앞으로 누구인가**다. 응답이 세션의
 * member 블록(`MemberProfile`)과 같은 모양이고, 성공하면 세션 스토어를 그대로 갈아 끼운다 —
 * 세션 조회(`api/session.ts`)가 이 레이어에 있는 것과 같은 이유로 여기 둔다.
 *
 * ── 가입 전에 부를 수 있는 유일한 회원 API다 ───────────────────
 * 서버가 `@CurrentMember`(가입한 회원)가 아니라 인증 주체를 직접 받는다. 아직 회원 행이 없는
 * 사람이 부르는 경로이기 때문이다 — 그래서 403 SIGNUP_REQUIRED로 튕기지 않는다.
 */

/**
 * 연결 요청 본문 (서버 `MemberLinkRequest`).
 *
 * 필드명이 이 파일의 다른 타입(`studentNumber`·`name`·`phoneNumber`)과 달리 데이터사전 표기인
 * 것은 **서버 계약이 그렇기 때문이다.** 보기 좋으라고 camel English로 바꿔 적으면 서버가 세
 * 필드를 모두 못 읽어 언제나 404 `MEMBER_LINK_FAILED`가 되는데, 화면에는 "일치하는 회원이
 * 없습니다"로만 보여 원인을 짚기까지 오래 걸리는 종류의 실패다.
 *
 * 세 값 모두 필수다. 하나라도 비면 연결 후보를 좁힐 수 없어 서버가 400으로 거절한다.
 */
export interface MemberLinkRequest {
  /** 학생_번호V20 */
  stdntNo: string;
  /** 회원_명V50 — 서버가 앞뒤 공백을 제거하고 비교한다 */
  mbrNm: string;
  /** 전화번호V20 — 서버가 숫자만 남겨 비교하므로 하이픈 유무를 가리지 않는다 */
  telno: string;
}

/**
 * 연결 API가 돌려주는 오류 코드 (서버 `MemberLinkErrorCode`).
 *
 * **어느 항목이 틀렸는지는 어느 코드에도 실려 오지 않는다.** 서버가 일부러 알려주지 않는
 * 것이고(VR-M23), 세 값 중 무엇이 맞았는지 되돌려 주면 이 화면이 곧 명부 조회 도구가 된다 —
 * 학번 하나만 바꿔 가며 두드리면 남의 이름·연락처를 맞혀 볼 수 있다. 화면도 같은 이유로
 * 항목별 오류를 그리지 않는다(features/auth/model/link-form.ts).
 */
export const MEMBER_LINK_ERROR = {
  /** 세 값과 모두 일치하는 회원이 없다 (404) */
  MEMBER_LINK_FAILED: "MEMBER_LINK_FAILED",
  /** 그 회원은 이미 다른 소셜 계정과 연결돼 있다 (409) */
  MEMBER_ALREADY_LINKED: "MEMBER_ALREADY_LINKED",
  /** 이미 가입을 마친 계정이 연결을 시도했다 (409) — 실패가 아니라 이미 끝난 일이다 */
  ALREADY_SIGNED_UP: "ALREADY_SIGNED_UP",
  /** 시도 횟수 초과 (429) — 위 무차별 대입을 막는 장치다 */
  TOO_MANY_LINK_ATTEMPTS: "TOO_MANY_LINK_ATTEMPTS",
} as const;

/**
 * POST /v1/members/link — 이미 명부에 있는(CSV로 이관된) 회원에 이 소셜 계정을 붙인다.
 *
 * 가입(`POST /v1/members/signup`)과 **결과가 다르다.** 가입은 임시회원 행을 새로 만들지만
 * 연결은 기존 행을 그대로 쓴다 — 이관된 등급·기수·역할이 응답에 그대로 실려 온다. 응답에
 * 임시회원이 보인다면 연결이 아니라 새 가입이 일어난 것이다.
 *
 * 응답이 세션의 member와 같은 모양이라 연결 직후 세션을 다시 조회하지 않는다(가입·본인 프로필
 * 수정이 이미 쓰는 계약이다).
 */
export function linkExistingMember(request: MemberLinkRequest): Promise<MemberProfile> {
  return apiFetch<MemberProfile>("/v1/members/link", {
    method: "POST",
    body: JSON.stringify(request),
  });
}
