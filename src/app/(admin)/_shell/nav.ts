import { ROUTES } from "@/shared/config/routes";

export interface NavItem {
  label: string;
  href: string;
  isActive: (pathname: string) => boolean;
  children?: NavItem[];
}

export interface NavGroup {
  label: string;
  /** 미니 사이드바 타일 글자 */
  mono: string;
  items: NavItem[];
}

const starts = (prefix: string) => (p: string) => p.startsWith(prefix);

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "운영",
    mono: "운",
    items: [
      { label: "운영 대시보드", href: ROUTES.dashboard, isActive: starts("/dashboard") },
      {
        label: "운영 통합",
        href: ROUTES.operations,
        isActive: (p) => p === "/operations",
        children: [
          { label: "업무", href: ROUTES.works, isActive: starts("/operations/works") },
          { label: "하위 업무", href: ROUTES.subWorks, isActive: starts("/operations/sub-works") },
          { label: "회의", href: ROUTES.meetings, isActive: starts("/operations/meetings") },
        ],
      },
      { label: "승인함", href: ROUTES.approvals, isActive: starts("/approvals") },
      { label: "하위 업무 유형 관리", href: ROUTES.opTypes, isActive: starts("/operations/types") },
      { label: "운영 등록", href: ROUTES.operationNew, isActive: starts("/operations/new") },
    ],
  },
  {
    label: "회원",
    mono: "회",
    items: [
      {
        label: "회원 목록",
        href: ROUTES.members,
        isActive: (p) =>
          p.startsWith("/members") &&
          !p.startsWith("/members/roles") &&
          !p.startsWith("/members/role-labels") &&
          !p.startsWith("/members/csv-import"),
      },
      {
        label: "역할 관리",
        href: ROUTES.roles,
        isActive: (p) =>
          p.startsWith("/members/roles") || p.startsWith("/members/role-labels"),
      },
      { label: "CSV 회원 이관", href: ROUTES.csvImport, isActive: starts("/members/csv-import") },
    ],
  },
  {
    label: "폼",
    mono: "폼",
    items: [
      {
        label: "폼 목록",
        href: ROUTES.forms,
        isActive: (p) => p.startsWith("/forms") && !p.startsWith("/forms/labels"),
      },
      { label: "라벨 관리", href: ROUTES.formLabels, isActive: starts("/forms/labels") },
    ],
  },
];

export const NAV_FOOT: NavGroup = {
  label: "계정",
  mono: "계",
  items: [
    { label: "내 계정", href: ROUTES.my, isActive: starts("/my") },
    { label: "로그아웃", href: ROUTES.login, isActive: () => false },
  ],
};

export function groupHasActive(group: NavGroup, pathname: string): boolean {
  return group.items.some(
    (i) => i.isActive(pathname) || i.children?.some((k) => k.isActive(pathname)),
  );
}
