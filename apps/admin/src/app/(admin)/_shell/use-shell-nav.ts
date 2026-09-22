"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearServiceWorkerCache } from "@ssccops/pwa";
import type { AccountMenuLink } from "@ssccops/ui";
import { representativeRole, useSessionStore } from "@/entities/session";
import { ROUTES } from "@/shared/config/routes";
import { siteLinks } from "@/shared/config/site-links";
import { flash } from "@/shared/ui";
import { NAV_GROUPS, visibleGroups } from "./nav";

/**
 * 계정 메뉴 절 ② — 이 앱의 «내 정보» (#614 · ssccops#452). 옛 `NAV_FOOT`의 «내 계정»이다.
 * «내 활동»은 www의 화면이라 여기 없다.
 */
export const ACCOUNT_LINKS: readonly AccountMenuLink[] = [{ label: "내 정보", href: ROUTES.my }];

/**
 * 데스크톱 사이드바와 모바일 드로어가 함께 쓰는 셸 상태 (#85).
 *
 * 둘로 나눠 두면 로그아웃 처리나 권한 필터가 한쪽에만 반영되는 일이 생긴다 —
 * 메뉴 목차와 판정은 화면 폭과 무관하므로 여기 한 곳에서만 만든다.
 */
export function useShellNav() {
  const pathname = usePathname();
  const router = useRouter();

  // 프로필은 서버 세션이 정본이다 — 목 회원 스토어를 거치지 않는다
  const member = useSessionStore((s) => s.member);
  const authUser = useSessionStore((s) => s.authUser);
  const logout = useSessionStore((s) => s.logout);

  const meName = member?.name ?? authUser?.name ?? "-";

  /*
   * 권한 없는 메뉴는 감춘다 (#29 · 근거는 nav.ts의 visibleGroups 주석).
   * 세션이 아직 없으면(member === null) 아무 권한도 없는 것으로 본다 — 잠깐 보였다 사라지는
   * 편보다 처음부터 안 보이는 편이 낫다. 세션이 도착하면 다시 계산된다.
   */
  const groups = useMemo(() => visibleGroups(NAV_GROUPS, member), [member]);

  /** 프로필 부제 — 대표 역할이 있으면 역할명, 없으면 등급명 · 등급명 */
  const meLabel = (() => {
    if (!member) return "";
    const role = representativeRole(member);
    return `${role?.roleName ?? member.membershipGradeName} · ${member.membershipGradeName}`;
  })();

  const navigate = (href: string) => {
    router.push(href);
  };

  /*
   * 로그아웃 — 계정 메뉴 절 ⑥ (#614). 옛 «로그아웃» 메뉴 행이 `navigate(ROUTES.login)`으로
   * 하던 것을 따로 뗐다 — 이동이 아니라 동작이라 목차 항목의 모양이 맞지 않았다.
   */
  const signOut = () => {
    void logout().then((ok) => {
      if (!ok) {
        // 쿠키가 남아 있어 실제로는 여전히 로그인 상태다 — 화면만 로그아웃된 척하지 않는다
        flash("로그아웃에 실패했습니다. 잠시 후 다시 시도해주세요");
        return;
      }
      // 서비스워커 캐시(마지막으로 본 목록·상세)를 비운 뒤 이동한다 — 남의 기기에 내 것이 남지 않게 (#604)
      void clearServiceWorkerCache().finally(() => {
        // 서버 컴포넌트·미들웨어가 들고 있던 세션까지 확실히 버리려면 전체 이동이 필요하다
        window.location.replace(ROUTES.login);
      });
    });
  };

  /** 계정 메뉴 절 ④ — 다른 앱(홍보 사이트·학술 LMS). 오리진이 비면 항목이 없다 (`site-links.ts`) */
  const apps = useMemo<AccountMenuLink[]>(
    () => siteLinks().map((site) => ({ label: site.label, href: site.href, external: true })),
    [],
  );

  return { pathname, groups, navigate, signOut, meName, meLabel, apps };
}
