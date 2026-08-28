"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ROUTES } from "@/shared/config/routes";
import { createClient } from "@/shared/lib/supabase/client";
import { SignInButton } from "./sign-in-button";

/*
 * 상단 바의 로그인 상태 — 이 앱에서 두 번째 `"use client"`다.
 *
 * ── 왜 서버에서 그리지 않는가 ──────────────────────────────────────
 * 헤더는 루트 레이아웃에 있어 **모든 화면**에 함께 렌더된다. 여기서 쿠키를 읽어 로그인 여부를
 * 판정하면 익명 공개인 목록·상세에까지 Supabase 왕복이 하나씩 붙는다(그 트래픽이 이 앱의
 * 대부분이다). 브라우저에서 세션을 보는 것은 로컬 쿠키를 읽는 일이라 왕복이 없다.
 *
 * ── 첫 렌더에 아무것도 그리지 않는 이유 ─────────────────────────────
 * 서버는 로그인 여부를 모르므로 어느 쪽을 그려도 하이드레이션 직후 뒤집힌다. '로그인'을 먼저
 * 그리면 이미 로그인한 사람에게 로그인 버튼이 한 번 번쩍이는데, 그건 로그아웃된 줄 알게 만든다.
 * 자리만 잡아 두고(높이 고정) 판정이 끝난 뒤 그린다.
 */
export function AuthNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let alive = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (alive) setSignedIn(data.session !== null);
    });

    /*
     * 구독을 함께 거는 것은 로그인·로그아웃이 **다른 탭에서도** 일어나기 때문이다. 한 탭에서
     * 로그아웃했는데 다른 탭 헤더에 '내 신청'이 남아 있으면 눌러 봐야 로그인 안내만 나온다.
     */
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) setSignedIn(session !== null);
    });

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
    setSigningOut(false);
    /*
     * '내 신청'에 서 있었다면 목록으로 비켜 준다 — 그 화면은 서버 컴포넌트라 토큰이 없어진
     * 지금 새로 그리면 로그인 안내가 될 뿐이다. 다른 화면(목록·상세)은 로그인과 무관하므로
     * 보고 있던 자리를 뺏지 않고, 헤더만 바뀌도록 서버 렌더만 새로 받는다.
     */
    if (pathname === ROUTES.myApplications) {
      router.replace(ROUTES.events);
    }
    router.refresh();
  };

  if (signedIn === null) {
    // 판정 전 — 높이만 잡아 두어 로그인 버튼이 나타날 때 헤더가 흔들리지 않게 한다
    return <div className="h-[30px]" aria-hidden />;
  }

  if (!signedIn) {
    return (
      <div>
        <SignInButton variant="ghost" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-[4px]">
      <Link
        href={ROUTES.myApplications}
        className="rounded-lg px-[10px] py-[6px] text-[14.5px] text-n300 hover:text-ink"
      >
        내 신청
      </Link>
      <button
        type="button"
        onClick={signOut}
        disabled={signingOut}
        className="rounded-lg px-[10px] py-[6px] text-[14.5px] text-n500 hover:text-ink disabled:opacity-50"
      >
        로그아웃
      </button>
    </div>
  );
}
