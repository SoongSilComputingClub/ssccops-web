"use client";

import { useEffect, useState } from "react";
import { SignupRequiredNotice } from "@/features/signup";
import { createClient } from "@ssccops/auth/supabase/client";
import { Notice } from "@/shared/ui";
import { SignInButton } from "./sign-in-button";

/*
 * 로그인 게이트 (#169 · 결정 사항).
 *
 * ── 왜 이런 모양인가 ──────────────────────────────────────────
 * 이 앱은 전 화면이 로그인 필수다(#169). 비로그인 사용자에게 무엇을 보여줄지는 이슈가
 * "결정해서 남길 것"으로 지시한 항목이고, **화면 안 로그인 유도**로 정했다 — 로그인 전용
 * 랜딩 페이지를 따로 두면 apps/www 규약(리다이렉트 없음)과 어긋나고, 미인증 리다이렉트의
 * 종착지가 되어 되돌아올 곳을 다시 관리해야 한다. 그래서 각 화면이 자기 자리에서 이 게이트를
 * 그리고, 로그인이 끝나면 `router.refresh()`로 원래 내용이 채워진다.
 *
 * ── 미가입(SIGNUP_REQUIRED) 처리 ─────────────────────────────
 * 간편 가입 폼은 www에서 가져와 이 앱 안에서 연다(#453 · `features/signup`). 처음엔 «학술 앱에는
 * 신청 흐름이 없어 임베드할 자리가 없다»며 어드민 `/signup`으로 보냈는데, 그건 부원에게 운영
 * 도메인을 드러내는 길이었고 폼 자체는 흐름과 무관했다. 이 게이트는 **로그인 여부만** 본다.
 * 로그인은 됐지만 미가입인 사람은 서버 조회가 403 `SIGNUP_REQUIRED`로 오므로, 그 판정과 안내는
 * 각 화면이 `SignupRequiredNotice`로 맡는다 — 여기서는 로그인한 사람에게 같은 안내를 둔다.
 *
 * 지금은 화면이 없어(#169) 라우트 플레이스홀더가 이 게이트를 그대로 쓴다. 화면 이슈가
 * 세션·역할 판정을 붙이면 로그인한 사용자에게 실제 내용을 그리게 된다.
 */
export function LoginGate({
  title = "로그인이 필요합니다",
  description = "학술 활동 화면은 로그인한 회원만 볼 수 있습니다 — 구글 계정으로 로그인해주세요",
}: Readonly<{
  title?: string;
  description?: string;
}>) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let alive = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (alive) setSignedIn(data.session !== null);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) setSignedIn(session !== null);
    });

    return () => {
      alive = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  // 판정 전 — 자리만 잡아 둔다(www AuthNav와 같은 이유로 첫 렌더에 어느 쪽도 그리지 않는다)
  if (signedIn === null) {
    return <div className="h-[200px]" aria-hidden />;
  }

  if (!signedIn) {
    return (
      <Notice title={title} description={description}>
        <SignInButton />
      </Notice>
    );
  }

  return (
    <SignupRequiredNotice
      title="아직 준비 중인 화면입니다"
      description="학술 활동 화면은 후속 작업으로 추가됩니다. 회원이 아니라면 여기서 먼저 가입할 수 있습니다."
    />
  );
}
