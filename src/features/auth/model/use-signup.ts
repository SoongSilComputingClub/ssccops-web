"use client";

import { useCallback, useRef, useState } from "react";
import type { MemberProfile } from "@/entities/session";
import { apiFetch } from "@/shared/lib/api/client";
import { toSignupFailure, type SignupFailure, type SignupRequest } from "./signup-form";

/**
 * 가입 결과. 실패를 throw가 아니라 값으로 돌려주는 것은, 호출부가 성공과 실패를 같은
 * 한 갈래에서 다루게 하려는 것이다 — 화면에서는 오류도 "어디에 무엇을 띄울지"의 문제다.
 */
export type SignupOutcome =
  | { ok: true; member: MemberProfile }
  | { ok: false; failure: SignupFailure };

export interface Signup {
  /** 요청 진행 중 — 제출 버튼을 잠그는 데 쓴다 */
  pending: boolean;
  submit: (request: SignupRequest) => Promise<SignupOutcome>;
}

/**
 * POST /v1/members/signup — 인증은 됐지만 아직 회원이 아닌 사용자를 회원으로 만든다.
 *
 * 응답 본문은 GET /v1/auth/session의 member 블록과 같은 모양이라, 가입 직후 세션을 다시
 * 조회하지 않고 그대로 스토어에 넣을 수 있다 (서버가 그렇게 맞춰 주기로 한 계약이다).
 */
export function useSignup(): Signup {
  const [pending, setPending] = useState(false);
  /*
   * pending state만으로는 같은 tick에 들어온 두 번째 클릭을 막지 못한다 (setState는 비동기라
   * 다음 렌더에서야 반영된다). 회원 생성은 되돌릴 수 없으므로 ref로 한 번 더 잠근다.
   */
  const inflight = useRef(false);

  const submit = useCallback(async (request: SignupRequest): Promise<SignupOutcome> => {
    if (inflight.current) {
      return { ok: false, failure: { kind: "form", message: "가입을 처리하는 중입니다" } };
    }
    inflight.current = true;
    setPending(true);

    try {
      const member = await apiFetch<MemberProfile>("/v1/members/signup", {
        method: "POST",
        body: JSON.stringify(request),
      });
      /*
       * 성공하면 잠금을 풀지 않는다. 화면 전환은 라우팅이 끝나야 일어나는데 그 사이에
       * 버튼이 다시 살아나면 이미 만들어진 회원으로 한 번 더 요청이 나간다.
       */
      return { ok: true, member };
    } catch (error) {
      inflight.current = false;
      setPending(false);
      return { ok: false, failure: toSignupFailure(error) };
    }
  }, []);

  return { pending, submit };
}
