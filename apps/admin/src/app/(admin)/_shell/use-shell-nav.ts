"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { representativeRole, useSessionStore } from "@/entities/session";
import { ROUTES } from "@/shared/config/routes";
import { flash } from "@/shared/ui";
import { NAV_GROUPS, visibleGroups } from "./nav";

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
    if (href === ROUTES.login) {
      void logout().then((ok) => {
        if (!ok) {
          // 쿠키가 남아 있어 실제로는 여전히 로그인 상태다 — 화면만 로그아웃된 척하지 않는다
          flash("로그아웃에 실패했습니다. 잠시 후 다시 시도해주세요");
          return;
        }
        // 서버 컴포넌트·미들웨어가 들고 있던 세션까지 확실히 버리려면 전체 이동이 필요하다
        window.location.replace(ROUTES.login);
      });
      return;
    }
    router.push(href);
  };

  return { pathname, groups, navigate, meName, meLabel };
}
