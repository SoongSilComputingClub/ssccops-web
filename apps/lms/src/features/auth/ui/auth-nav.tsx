"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { InstallMenuItem } from "@ssccops/pwa/ui";
import { AccountMenu, UtilityCluster } from "@ssccops/ui";
import { ROUTES } from "@/shared/config/routes";
import { siteLinks } from "@/shared/config/site-links";
import { useAuthSession } from "../model/use-auth-session";
import { SignInButton } from "./sign-in-button";

/*
 * 상단 바 오른쪽 끝 — 로그인 상태 (#169 → #614 · ssccops#452).
 *
 * apps/www의 같은 컴포넌트에서 옮겼다. 판정은 `useAuthSession`(브라우저의 로컬 쿠키 — 왕복 없음)이고
 * 첫 렌더에는 자리만 잡는다(그 훅 주석).
 *
 * ── 로그인한 사람에게는 `[종] [계정 메뉴]` 둘뿐이다 ──────────────
 * 종은 `signedInSlot`으로 받는다 — `features/auth`가 같은 레이어의 `features/notification`을
 * 임포트하지 않기 위해서다(FSD). 조립은 `app/layout.tsx`. 이 가지에만 마운트되므로 어드민의
 * `AuthGate` 안과 같은 자리(로그인했다고 판정된 뒤)다.
 *
 * «내 정보»·«홈페이지 ↗»·테마·«홈 화면에 추가»·«로그아웃»이 상단 바에 따로 서 있던 것을 전부 계정
 * 메뉴 안으로 넣었다 — 항목은 여기서 넘기고 순서·키보드 동작은 `@ssccops/ui` `AccountMenu`가 정한다.
 * 같은 항목을 드로어(`app/_shell/mobile-nav.tsx`)가 `AccountSections`로 인라인 그린다.
 */
export const ACCOUNT_LINKS = [{ label: "내 정보", href: ROUTES.my }] as const;

export function accountApps() {
  return siteLinks().map((site) => ({ label: site.label, href: site.href, external: true }));
}

export function AuthNav({ signedInSlot }: Readonly<{ signedInSlot?: ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const { signedIn, user, signOut, signingOut } = useAuthSession();

  if (signedIn === null) {
    // 판정 전 — 높이만 잡아 두어 로그인 버튼이 나타날 때 헤더가 흔들리지 않게 한다
    return <div className="h-10" aria-hidden />;
  }

  if (!signedIn) {
    return (
      <div>
        <SignInButton variant="ghost" />
      </div>
    );
  }

  return (
    <UtilityCluster bell={signedInSlot}>
      <AccountMenu
        name={user?.name ?? user?.email ?? "회원"}
        label={user?.email ?? undefined}
        links={ACCOUNT_LINKS}
        apps={accountApps()}
        install={<InstallMenuItem />}
        onSignOut={() => void signOut()}
        signingOut={signingOut}
        onNavigate={(href) => router.push(href)}
        pathname={pathname}
        trigger="avatar-name"
      />
    </UtilityCluster>
  );
}
