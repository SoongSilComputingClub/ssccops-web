"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ROUTES } from "@/shared/config/routes";
import { safeNextPath } from "@/shared/lib/next-path";
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

  /*
   * 공개 폼 링크를 열었다가 여기로 튕겨 온 경우인지. 아무 설명 없이 로그인 화면이 뜨면
   * "링크가 깨졌나?"로 읽히므로 어디서 왔는지는 말해 줘야 한다.
   *
   * 폼 제목까지 보여주려면 공개 폼 메타 조회가 하나 더 필요한데, 로그인 화면은 인증
   * 이전이라 그 조회만을 위해 별도 공개 API를 뚫어야 한다. 값에 비해 비싸므로 지금은
   * 폼을 특정하지 않는 일반 안내로 둔다.
   */
  const fromPublicForm = safeNextPath(searchParams.get("next"), ROUTES.dashboard).startsWith(
    "/f/",
  );

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

    const next = safeNextPath(searchParams.get("next"), ROUTES.dashboard);
    const { error: signInError } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    /*
     * 성공하면 브라우저가 Google로 넘어가므로 pending을 되돌리지 않는다 — 되돌리면
     * 리다이렉트 직전에 버튼이 다시 살아나 연타할 수 있다. 실패했을 때만 푼다.
     */
    if (signInError) {
      setError("Google 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해주세요");
      setPending(false);
    }
  };

  return (
    <div className="w-[392px] px-4">
      <div className="flex size-[34px] items-center justify-center rounded-[12px] border border-accent text-[16px] text-accent">
        S
      </div>
      <h1 className="mt-[22px] text-[30px] leading-[1.25] font-medium tracking-[-.5px]">
        SSCC
        <br />
        운영관리시스템
      </h1>
      <p className="mt-3 text-[14.5px] leading-[1.6] text-n400">
        Google 계정으로 로그인합니다. 내부 회원 식별은 로그인 이후 회원 도메인에서
        처리됩니다.
      </p>
      <div className="mt-7 mb-6 h-px bg-gradient-to-r from-transparent via-line to-transparent" />

      {fromPublicForm && (
        <div className="mb-4 rounded-[12px] border border-accent/28 bg-accent/8 px-[14px] py-3">
          <div className="text-[14px] font-semibold text-accent">
            폼에 참여하려면 로그인이 필요합니다
          </div>
          <div className="mt-1 text-[13px] leading-[1.6] text-n400">
            응답자를 회원으로 식별하기 때문입니다. 로그인과 가입을 마치면 열려던 폼으로
            바로 돌아갑니다.
          </div>
        </div>
      )}

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
        <div className="text-[15px] font-semibold text-white">
          {pending ? "Google로 이동 중…" : "Google로 계속하기"}
        </div>
        <div className="mt-[2px] text-[13.5px] text-white/72">
          Google 계정으로 로그인 또는 회원가입
        </div>
      </button>
      <p className="mt-5 text-[13px] leading-[1.6] text-n500">
        처음 가입하면 임시회원 등급으로 바로 시작할 수 있습니다. 졸업생도 동일하게
        가입할 수 있습니다.
      </p>
    </div>
  );
}
