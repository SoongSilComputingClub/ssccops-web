"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ROUTES } from "@/shared/config/routes";
import { createClient } from "@/shared/lib/supabase/client";
import { flash } from "@/shared/ui";

export function LoginPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("error") === "oauth_failed") {
      flash("Google 로그인에 실패했습니다. 다시 시도해주세요");
    }
  }, [searchParams]);

  const signInWithGoogle = async () => {
    const next = searchParams.get("next") ?? ROUTES.dashboard;
    await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
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
      <button
        type="button"
        onClick={signInWithGoogle}
        className="w-full cursor-pointer rounded-[14px] border border-accent bg-accent px-[18px] py-[15px] text-left transition-colors hover:bg-accent-strong"
      >
        <div className="text-[15px] font-semibold text-white">Google로 계속하기</div>
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
