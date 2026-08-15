import { apiFetch } from "@/shared/lib/api/client";
import type { AuthSession } from "../model/types";

/*
 * 세션 조회 호출.
 *
 * ── 왜 features/auth가 아니라 entities/session에 있는가 ────────────
 * 원래 features/auth/model/use-auth-bootstrap.ts에 있었다. 그런데 403 FORBIDDEN을 받은 화면이
 * 세션을 다시 받아야 하는데(권한이 방금 회수됐을 수 있다), 그 화면들은 features/form ·
 * features/response · features/work다 — features가 features를 가져오면 FSD 레이어가 깨진다.
 * 세션은 원래 entities/session의 것이므로 조회도 이쪽으로 내렸다. features/auth는 그대로
 * 재노출하므로 기존 호출부(가입 화면)는 바뀌지 않는다.
 *
 * ── 진행 중 요청 공유 ──────────────────────────────────────────
 * 세션 조회는 AuthGate와 SignupGate 양쪽에서 시작된다. 가입 화면으로 넘어가는 순간 두 게이트가
 * 잠깐 겹치므로, 진행 중인 요청이 있으면 그 promise를 공유해 같은 조회가 두 번 나가지 않게 한다.
 * 403 재동기화가 여러 곳에서 동시에 들어오는 경우도 이 공유에 얹힌다.
 *
 * 새로고침하면 모듈이 다시 로드되므로 여기 캐시를 두는 의미는 없다 — 진행 중인 한 건을 합칠
 * 뿐이고, 끝나면 다음 호출은 다시 서버로 나간다.
 */
let inflight: Promise<AuthSession> | null = null;

/** GET /v1/auth/session — 이 사용자가 우리 서비스의 누구인지 판정하는 유일한 출처 */
export function fetchAuthSession(): Promise<AuthSession> {
  inflight ??= apiFetch<AuthSession>("/v1/auth/session").finally(() => {
    inflight = null;
  });
  return inflight;
}
