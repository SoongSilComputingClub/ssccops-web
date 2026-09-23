import { NextResponse } from "next/server";
import { withoutTrailingSlash } from "@/shared/lib/origin";

/*
 * 배포 확인용 `GET /version` (ssccops#340 · #442).
 *
 * deploy-history 워크플로가 릴리스·develop 푸시 뒤 «빌드된 sha가 실제로 떠 있는가»를 이
 * 응답으로 폴링한다. 세 값은 전부 `next.config.ts`가 빌드 때 인라인한 것이라 런타임에 읽을
 * 것이 없고, 그래서 `?probe=api` 조각을 빼면 세 앱의 이 파일은 글자까지 같다 — **그 조각은
 * www에만 있다**(아래 · 맨 위 `withoutTrailingSlash` import도 그 조각의 것이다).
 *
 * `force-dynamic`은 캐시 회피만을 위한 것이다 — 정적으로 굳으면 값은 어차피 같지만 CDN·
 * 브라우저가 옛 응답을 들고 있을 수 있어 «새 sha가 떴는가»를 묻는 폴링이 거짓 실패한다.
 * ISR·`use cache`는 쓰지 않는다(AGENTS.md «배포 — 두 플랫폼»: Vercel·Cloudflare 양쪽에서
 * 같은 뜻이어야 한다). 인증 없이 열려야 하므로 `middleware.ts` 매처에서 뺀다.
 *
 * ── `?probe=api` (#622 · ssccops#455) ──────────────────────────
 * 워커에서 API까지 한 번 왕복한 시간을 함께 돌려준다. dev www가 간헐적으로 몇 분씩 멈췄는데
 * «워커 → dev.api 경로»가 문제인지 «페이지 코드»가 문제인지 밖에서는 가를 수 없었다 — 이
 * 경로는 페이지 코드가 하나도 없이 `fetch` 하나뿐이라, 이것이 스톨하면 경로다. 상한 20초는
 * 스톨을 «스톨»로 기록하기 위한 것이고 정상은 0.1~0.5초. health는 공개 응답이라 비밀이 없다.
 */
export const dynamic = "force-dynamic";

const PROBE_TIMEOUT_MS = 20_000;

async function probeApi(): Promise<{ status: number; ms: number }> {
  const base = withoutTrailingSlash(process.env.NEXT_PUBLIC_API_BASE_URL);
  const startedAt = Date.now();
  if (!base) return { status: 0, ms: 0 };
  try {
    const res = await fetch(`${base}/actuator/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return { status: res.status, ms: Date.now() - startedAt };
  } catch {
    // 타임아웃·연결 실패 — 상태 0에 걸린 시간을 그대로 싣는다(≈ 상한이면 스톨)
    return { status: 0, ms: Date.now() - startedAt };
  }
}

export async function GET(request: Request) {
  const probe = new URL(request.url).searchParams.get("probe");
  const body: Record<string, unknown> = {
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown",
    sha: process.env.NEXT_PUBLIC_GIT_SHA ?? "unknown",
    builtAt: process.env.NEXT_PUBLIC_BUILT_AT ?? null,
  };
  if (probe === "api") body.api = await probeApi();
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
