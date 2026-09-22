"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { InstallMenuItem } from "@ssccops/pwa/ui";
import { AccountMenu, UtilityCluster, type AccountMenuLink } from "@ssccops/ui";
import { lmsOrigin } from "@/shared/config/lms-routes";
import { ROUTES } from "@/shared/config/routes";
import { useAuthSession } from "../model/use-auth-session";
import { SignInButton } from "./sign-in-button";

/*
 * 상단 바 오른쪽 끝 — 로그인 상태 (#167 → #614 · ssccops#452).
 *
 * 판정은 `useAuthSession`(브라우저의 로컬 쿠키 — 왕복 없음, 홈은 세션을 보지 않는다 · ssccops#385)이고
 * 첫 렌더에는 자리만 잡는다(그 훅 주석).
 *
 * ── 로그인한 사람에게는 `[종] [계정 메뉴]` 둘뿐이다 ──────────────
 * 종은 `signedInSlot`으로 받는다(#616 · ssccops#453) — `features/auth`가 같은 레이어의
 * `features/notification`을 임포트하지 않기 위해서다(FSD · lms와 같은 자리). 조립은 `app/layout.tsx`.
 * 이 가지에만 마운트되므로 «로그인했다고 판정된 뒤»이고, 로그아웃 상태에는 종이 없다(알림은 회원 것).
 * 계정 메뉴는 «내 활동»(`/me` · #518 — 홈에 «내 것» 블록을 얹지 않으므로 진입은 이 한 자리) · 테마 ·
 * «학술 LMS ↗» · «홈 화면에 추가» · 로그아웃이다. 로그아웃 상태는 «로그인» 하나뿐이고 테마는 푸터에 있다.
 *
 * 같은 항목을 드로어(`app/_shell/mobile-nav.tsx`)가 `AccountSections`로 인라인 그린다.
 */
export const ACCOUNT_LINKS: readonly AccountMenuLink[] = [{ label: "내 활동", href: ROUTES.me }];

/** ④ 다른 앱 — LMS 하나. `NEXT_PUBLIC_LMS_ORIGIN`이 비면 항목이 없다(죽은 주소 금지 · `lms-routes.ts`) */
export function accountApps(): AccountMenuLink[] {
  const lms = lmsOrigin();
  return lms ? [{ label: "학술 LMS", href: lms, external: true }] : [];
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
