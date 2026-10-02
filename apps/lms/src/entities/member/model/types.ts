/*
 * 회원 도메인 타입 — lms에서는 «팀원으로 넣을 수 있는 회원» 하나뿐이다 (#742).
 *
 * 어드민 `entities/member`와 이름은 같지만 소스를 공유하지 않는다(FSD 레이어는 앱마다 갖는다 ·
 * 루트 AGENTS.md). 스터디장이 팀원을 고르는 데 필요한 것만 둔다.
 */

/**
 * 팀원으로 넣을 수 있는 회원 한 명 (`AssignableMemberResponse` · GET /v1/members/assignable).
 *
 * 어드민 업무 담당자 후보와 **같은 목록**이다 — 서버가 팀원 추가(server#612)를 같은 판정
 * (`MemberService.findAssignableMember` — 탈퇴·제명 제외)으로 막으므로, 목록과 저장이 갈리지
 * 않는다. 권한 없이 부르는 목록이라 서버가 연락처·이메일·학번을 내리지 않는다 — 동명이인은
 * 기수·대표 역할로 가른다.
 */
export interface AssignableMember {
  memberId: number;
  /** 회원 이름. 서버가 비워 보내면 빈 문자열로 굳힌다(표시 규칙은 뷰) */
  name: string;
  /** 기수. 미배정이면 null */
  generationNumber: number | null;
  /** 회원 등급 표시명 — 대표 역할이 없을 때 대신 보인다 */
  membershipGradeName: string;
  /** 대표 역할 이름. 없으면 null */
  representativeRoleName: string | null;
}
