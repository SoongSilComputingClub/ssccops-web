import { ROUTES } from "@/shared/config/routes";

/**
 * 상단 바 메뉴 목차 — 데스크톱 메뉴와 모바일 드로어가 **이 한 벌**을 함께 쓴다 (#169).
 *
 * 목차를 컴포넌트 밖에 둔 이유는 apps/www(#167)·어드민(`use-shell-nav.ts`)과 같다 — 한쪽에만
 * 메뉴를 더하면 다른 쪽에서 빠진다. 항목이 붙을 때 여기 한 줄을 늘리면 된다.
 *
 * ── 역할별 목차 ──────────────────────────────────────────────
 * 프로토타입의 역할별 목차를 그대로 따른다. 스터디장은 자기 스터디를 운영하는 화면을, 일반
 * 회원은 기획안을 내고 상태를 보는 화면을 본다.
 *
 * **역할별 필터링은 `visibleNavLinks`가 한다** (#224 — #169가 잡아 둔 자리를 채웠다).
 * 판정 근거는 `GET /v1/academic-programs?mine=true`에 `isLeader === true`인 활동이 있는가이고
 * (`fetchIsAcademicLeader`), 그 조회는 루트 레이아웃이 서버에서 한 번 해 두 컴포넌트에 같은
 * 값으로 내려보낸다. 로그인 여부로 갈리는 항목(로그아웃 등)은 목차에 없고 `AuthNav`가
 * 클라이언트에서 판정해 그린다(apps/www와 같은 이유 — 세션 조회를 SSR에 끼워 넣지 않으려고,
 * 다만 이 앱은 전 화면이 로그인 필수라 그 부담이 www만큼 크지는 않다).
 *
 * **'참여 신청'은 목차에 넣지 않는다** — 모집 신청은 시스템 폼으로 처리하기로 했고(2026-08-28
 * 확정) 신청 화면을 학술 쪽에 따로 만들지 않는다(#169).
 */
export type NavRole = "STUDY_LEAD" | "MEMBER";

export type NavLink = {
  href: string;
  label: string;
  /** 이 항목이 보이는 역할 */
  role: NavRole;
  /** 현재 경로가 이 항목에 속하는지 — 하위 경로(/studio/record 등)에서도 켜져야 한다 */
  isActive: (pathname: string) => boolean;
};

const starts = (prefix: string) => (p: string) => p === prefix || p.startsWith(`${prefix}/`);

export const NAV_LINKS: readonly NavLink[] = [
  // 스터디장: 학술 대시보드 · 내 활동 · 회차 기록 · 출석부 · 팀원 관리
  {
    href: ROUTES.studio,
    label: "학술 대시보드",
    role: "STUDY_LEAD",
    // 대시보드는 `/studio` 하나다 — `/studio/programs` 등 하위 경로는 각자의 항목이 켠다
    isActive: (p) => p === ROUTES.studio,
  },
  {
    href: ROUTES.studioPrograms,
    label: "내 활동",
    role: "STUDY_LEAD",
    // 목록(`/studio/programs`)과 상세(`/studio/programs/{id}`) 모두에서 켜진다 (#188)
    isActive: starts(ROUTES.studioPrograms),
  },
  {
    href: ROUTES.studioRecord,
    label: "회차 기록",
    role: "STUDY_LEAD",
    isActive: starts(ROUTES.studioRecord),
  },
  {
    href: ROUTES.studioRoster,
    label: "출석부",
    role: "STUDY_LEAD",
    isActive: starts(ROUTES.studioRoster),
  },
  {
    href: ROUTES.studioMembers,
    label: "팀원 관리",
    role: "STUDY_LEAD",
    isActive: starts(ROUTES.studioMembers),
  },
  // 일반회원: 기획안 제출 · 기획안 제출 현황
  {
    href: ROUTES.proposalNew,
    label: "기획안 제출",
    role: "MEMBER",
    isActive: starts("/proposals"),
  },
  {
    href: ROUTES.myApplications,
    label: "기획안 제출 현황",
    role: "MEMBER",
    isActive: starts("/my"),
  },
];

/**
 * 이 사람에게 보일 목차 — 데스크톱 메뉴와 모바일 드로어가 **함께 부른다** (#224).
 *
 * 스터디장이 아니면 `MEMBER` 항목("기획안 제출"·"기획안 제출 현황")만 남긴다. 맡은 활동이
 * 없는 사람에게 "회차 기록"·"출석부"는 눌러도 빈 상태만 나오는 곳이라, 목차에 남겨 두면
 * 목차 전체를 믿을 수 없게 된다(AGENTS.md — "이동은 감추고, 동작은 잠근다").
 *
 * **스터디장에게는 `MEMBER` 항목도 함께 보인다** — 스터디장도 기획안을 낸다.
 *
 * 필터를 컴포넌트가 각자 쓰지 않고 이 함수 한 벌로 둔 이유는 목차를 한 벌로 둔 이유와 같다:
 * 한쪽에만 걸면 좁은 화면(드로어)에서 그대로 새어 나온다.
 */
export function visibleNavLinks(isLeader: boolean): readonly NavLink[] {
  return isLeader ? NAV_LINKS : NAV_LINKS.filter((link) => link.role === "MEMBER");
}
