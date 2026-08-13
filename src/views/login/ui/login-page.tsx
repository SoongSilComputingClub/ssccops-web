"use client";

import { useRouter } from "next/navigation";
import { useSessionStore } from "@/entities/session";
import { ROUTES } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";

const PROVIDERS = [
  {
    p: "GOOGLE",
    hint: "연결된 회원 · 김도현 (회장)",
    memberKey: "m1",
    filled: true,
  },
  {
    p: "GITHUB",
    hint: "연결된 회원 · 이서연 (국장)",
    memberKey: "m2",
    filled: false,
  },
  {
    p: "NAVER",
    hint: "연결된 회원 없음 · 회원 가입으로 이동",
    memberKey: null,
    filled: false,
  },
] as const;

export function LoginPage() {
  const router = useRouter();
  const login = useSessionStore((s) => s.login);

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
        소셜 계정으로 로그인합니다. 내부 회원 식별은 로그인 이후 회원 도메인에서
        처리됩니다.
      </p>
      <div className="mt-7 mb-6 h-px bg-gradient-to-r from-transparent via-line to-transparent" />
      <div className="flex flex-col gap-[10px]">
        {PROVIDERS.map((item) => (
          <button
            key={item.p}
            type="button"
            onClick={() => {
              if (item.memberKey) {
                login(item.memberKey);
                router.push(ROUTES.members);
              } else {
                router.push(ROUTES.signup);
              }
            }}
            className={cn(
              "cursor-pointer rounded-[14px] border px-[18px] py-[15px] text-left transition-colors",
              item.filled
                ? "border-accent bg-accent text-white hover:bg-accent-strong"
                : "border-line bg-surface hover:border-accent",
            )}
          >
            <div className="text-[15px] font-semibold">{item.p}로 계속하기</div>
            <div
              className={cn(
                "mt-[2px] text-[13.5px]",
                item.filled ? "text-white/72" : "text-n500",
              )}
            >
              {item.hint}
            </div>
          </button>
        ))}
      </div>
      <p className="mt-5 text-[13px] leading-[1.6] text-n500">
        처음 가입하면 임시회원 등급으로 바로 시작할 수 있습니다. 졸업생도 동일하게
        가입할 수 있습니다.
      </p>
    </div>
  );
}
