import type { AuthSession } from "@/entities/session";
import { SignInButton } from "@/features/auth";
import { Notice } from "@/shared/ui";
import type { MeGate } from "../model/gate";
import { InlineSignup } from "./inline-signup";

/*
 * 로그인 문 앞의 안내 셋 — 다섯 페이지가 같은 것을 그린다 (#574).
 * 판정은 `model/gate.ts`, 문구는 여기. `next`는 언제나 그 페이지 자기 주소다(`me-frame.tsx`).
 */

/** 아직 로그인하지 않았다 — 이 화면의 기본 상태이지 오류가 아니다 */
export function SignedOutNotice({ next }: Readonly<{ next: string }>) {
  return (
    <Notice
      title="로그인하면 내 활동을 볼 수 있습니다"
      description="신청 결과와 활동은 본인만 볼 수 있어 로그인이 필요합니다."
    >
      <SignInButton next={next} label="구글로 로그인" />
    </Notice>
  );
}

/**
 * 인증은 됐지만 아직 회원이 아니다 — 안내와 가입 폼은 `InlineSignup`(클라이언트)이 든다.
 * 어드민 가입 화면으로 보내던 링크는 #451에서 걷어냈다(부원에게 운영 도메인이 노출됐다).
 * 세션을 못 읽은 채 목록만 403으로 온 경우엔 이메일·이름 없이 연다 — 폼이 초깃값만 비운다.
 */
export function SignupRequiredNotice({ session }: Readonly<{ session: AuthSession | null }>) {
  return (
    <InlineSignup
      authUserEmail={session?.authUser.email ?? null}
      authUserName={session?.authUser.name ?? null}
    />
  );
}

/** 토큰은 있는데 서버가 받아 주지 않았다 — 대개 만료다 */
export function SessionExpiredNotice({ next }: Readonly<{ next: string }>) {
  return (
    <Notice
      title="로그인이 만료되었습니다"
      description="로그인이 풀렸습니다. 다시 로그인하면 내 활동을 이어서 볼 수 있습니다."
    >
      <SignInButton next={next} label="다시 로그인" />
    </Notice>
  );
}

/** 문이 닫혀 있을 때의 안내 — `ready`면 null이고 호출부가 본문을 그린다 */
export function GateNotice({ gate, next }: Readonly<{ gate: MeGate; next: string }>) {
  if (gate.kind === "signup-required") return <SignupRequiredNotice session={gate.session} />;
  if (gate.kind === "session-expired") return <SessionExpiredNotice next={next} />;
  return null;
}

/**
 * 어느 계정으로 보고 있는지 밝힌다. 구글 계정을 둘 이상 쓰는 사람이 빈 목록을 보고 "신청이
 * 사라졌다"고 읽는 것을 막는 것이 목적이라, 목록이 비었을 때도 함께 남긴다.
 * 회원 이름이 있으면 그것을, 없으면 로그인한 계정의 이메일을 쓴다.
 */
export function AccountLine({ session }: Readonly<{ session: AuthSession | null }>) {
  const account = session?.member?.name ?? session?.authUser.email ?? null;
  if (!account) return null;
  return <p className="text-[13px] text-n500">{account} 계정으로 보고 있습니다</p>;
}
