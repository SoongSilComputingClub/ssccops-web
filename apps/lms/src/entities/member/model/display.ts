import type { AssignableMember } from "./types";

/**
 * 회원 고르기 목록의 둘째 줄 — «N기 · 대표 역할»(역할이 없으면 등급) (#742).
 *
 * 어드민 담당자 셀렉트의 `assignableMemberLabel`과 같은 순서다(이름 · 기수 · 역할). 앱끼리 소스를
 * 나누지 않아 옮겨 적었다 — 한 줄짜리 표기라 패키지로 올릴 덩어리가 아니다. 기수가 없으면
 * «미배정»(어드민 `generationText`와 같은 말)이다.
 */
export function assignableMemberMeta(member: AssignableMember): string {
  return [
    member.generationNumber ? `${member.generationNumber}기` : "미배정",
    member.representativeRoleName ?? member.membershipGradeName,
  ]
    .filter(Boolean)
    .join(" · ");
}
