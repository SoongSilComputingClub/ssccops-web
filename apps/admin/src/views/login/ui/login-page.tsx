"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ROUTES } from "@/shared/config/routes";
import { safeNextPath, rememberOAuthNext } from "@ssccops/auth";
import { createClient } from "@/shared/lib/supabase/client";

/*
 * /auth/callback 이 붙여 주는 실패 원인 → 사용자 문구.
 *
 * access_denied 처럼 Supabase(=OAuth 제공자)가 그대로 넘겨주는 코드도 있고,
 * missing_code · exchange_failed 처럼 콜백 라우트가 붙이는 코드도 있다.
 * 표에 없는 코드는 error_description 을 함께 보여주므로 원인을 잃지 않는다.
 */
const ERROR_MESSAGE: Record<string, string> = {
  access_denied: "Google 로그인이 취소되었습니다",
  missing_code: "인증 정보를 받지 못했습니다. 다시 시도해주세요",
  exchange_failed: "로그인 처리 중 문제가 발생했습니다. 다시 시도해주세요",
  oauth_failed: "Google 로그인에 실패했습니다. 다시 시도해주세요",
  server_error: "인증 서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요",
};

export function LoginPage() {
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorCode = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const message =
    error ??
    (errorCode ? (ERROR_MESSAGE[errorCode] ?? "로그인에 실패했습니다") : null);
  // 표에 있는 문구로 이미 설명된 경우가 아니면 제공자가 준 원문도 함께 보여준다
  const detail = error ? null : errorCode && !ERROR_MESSAGE[errorCode] ? errorDescription : null;

  const signInWithGoogle = async () => {
    setPending(true);
    setError(null);

    // 사용자가 리다이렉트되지 않거나 취소한 경우 버튼이 무한 잠금되는 현상 방지
    const timer = setTimeout(() => setPending(false), 8000);

    /*
     * 목적지는 redirectTo 쿼리가 아니라 쿠키로 넘긴다 — Supabase 화이트리스트는 쿼리까지
     * 포함해 매칭하므로, 쿼리를 달면 등록해 둔 항목과 어긋나 Site URL로 폴백된다.
     * 자세한 사정은 shared/lib/oauth-next.ts (ssccops#84).
     */
    const next = safeNextPath(searchParams.get("next"), ROUTES.dashboard);
    rememberOAuthNext(next);

    const { error: signInError } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signInError) {
      clearTimeout(timer);
      setError("Google 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해주세요");
      setPending(false);
    }
  };

  return (
    <div className="w-full max-w-[392px] px-4">
      <div className="flex size-[34px] items-center justify-center rounded-[12px] border border-accent text-[16px] text-accent">
        S
      </div>
      <h1 className="mt-[22px] text-[30px] leading-[1.25] font-medium tracking-[-.5px]">
        SSCC
        <br />
        운영관리시스템
      </h1>
      {/*
       * 여기서 말해야 하는 것은 "로그인과 회원 확인이 따로"라는 사실 하나다. 예전 문구는
       * 그 사실을 개발 용어("내부 회원 식별"·"회원 도메인")로 적어, 처음 들어온 사람에게는
       * 읽어도 무엇이 어떻게 된다는 것인지 남지 않았다 (#117).
       */}
      <p className="mt-3 text-[14.5px] leading-[1.6] text-n400">
        Google 계정으로 로그인합니다. SSCC 회원인지는 로그인한 뒤에 확인합니다.
      </p>
      <div className="mt-7 mb-6 h-px bg-gradient-to-r from-transparent via-line to-transparent" />

      {message && (
        <div className="mb-4 rounded-[12px] border border-danger/28 bg-danger/8 px-[14px] py-3">
          <div className="text-[14px] text-danger">{message}</div>
          {detail && (
            <div className="mt-1 text-[12.5px] leading-[1.55] break-all text-n500">
              {detail}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={pending}
        className="w-full cursor-pointer rounded-[14px] border border-accent bg-accent px-[18px] py-[15px] text-left transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-accent"
      >
        <div className="text-[15px] font-semibold text-on-solid">
          {pending ? "Google로 이동 중…" : "Google로 계속하기"}
        </div>
        <div className="mt-[2px] text-[13.5px] text-on-solid/72">
          Google 계정으로 로그인 또는 회원 가입
        </div>
      </button>
      <p className="mt-5 text-[13px] leading-[1.6] text-n500">
        처음 가입하면 임시회원 등급으로 바로 시작할 수 있습니다. 졸업생도 같은 방법으로
        가입하면 됩니다.
      </p>
    </div>
  );
}
