"use client";

import { apiFetchAuthedNullableFromBrowser } from "@/shared/api/browser-client";
import type { AssignableMember } from "../model/types";

/*
 * 팀원으로 넣을 수 있는 회원 목록 (#742 · GET /v1/members/assignable) — 브라우저 전용.
 *
 * 팀원 추가 시트를 열 때 부른다(명단 화면을 그릴 때마다 동아리 회원 전량을 받지 않는다).
 * **인증만 요구한다** — 어드민 업무 담당자 선택이 쓰는 그 목록이고, 서버가 탈퇴·제명 회원을
 * 이미 걸러 활동 회원만 배열로 내린다(페이징 없음). `authority` 필터는 주지 않는다 — 팀원은
 * 동아리 회원 누구나 될 수 있다(2026-09-30 결정).
 */

interface AssignableMemberResponse {
  memberId: number;
  name: string | null;
  generationNumber: number | null;
  membershipGradeName: string | null;
  representativeRoleName: string | null;
}

function toAssignableMember(res: AssignableMemberResponse): AssignableMember {
  return {
    memberId: res.memberId,
    name: res.name ?? "",
    generationNumber: res.generationNumber ?? null,
    membershipGradeName: res.membershipGradeName ?? "",
    representativeRoleName: res.representativeRoleName ?? null,
  };
}

export async function fetchAssignableMembers(): Promise<AssignableMember[]> {
  const res =
    await apiFetchAuthedNullableFromBrowser<AssignableMemberResponse[]>("/v1/members/assignable");
  return (res ?? []).map(toAssignableMember);
}
