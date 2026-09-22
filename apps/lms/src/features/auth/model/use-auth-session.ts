"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@ssccops/auth/supabase/client";
import { clearServiceWorkerCache } from "@ssccops/pwa";

/*
 * 상단 바·드로어가 함께 보는 로그인 상태 (#169 → #614).
 *
 * `AuthNav` 안에 있던 것을 훅으로 뗐다 — 모바일 드로어도 계정 절(로그아웃·내 정보)을 그리게 되어
 * (ssccops#452) 같은 판정이 두 자리에 필요하다. 브라우저에서 로컬 쿠키를 읽는 일이라 왕복이 없고,
 * 두 자리가 각자 구독해도 `onAuthStateChange`가 둘 다에 오므로 한쪽에서 로그아웃하면 다른 쪽도 같이
 * 바뀐다.
 *
 * 첫 렌더는 `signedIn: null`이다 — 서버는 로그인 여부를 모르므로 어느 쪽을 그려도 하이드레이션 직후
 * 뒤집힌다. 자리만 잡아 두고 판정이 끝난 뒤 그린다.
 *
 * 이름·이메일은 세션의 구글 계정에서 읽는다(`load-session-user.ts`와 같은 자리) — 계정 메뉴 머리에
 * 보일 값이고 ssccops-server를 부르지 않는다.
 */
export interface AuthSessionUser {
  name: string | null;
  email: string | null;
}

export function useAuthSession() {
  const router = useRouter();
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
     * 구독을 함께 거는 것은 로그인·로그아웃이 다른 탭에서도 일어나기 때문이다 — 한 탭에서
     * 로그아웃했는데 다른 탭 헤더에 계정 메뉴가 남아 있으면 눌러도 아무 일이 없다.
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
    // 서비스워커 캐시(마지막으로 본 목록·상세)를 비운다 — 남의 기기에 내 것이 남지 않게 (#606)
    await clearServiceWorkerCache();
    setSignedIn(false);
    setUser(null);
    setSigningOut(false);
    /*
     * 전 화면이 로그인 필수라, 로그아웃하면 지금 화면이 그대로 로그인 유도로 바뀐다. 서버
     * 렌더만 새로 받아 공용 게이트가 그 자리를 그리게 한다.
     */
    router.refresh();
  };

  return { signedIn, user, signOut, signingOut };
}
