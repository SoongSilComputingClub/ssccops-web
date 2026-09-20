import { ROUTES } from "@/shared/config/routes";

/**
 * 상단 바 목차 — 데스크톱 메뉴·모바일 드로어·하위 탭줄이 **이 한 벌**을 함께 쓴다 (#169).
 *
 * 목차를 컴포넌트 밖에 둔 이유는 apps/www(#167)·어드민(`use-shell-nav.ts`)과 같다 — 한쪽에만
 * 메뉴를 더하면 다른 쪽에서 빠진다. 항목이 붙을 때 여기 한 줄을 늘리면 된다.
 *
 * ── 두 단계다 ────────────────────────────────────────────────
 * 상단 바에 여덟 항목이 한 줄로 서면서 좁은 데스크톱에서 라벨이 두 줄로 접혔다("기획안 제출
 * 현황"이 «기획안 제 / 출 현황»으로 끊겼다). 묶음(`NavGroup`)을 상단 바에, 그 안의 항목
 * (`NavLink`)을 화면 위 탭줄에 그린다 — 한 줄에 서는 것이 셋으로 줄고, 지금 어느 묶음에 있는지가
 * 상단 바에 남는다.
 *
 * **묶음을 누르면 첫 항목으로 간다**(`hrefOf`). 드롭다운을 열지 않는 것은 시안에 그런 것이
 * 없고, 누를 때마다 한 번 더 고르게 하면 클릭이 늘기 때문이다 — 묶음에 들어가면 탭줄이 나머지
 * 형제를 이미 보여 준다.
 *
 * ── 역할별 목차 ──────────────────────────────────────────────
 * 스터디장은 자기 스터디를 운영하는 화면을, 일반 회원은 기획안을 내고 상태를 보는 화면을 본다.
 *
 * **역할별 필터링은 `visibleNavGroups`가 한다** (#224). 판정 근거는
 * `GET /v1/academic-programs?mine=leader`가 활동을 한 건이라도 주는가이고
 * (`fetchIsAcademicLeader`), 그 조회는 루트 레이아웃이 서버에서 한 번 해 컴포넌트들에 같은
 * 값으로 내려보낸다. 로그인 여부로 갈리는 항목(로그아웃 등)은 목차에 없고 `AuthNav`가
 * 클라이언트에서 판정해 그린다.
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

/**
 * 상단 바 한 칸 — 그 아래 탭줄이 `links`다.
 *
 * `links`가 한 개뿐인 묶음(학술 대시보드)은 탭줄을 그리지 않는다 — 탭이 하나인 탭줄은 자리만
 * 차지하고 고를 것이 없다.
 */
export type NavGroup = {
  label: string;
  links: readonly NavLink[];
};

const starts = (prefix: string) => (p: string) => p === prefix || p.startsWith(`${prefix}/`);

/**
 * 지원서 문항 편집 화면인가 — `/studio/programs/{숫자}/form` (#528).
 *
 * 두 항목이 이 판정을 **함께 쓴다**: «내 활동»은 빼고 «모집 관리»는 켠다. 한쪽만 고치면
 * 그 화면에서 아무것도 켜지지 않거나 둘이 함께 켜진다 — 그래서 문자열을 각자 적지 않는다.
 *
 * `endsWith("/form")` 하나로 두지 않은 것은 뒤에 `/form`으로 끝나는 다른 주소가 생기면
 * 그것까지 «모집 관리»로 켜지기 때문이다.
 */
const isProgramFormPath = (p: string) => /^\/studio\/programs\/\d+\/form$/.test(p);

/*
 * 묶음 셋 — 학술 대시보드 · 내 활동 · 모집·기획.
 *
 * 순서는 스터디장이 하루를 보내는 차례다: 전체를 보고(대시보드) → 맡은 활동을 굴리고(내 활동)
 * → 다음 기수를 준비한다(모집·기획). 일반 회원에게는 마지막 하나만 남는다.
 */
export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: "학술 대시보드",
    links: [
      {
        href: ROUTES.studio,
        label: "학술 대시보드",
        role: "STUDY_LEAD",
        // 대시보드는 `/studio` 하나다 — `/studio/programs` 등 하위 경로는 각자의 항목이 켠다
        isActive: (p) => p === ROUTES.studio,
      },
    ],
  },
  {
    label: "내 활동",
    links: [
      {
        href: ROUTES.studioPrograms,
        label: "내 활동",
        role: "STUDY_LEAD",
        /*
         * 목록(`/studio/programs`)과 상세(`/studio/programs/{id}`)에서 켜진다 (#188).
         *
         * **지원서 문항 편집(`/studio/programs/{id}/form`)은 뺀다** (#528). 주소는 활동 상세의
         * 하위 경로지만 그 화면으로 들어오는 길은 «모집 관리»이고, 빼지 않으면 두 항목이 동시에
         * 켜진다 — 어드민이 «활동 목록»의 `isActive`에서 `/recruitment`를 뺀 것과 같은
         * 판단이다.
         */
        isActive: (p) => starts(ROUTES.studioPrograms)(p) && !isProgramFormPath(p),
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
    ],
  },
  {
    /*
     * 모집과 기획안을 한 묶음에 둔다 — 스터디장에게는 «다음 기수를 여는 일»이 하나로 이어지고
     * (기획안을 내 승인받으면 그 활동의 모집이 열린다), 일반 회원에게는 이 묶음이 상단 바의
     * 전부다. 일반 회원에게 «모집 관리»는 `role`로 걸러져 탭줄에서 빠진다.
     */
    label: "모집·기획",
    links: [
      {
        href: ROUTES.studioRecruitment,
        label: "모집 관리",
        role: "STUDY_LEAD",
        /*
         * 목록(`/studio/recruitment`)과 **지원서 문항 편집**(`/studio/programs/{id}/form`)에서
         * 켜진다 (#528). 편집 화면의 주소는 활동 상세의 하위 경로지만 그리로 들어오는 길은
         * 이 항목이라, 여기서 켜 주지 않으면 그 화면에서 **아무 항목도 켜지지 않는다**
         * («내 활동»은 같은 이유로 `/form`을 뺐다).
         */
        isActive: (p) => starts(ROUTES.studioRecruitment)(p) || isProgramFormPath(p),
      },
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
    ],
  },
];

/**
 * 이 사람에게 보일 묶음 — 데스크톱 메뉴·드로어·탭줄이 **함께 부른다** (#224).
 *
 * 스터디장이 아니면 `MEMBER` 항목만 남기고, 그 결과 항목이 하나도 없는 묶음은 통째로 뺀다 —
 * 맡은 활동이 없는 사람에게 "회차 기록"·"출석부"는 눌러도 빈 상태만 나오는 곳이라, 목차에
 * 남겨 두면 목차 전체를 믿을 수 없게 된다(AGENTS.md — "이동은 감추고, 동작은 잠근다").
 * 일반 회원에게 남는 것은 «모집·기획» 하나이고 그 안의 탭도 기획안 둘뿐이다.
 *
 * **스터디장에게는 `MEMBER` 항목도 함께 보인다** — 스터디장도 기획안을 낸다.
 *
 * 필터를 컴포넌트가 각자 쓰지 않고 이 함수 한 벌로 둔 이유는 목차를 한 벌로 둔 이유와 같다:
 * 한쪽에만 걸면 좁은 화면(드로어)에서 그대로 새어 나온다.
 */
export function visibleNavGroups(isLeader: boolean): readonly NavGroup[] {
  if (isLeader) return NAV_GROUPS;

  return NAV_GROUPS.map((group) => ({
    ...group,
    links: group.links.filter((link) => link.role === "MEMBER"),
  })).filter((group) => group.links.length > 0);
}

/**
 * 묶음을 눌렀을 때 갈 곳 — **첫 항목**이다.
 *
 * 역할 필터를 지난 목차를 넘겨받으므로, 일반 회원의 «모집·기획»은 «모집 관리»(스터디장 전용)가
 * 아니라 «기획안 제출»로 간다. 묶음이 비는 경우는 `visibleNavGroups`가 이미 걸렀다.
 */
export function hrefOf(group: NavGroup): string {
  return group.links[0].href;
}

/**
 * 지금 보고 있는 묶음 — 그 안의 항목 중 하나라도 켜졌으면 그 묶음이다.
 *
 * 상단 바(어느 묶음인지)와 탭줄(그 묶음의 어느 항목인지)이 같은 판정을 쓴다. 못 찾으면
 * `undefined`이고, 그때 탭줄은 그리지 않는다 — 목차에 없는 화면(로그인 오류 등)이 그렇다.
 */
export function activeGroup(
  groups: readonly NavGroup[],
  pathname: string,
): NavGroup | undefined {
  return groups.find((group) => group.links.some((link) => link.isActive(pathname)));
}
