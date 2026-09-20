import type { ReactNode } from "react";
import { SignInButton } from "@/features/auth";
import { loginErrorMessage } from "@/entities/session";
import { currentAccessToken } from "@/shared/api/authed-client";
import { Notice, SectionTabs } from "@/shared/ui";
import { SignedOutNotice } from "./gate-notices";

/*
 * 내 활동 다섯 페이지의 틀 (#574 · ssccops#428) — 제목 · 탭 줄 · 로그인 문.
 *
 * ── 왜 한 장이 다섯 장이 됐는가 ──────────────────────────────
 * 첫 판(#518)은 `/me` 한 화면에 세 블록(신청한 행사 · 낸 폼 · 이끄는 활동)을 쌓았다. 건수가
 * 늘면 스크롤 한 장이 되고, 기획안은 «낸 폼» 안에 칩 하나로 묻혀 있었다(ssccops#428). lms
 * `/my/applications`처럼 **종류마다 한 장**으로 나누고, `/me`는 묶음마다 건수와 최근 몇 건만
 * 보이는 허브가 됐다. 나누는 길은 제목 아래 탭 줄(`SectionTabs` · #524와 같은 모양)이다.
 *
 * ── 왜 SSR인가 ────────────────────────────────────────────────
 * 이 앱은 전 화면이 서버 컴포넌트다(#141). 그 규약을 따르면서 사용자 토큰이 필요한 화면을
 * 만드는 방법이 SSR이다 — Supabase 세션 쿠키는 서버에서 읽을 수 있고(@supabase/ssr), 그러면
 * **토큰이 브라우저 코드에 실리지 않고** 로딩 상태를 쥐는 훅도 필요 없다. access token 갱신은
 * 미들웨어가 `/me/:path*`에서 맡는다(src/middleware.ts).
 *
 * ── 리다이렉트를 하지 않는다 ────────────────────────────────────
 * 미로그인·미가입 모두 **이 화면 안에서** 안내하고, 가입도 이 자리에서 한다(#451 —
 * `InlineSignup`). 억지로 어딘가로 보내면 되돌아올 곳이 없어 왕복만 도는 길이 생기고, 어드민
 * 도메인으로 보내던 링크는 부원에게 운영 도메인을 드러냈다. 로그인 뒤 돌아오는 곳(`next`)은
 * **지금 보고 있는 페이지 자기 주소**다 — 내부 페이지에서 로그인했는데 허브로 떨어지지 않게.
 * 옛 주소 `/my-applications`의 이동은 화면이 아니라 `next.config.ts`의 정적 redirect가 한다.
 *
 * 로그인 실패 사유(`?login_error=`)는 콜백이 언제나 `/me`로 보내므로 허브만 받는다.
 */
export async function MeFrame({
  pathname,
  description,
  loginError = null,
  children,
}: Readonly<{
  /** 이 페이지의 주소 — 켜질 탭과 로그인 뒤 돌아올 곳 */
  pathname: string;
  description: string;
  /** 로그인 실패 사유 코드 — 허브(`/me`)만 받는다 */
  loginError?: string | null;
  /** 로그인한 사람에게 그리는 본문 — 토큰이 없으면 그리지 않는다 */
  children: ReactNode;
}>) {
  const token = await currentAccessToken();

  return (
    <div className="flex flex-col gap-[16px]">
      <header className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-medium tracking-[-.3px] lg:text-[24px]">내 활동</h1>
        <p className="text-[13.5px] text-n500">{description}</p>
      </header>

      <SectionTabs axis="me" pathname={pathname} />

      {loginError && (
        <Notice title={loginErrorMessage(loginError)}>
          <SignInButton next={pathname} label="다시 로그인" />
        </Notice>
      )}

      {token ? children : !loginError && <SignedOutNotice next={pathname} />}
    </div>
  );
}
