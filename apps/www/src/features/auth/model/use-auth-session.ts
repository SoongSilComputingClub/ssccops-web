"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@ssccops/auth/supabase/client";
import { ROUTES } from "@/shared/config/routes";

/*
 * 상단 바·드로어가 함께 보는 로그인 상태 (#167 → #614 · ssccops#452).
 *
 * `AuthNav` 안에 있던 것을 훅으로 뗐다 — 모바일 드로어도 계정 절(내 활동·로그아웃)을 그리게 되어
 * 같은 판정이 두 자리에 필요하다. **여전히 브라우저에서만 본다** — 헤더는 루트 레이아웃에 있어 모든
 * 화면에 함께 렌더되는데, 서버에서 쿠키를 읽으면 익명 공개인 목록·상세에까지 Supabase 왕복이 붙고
 * (그 트래픽이 이 앱의 대부분이다) 홈은 세션을 보지 않는다는 규칙(ssccops#385)이 깨진다. 로컬 쿠키를
 * 읽는 일이라 왕복이 없고, 두 자리가 각자 구독해도 `onAuthStateChange`가 둘 다에 온다.
 *
 * 첫 렌더는 `signedIn: null`이다 — 서버는 로그인 여부를 모르므로 어느 쪽을 그려도 하이드레이션 직후
 * 뒤집힌다. '로그인'을 먼저 그리면 이미 로그인한 사람에게 로그인 버튼이 한 번 번쩍이는데, 그건
 * 로그아웃된 줄 알게 만든다. 자리만 잡아 두고 판정이 끝난 뒤 그린다.
 *
 * 이름·이메일은 세션의 구글 계정에서 읽는다 — 계정 메뉴 머리에 보일 값이고 ssccops-server를 부르지
 * 않는다(회원 정보는 `/me`의 일).
 */
export interface AuthSessionUser {
  name: string | null;
  email: string | null;
}

export function useAuthSession() {
  const router = useRouter();
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [user, setUser] = useState<AuthSessionUser | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let alive = true;

    const apply = (session: { user: { email?: string; user_metadata: unknown } } | null) => {
      if (!alive) return;
      setSignedIn(session !== null);
      if (!session) {
        setUser(null);
        return;
      }
      const meta = session.user.user_metadata as { full_name?: string; name?: string } | undefined;
      setUser({
        name: meta?.full_name ?? meta?.name ?? null,
        email: session.user.email ?? null,
      });
    };

    void supabase.auth.getSession().then(({ data }) => apply(data.session));

    /*
     * 구독을 함께 거는 것은 로그인·로그아웃이 **다른 탭에서도** 일어나기 때문이다. 한 탭에서
     * 로그아웃했는데 다른 탭 헤더에 계정 메뉴가 남아 있으면 눌러 봐야 로그인 안내만 나온다.
     */
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) =>
      apply(session),
    );

    return () => {
      alive = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setSigningOut(true);
    const { error } = await createClient().auth.signOut();
    if (error) {
      // 쿠키가 남았는데 화면만 로그아웃된 상태로 두지 않는다 — 상태를 건드리지 않고 되돌린다
      setSigningOut(false);
      return;
    }
    setSignedIn(false);
    setUser(null);
    setSigningOut(false);
    /*
     * '내 활동'(`/me`와 그 내부 페이지 `/me/*` · #574)에 서 있었다면 홈으로 비켜 준다 — 그 화면은
     * 서버 컴포넌트라 토큰이 없어진 지금 새로 그리면 로그인 안내가 될 뿐이다. 다른 화면(목록·상세)은
     * 로그인과 무관하므로 보고 있던 자리를 뺏지 않고, 헤더만 바뀌도록 서버 렌더만 새로 받는다.
     */
    if (pathname === ROUTES.me || pathname.startsWith(`${ROUTES.me}/`)) {
      router.replace(ROUTES.home);
    }
    router.refresh();
  };

  return { signedIn, user, signOut, signingOut };
}
