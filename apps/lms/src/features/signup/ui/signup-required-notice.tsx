"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Notice } from "@/shared/ui";
import { SignupStep } from "./signup-step";

/*
 * 미가입(`SIGNUP_REQUIRED`) 안내 + 같은 자리에서 가입 (ssccops-web#453 · www #451과 같은 방식).
 *
 * 그전에는 열두 자리가 제각기 `signupUrl()`(어드민 오리진의 `/signup`)로 보냈다 — 부원에게
 * 운영 도메인이 노출되고, 가입을 마친 뒤 돌아올 자리도 없었다. «학술 앱에는 신청 흐름이 없어
 * 가입 폼을 임베드하지 않는다»던 `routes.ts`의 전제는 폼이 흐름에 묶여 있다는 오해였다 —
 * www의 `SignupStep`(기존 회원 연결까지 그 안에서 끝난다)은 행사를 모른다. 그 파일을 그대로
 * 가져왔다(`features/signup` · `entities/member`).
 *
 * 가입이 끝나면 `router.refresh()` — 화면이 서버 컴포넌트라 다시 그리면 403이 사라지고 원래
 * 내용이 그 자리에 뜬다. 문구는 자리마다 다르므로(«기획안을 낼 수 있습니다» 등) 제목·설명은
 * 부모가 준다.
 */
export function SignupRequiredNotice({
  title = "회원 가입을 마쳐야 학술 활동 화면을 볼 수 있습니다",
  description = "아직 회원 가입이 안 된 계정입니다. 아래에서 바로 가입할 수 있습니다.",
  authUserEmail = null,
  authUserName = null,
}: Readonly<{
  title?: string;
  description?: string;
  /** 구글 계정 — 서버 컴포넌트가 세션을 읽었으면 넘긴다. 없으면 폼이 초깃값만 비운다 */
  authUserEmail?: string | null;
  authUserName?: string | null;
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
    <Notice title={title} description={description}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer rounded-xl bg-accent px-[16px] py-[12px] text-[15px] font-semibold text-on-solid hover:bg-accent-strong"
      >
        지금 바로 가입하기
      </button>
    </Notice>
  );
}
