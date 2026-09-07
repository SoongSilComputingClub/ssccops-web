"use client";

import { useState } from "react";
import { SignupStep } from "@/features/signup";
import { PublicFormStep } from "./public-form-step";

/*
 * 가입 → 답 작성으로 넘어가는 자리 (`ApplyFlow`와 같은 모양이다).
 *
 * **화면을 옮기지 않는다.** 가입이 끝나면 상태 하나를 바꿔 같은 자리에서 폼을 그린다 —
 * 리다이렉트도, 서버 렌더 왕복도 없다. 서버가 판정한 `signedUp`은 **첫 단계를 정하는 값**일
 * 뿐이라 그 뒤에는 이 상태가 이긴다.
 *
 * 가입이 이미 돼 있으면 이 컴포넌트는 사실상 아무것도 하지 않고 폼을 그린다.
 */
export function PublicFormFlow({
  formId,
  signedUp,
  authUserEmail,
  authUserName,
}: {
  formId: number;
  signedUp: boolean;
  authUserEmail: string | null;
  authUserName: string | null;
}) {
  const [member, setMember] = useState(signedUp);

  if (!member) {
    return (
      <SignupStep
        authUserEmail={authUserEmail}
        authUserName={authUserName}
        onSignedUp={() => setMember(true)}
      />
    );
  }

  return <PublicFormStep formId={formId} />;
}
