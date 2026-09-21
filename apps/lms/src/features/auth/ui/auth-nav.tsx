"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { createClient } from "@ssccops/auth/supabase/client";
import { clearServiceWorkerCache } from "@ssccops/pwa";
import { ROUTES } from "@/shared/config/routes";
import { SignInButton } from "./sign-in-button";

/*
 * 상단 바의 로그인 상태 (#169).
 *
 * apps/www의 같은 컴포넌트에서 옮겼다. 헤더는 루트 레이아웃에 있어 모든 화면에 함께 렌더되는데,
 * 여기서 쿠키를 서버에서 읽으면 화면마다 Supabase 왕복이 하나씩 붙는다 — 브라우저에서 로컬
 * 쿠키를 읽으면 왕복이 없다. 이 앱은 전 화면이 로그인 필수라 www만큼 익명 트래픽이 많지는
 * 않지만, 규약을 나눌 이유도 없다.
 *
 * 첫 렌더에 아무것도 그리지 않는 이유도 www와 같다 — 서버는 로그인 여부를 모르므로 어느 쪽을
 * 그려도 하이드레이션 직후 뒤집힌다. 자리만 잡아 두고 판정이 끝난 뒤 그린다.
 *
 * ── 로그인한 사람에게 그리는 것 (#606 · ADR-0045) ──────────────────
 * `signedInSlot`(루트 레이아웃이 넘기는 종 `NotificationBell` + 배지 값을 듣는 `UnreadCountSync`),
 * «내 정보»(`/my` — lg 이상만, 좁은 화면은 드로어 발치), 로그아웃. www가 «내 활동» 링크를 헤더에
 * 거는 것과 같은 자리다 — 화면 이동은 여전히 `nav-links.ts` 목차가 맡고, 여기 있는 것은 **역할과
 * 무관하고 로그인해야 뜻이 있는** 것들이다. 종을 slot으로 받는 것은 `features/auth`가 같은 레이어의
 * `features/notification`을 임포트하지 않기 위해서다(FSD) — 조립은 `app/layout.tsx`가 한다. 이 가지에만
 * 마운트되므로 어드민의 `AuthGate` 안과 같은 자리(로그인했다고 판정된 뒤)다.
 */
export function AuthNav({ signedInSlot }: Readonly<{ signedInSlot?: ReactNode }>) {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let alive = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (alive) setSignedIn(data.session !== null);
    });

    /*
     * 구독을 함께 거는 것은 로그인·로그아웃이 다른 탭에서도 일어나기 때문이다 — 한 탭에서
     * 로그아웃했는데 다른 탭 헤더에 로그아웃 버튼이 남아 있으면 눌러도 아무 일이 없다.
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
    // 서비스워커 캐시(마지막으로 본 목록·상세)를 비운다 — 남의 기기에 내 것이 남지 않게 (#606)
    await clearServiceWorkerCache();
    setSignedIn(false);
    setSigningOut(false);
    /*
     * 전 화면이 로그인 필수라, 로그아웃하면 지금 화면이 그대로 로그인 유도로 바뀐다. 서버
     * 렌더만 새로 받아 공용 게이트가 그 자리를 그리게 한다.
     */
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
      {signedInSlot}
      <Link
        href={ROUTES.my}
        className="hidden rounded-lg px-[10px] py-[6px] text-[14.5px] text-n300 hover:text-ink lg:block"
      >
        내 정보
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
