import { NextResponse } from "next/server";

/*
 * 배포 확인용 `GET /version` (ssccops#340 · #442).
 *
 * deploy-history 워크플로가 릴리스·develop 푸시 뒤 «빌드된 sha가 실제로 떠 있는가»를 이
 * 응답으로 폴링한다. 세 값은 전부 `next.config.ts`가 빌드 때 인라인한 것이라 런타임에 읽을
 * 것이 없고, 그래서 세 앱의 이 파일은 글자까지 같다.
 *
 * `force-dynamic`은 캐시 회피만을 위한 것이다 — 정적으로 굳으면 값은 어차피 같지만 CDN·
 * 브라우저가 옛 응답을 들고 있을 수 있어 «새 sha가 떴는가»를 묻는 폴링이 거짓 실패한다.
 * ISR·`use cache`는 쓰지 않는다(AGENTS.md «배포 — 두 플랫폼»: Vercel·Cloudflare 양쪽에서
 * 같은 뜻이어야 한다). 인증 없이 열려야 하므로 `middleware.ts` 매처에서 뺀다.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown",
      sha: process.env.NEXT_PUBLIC_GIT_SHA ?? "unknown",
      builtAt: process.env.NEXT_PUBLIC_BUILT_AT ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
