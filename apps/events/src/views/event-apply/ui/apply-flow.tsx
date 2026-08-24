"use client";

import { useState } from "react";
import { SignupStep } from "@/features/signup";
import { FormStep } from "./form-step";

/*
 * 가입 → 신청서 작성으로 넘어가는 자리.
 *
 * **화면을 옮기지 않는다.** 가입이 끝나면 상태 하나를 바꿔 같은 자리에서 신청서를 그린다 —
 * 리다이렉트도, 서버 렌더 왕복도 없다(§8-4: 이 구간의 이탈이 가장 크다). 서버가 판정한
 * `signedUp`은 **첫 단계를 정하는 값**일 뿐이라 그 뒤에는 이 상태가 이긴다.
 *
 * 가입이 이미 돼 있으면 이 컴포넌트는 사실상 아무것도 하지 않고 신청서를 그린다.
 */
export function ApplyFlow({
  formId,
  eventId,
  signedUp,
  authUserEmail,
  authUserName,
}: {
  formId: number;
  eventId: number;
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

  return <FormStep formId={formId} eventId={eventId} />;
}
