"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SignupStep } from "@/features/signup";
import { ROUTES } from "@/shared/config/routes";
import { Notice } from "@/shared/ui";

/*
 * 미가입 안내 + 같은 자리에서 가입 (ssccops-web#451).
 *
 * 그전에는 «가입 화면에서 먼저 가입하기»가 **어드민 오리진**으로 나갔다 — 부원에게 운영
 * 도메인이 노출되고, 가입을 마친 뒤 돌아올 자리도 없었다. 옛 주석은 «신청 흐름은 행사 하나를
 * 전제로 서서 여기엔 폼을 세울 수 없다»고 했는데, `SignupStep` 자체는 행사를 모른다(#154 ·
 * 기존 회원 연결 #364까지 그 안에서 끝난다). 그래서 신청 흐름과 같은 컴포넌트를 여기에 편다.
 *
 * 가입이 끝나면 `router.refresh()` — 이 화면은 SSR이라 서버 컴포넌트를 다시 그리면 세션이
 * `signedUp`으로 바뀌어 신청 목록이 그 자리에 뜬다. 리다이렉트도, 쿼리로 돌아올 곳을 나르는
 * 일도 없다.
 *
 * 폼을 처음부터 펼치지 않는 것은 이 화면의 첫 답이 «행사에 신청하면 거기서 가입까지 된다»이기
 * 때문이다 — 행사를 고르러 가는 사람에게 빈 가입 폼을 먼저 들이밀지 않는다.
 */
export function InlineSignup({
  authUserEmail,
  authUserName,
}: Readonly<{
  authUserEmail: string | null;
  authUserName: string | null;
}>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <SignupStep
        authUserEmail={authUserEmail}
        authUserName={authUserName}
        onSignedUp={() => router.refresh()}
      />
    );
  }

  return (
    <Notice
      title="회원 가입을 마쳐야 신청 현황을 볼 수 있습니다"
      description="아직 회원 가입이 안 된 계정입니다. 아래에서 바로 가입할 수 있습니다."
    >
      <div className="flex flex-wrap items-center justify-center gap-[8px]">
        <Link
          href={ROUTES.events}
          className="rounded-xl bg-accent px-[16px] py-[12px] text-[15px] font-semibold text-on-solid transition-colors hover:bg-accent-strong"
        >
          모집 중인 행사 보기
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="cursor-pointer px-[14px] py-[12px] text-[14.5px] text-n300 hover:text-ink"
        >
          지금 바로 가입하기
        </button>
      </div>
    </Notice>
  );
}
