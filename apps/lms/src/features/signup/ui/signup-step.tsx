"use client";

import { SignupStep as SharedSignupStep, type SignupStepProps } from "@ssccops/signup";
import { apiFetchAuthedFromBrowser } from "@/shared/api/browser-client";

/*
 * 간편 가입 — 화면은 `@ssccops/signup` 한 벌이다 (#664 · 그전에는 www와 글자까지 같은 사본이었다).
 *
 * 이 파일이 하는 일은 **이 앱의 전송 계층을 꽂는 것 하나**다. 패키지가 아는 것은 «봉투를 벗겨
 * `data`만 돌려주는 인증 호출»뿐이고, 토큰을 어디서 꺼내는지·401을 어떻게 다루는지는 앱이
 * 정한다(루트 `AGENTS.md` «인증»). 화면·문구·동작은 패키지가 정본이므로 여기서 덧붙이지
 * 않는다 — 이 앱에서 부르는 곳은 `SignupRequiredNotice` 하나이고 문구는 그쪽이 준다(#453).
 */
export function SignupStep(props: Readonly<Omit<SignupStepProps, "apiFetch">>) {
  return <SharedSignupStep {...props} apiFetch={apiFetchAuthedFromBrowser} />;
}
