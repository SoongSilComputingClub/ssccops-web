"use client";

import { useState } from "react";
import { ROUTES } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";
import { currentPath, safeNextPath } from "@/shared/lib/next-path";
import { rememberOAuthNext } from "@/shared/lib/oauth-next";
import { createClient } from "@/shared/lib/supabase/client";

/*
 * 이 앱의 **로그인 진입은 화면이 아니라 버튼**이다.
 *
 * 어드민에는 /login 화면이 있고 미인증 요청이 그리로 밀려나지만, 여기서는 목록·상세가
 * 비로그인 공개라 밀어낼 것이 없다. 화면을 하나 더 두면 "로그인하려고 열었는데 버튼 하나만
 * 있는 페이지"가 생기고, 미인증 리다이렉트의 종착지가 되어 되돌아올 곳을 다시 관리해야 한다.
 * 그래서 로그인은 지금 보고 있는 화면 위에서 시작하고, 돌아올 곳도 그 화면이다.
 */

/** 목적지가 주어지지 않으면 지금 보고 있는 화면으로 돌아온다 */
function resolveNext(next?: string): string {
  return safeNextPath(next ?? currentPath(), ROUTES.events);
}

export function SignInButton({
  next,
  label = "로그인",
  variant = "primary",
  className,
}: {
  /** 로그인 후 돌아갈 경로. 생략하면 지금 화면 */
  next?: string;
  label?: string;
  variant?: "primary" | "ghost";
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const signIn = async () => {
    setPending(true);
    setFailed(false);

    const target = resolveNext(next);
    // redirectTo에 쿼리를 붙이지 않는다 — 목적지는 쿠키로 나른다 (shared/lib/oauth-next.ts)
    rememberOAuthNext(target);

    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${ROUTES.authCallback}` },
    });

    /*
     * 성공하면 브라우저가 구글로 떠나므로 여기로 돌아오지 않는다. 돌아왔다는 것은 시작조차
     * 못했다는 뜻이라(설정 누락·네트워크) 버튼을 다시 눌릴 수 있게 되돌린다 — 안 그러면
     * "로그인 중…"에서 멈춘 채로 남는다.
     */
    if (error) {
      setPending(false);
      setFailed(true);
    }
  };

  return (
    <div className="flex flex-col items-center gap-[6px]">
      <button
        type="button"
        onClick={signIn}
        disabled={pending}
        className={cn(
          "rounded-xl text-[15px] font-semibold transition-colors disabled:opacity-50",
          variant === "primary"
            ? "bg-accent px-[16px] py-[12px] text-white hover:bg-accent-strong"
            : "px-[10px] py-[6px] text-[14.5px] text-n300 hover:text-ink",
          className,
        )}
      >
        {pending ? "로그인 중…" : label}
      </button>
      {failed && (
        <p className="text-[12.5px] text-amber">
          로그인을 시작하지 못했습니다 — 잠시 후 다시 시도해 주세요
        </p>
      )}
    </div>
  );
}
