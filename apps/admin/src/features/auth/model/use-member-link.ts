"use client";

import { useCallback, useRef, useState } from "react";
import { linkExistingMember, type MemberLinkRequest, type MemberProfile } from "@/entities/session";
import { toMemberLinkFailure, type MemberLinkFailure } from "./link-form";

/**
 * 연결 결과. 실패를 throw가 아니라 값으로 돌려주는 이유는 가입(`useSignup`)과 같다 —
 * 화면에서는 오류도 "어디에 무엇을 띄울지"의 문제다.
 */
export type MemberLinkOutcome =
  | { ok: true; member: MemberProfile }
  | { ok: false; failure: MemberLinkFailure };

export interface MemberLink {
  /** 요청 진행 중 — 제출 버튼을 잠그는 데 쓴다 */
  pending: boolean;
  submit: (request: MemberLinkRequest) => Promise<MemberLinkOutcome>;
}

/**
 * POST /v1/members/link — 이미 명부에 있는 회원에 이 소셜 계정을 붙인다 (#58).
 *
 * 연타 잠금(`inflight` ref)을 가입과 똑같이 두는 것은 여기서도 되돌릴 수 없는 일이 일어나기
 * 때문이다. 다만 위험의 방향이 다르다 — 가입은 회원이 하나 더 생기는 것이고, 연결은 **시도
 * 횟수가 깎이는 것**이다(429). 같은 tick에 두 번 나가면 사용자는 한 번 눌렀는데 두 번 쓴 것이
 * 되고, 잠긴 뒤에는 기다리는 것 말고 할 수 있는 일이 없다.
 */
export function useMemberLink(): MemberLink {
  const [pending, setPending] = useState(false);
  const inflight = useRef(false);

  const submit = useCallback(async (request: MemberLinkRequest): Promise<MemberLinkOutcome> => {
    if (inflight.current) {
      return { ok: false, failure: { kind: "form", message: "연결을 처리하는 중입니다" } };
    }
    inflight.current = true;
    setPending(true);

    try {
      const member = await linkExistingMember(request);
      /* 성공하면 잠금을 풀지 않는다 — 화면 전환이 끝나기 전에 버튼이 살아나면 한 번 더 나간다 */
      return { ok: true, member };
    } catch (error) {
      inflight.current = false;
      setPending(false);
      return { ok: false, failure: toMemberLinkFailure(error) };
    }
  }, []);

  return { pending, submit };
}
