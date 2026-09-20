import type { AuthSession } from "@/entities/session";
import { isSignupRequired, isUnauthenticated } from "@/shared/api/auth-error";

/*
 * 로그인 뒤의 문 — 다섯 페이지가 같은 판정을 쓴다 (#574 · ssccops#428).
 *
 * 첫 판(#518)의 `SignedInBody` 안에 있던 분기를 그대로 꺼낸 것이다. 내부 페이지가 넷이 되면서
 * 같은 «미가입이면 가입 안내 · 토큰이 죽었으면 재로그인» 판정을 페이지마다 적게 됐고, 한 곳만
 * 고쳐지면 나머지가 옛 규칙으로 남는다.
 *
 * ── 세션이 먼저 답한다 ───────────────────────────────────────
 * `/v1/auth/session`은 미가입자에게도 200을 준다. 그래서 목록이 403으로 깨지기를 기다리지 않고
 * `signedUp`으로 가입 안내를 가른다. 세션 조회 자체가 실패했으면 목록의 실패 사유로 다시 한 번
 * 본다 — 페이지의 조회는 전부 같은 토큰을 보내므로 대표 하나가 401·403이면 나머지도 그렇다.
 * 그 밖의 실패는 문이 아니라 그 블록의 일이다(«—»로 그린다).
 */
export type MeGate =
  | { kind: "ready"; session: AuthSession | null }
  | { kind: "signup-required"; session: AuthSession | null }
  | { kind: "session-expired" };

export function resolveGate(
  sessionResult: PromiseSettledResult<AuthSession>,
  /** 이 페이지를 대표하는 목록 조회 — 인증 실패를 여기서 읽는다 */
  primary: PromiseSettledResult<unknown>,
): MeGate {
  const session = sessionResult.status === "fulfilled" ? sessionResult.value : null;

  if (session && !session.signedUp) return { kind: "signup-required", session };

  if (primary.status === "rejected") {
    if (isSignupRequired(primary.reason)) return { kind: "signup-required", session };
    if (isUnauthenticated(primary.reason)) return { kind: "session-expired" };
  }

  return { kind: "ready", session };
}
