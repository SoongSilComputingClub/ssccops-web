import { execSync } from "node:child_process";
import { join } from "node:path";
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

import { version } from "./package.json";

/*
 * 빌드된 커밋 sha (ssccops#340 · #442). `/version`이 돌려주고 deploy-history 워크플로가 «이
 * sha가 실제로 떠 있는가»를 폴링한다. 플랫폼마다 주는 변수가 달라 순서대로 본다 —
 * Vercel `VERCEL_GIT_COMMIT_SHA` → Cloudflare Workers Builds `WORKERS_CI_COMMIT_SHA` →
 * Coolify `SOURCE_COMMIT`(#653 — 컨테이너 빌드는 `.git`을 넣지 않는다) → 로컬·CI는 git.
 * git이 없거나(.git 없이 복사한 트리) 실패하면 "unknown"으로 두고 빌드는 막지 않는다 — 배포 확인은 워크플로가 `unverified`로 남기면 되지 빌드가 죽을 일은 아니다.
 */
function resolveGitSha(): string {
  const fromPlatform =
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.WORKERS_CI_COMMIT_SHA ??
    process.env.SOURCE_COMMIT;
  if (fromPlatform) return fromPlatform;
  try {
    return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

/*
 * 공유 폼 렌더러(#152)는 빌드 산출물이 아니라 **소스를 그대로 export** 한다 — 패키지에 번들
 * 단계를 두면 앱을 고칠 때마다 패키지를 먼저 빌드해야 하고, 그 순서를 잊으면 옛 산출물이
 * 조용히 쓰인다. Turbopack은 워크스페이스 패키지를 자동으로 트랜스파일하지만, webpack 경로와
 * OpenNext 빌드에서도 같게 돌도록 여기서 명시한다.
 *
 * `@ssccops/auth`(ssccops-web#329)도 같은 이유로 여기 있다 — 미들웨어와 라우트 핸들러가
 * 그 소스를 그대로 컴파일한다. `@ssccops/pwa`(#604 · ADR-0045)는 `app/sw.js/route.ts`가 서버에서
 * 부르고 훅은 브라우저가 쓴다 — 양쪽 다 이 목록에 있어야 한다.
 */
const nextConfig: NextConfig = {
  /*
   * 컨테이너로 띄우는 자리(동아리방 Coolify · #653 · ssccops#471)를 위한 산출물.
   *
   * `standalone`은 실행에 필요한 파일만 추려 담는다 — 이미지에 소스와 `node_modules` 전체를
   * 넣지 않는다. **Cloudflare(dev)·Vercel(prod)은 이 값을 무시한다**(각자 자기 어댑터로
   * 빌드한다) 그래서 플랫폼 중립 규칙(ADR-0030)을 깨지 않는다.
   *
   * `outputFileTracingRoot`가 없으면 추적이 이 앱 폴더에서 멈춰 `packages/*`가 빠지고,
   * 컨테이너가 기동하다 `Cannot find module '@ssccops/ui'`로 죽는다 — 모노레포라 필요하다.
   */
  output: "standalone",
  outputFileTracingRoot: join(import.meta.dirname, "../../"),

  transpilePackages: [
    "@ssccops/form-renderer",
    "@ssccops/ui",
    "@ssccops/codes",
    "@ssccops/content",
    "@ssccops/auth",
    "@ssccops/pwa",
  ],

  /*
   * 화면에 띄울 버전을 `package.json`에서 그대로 끌어온다 (ssccops#229).
   *
   * `.env`로 받지 않는 이유는 **잊어버릴 수 있기 때문**이다. `NEXT_PUBLIC_*`은 빌드 타임에
   * 인라인되므로 배포 설정에 넣는 것을 빠뜨리면 값이 빈 채로 나가고, 화면에는 버전이 없는
   * 것처럼 보인다 — 이 저장소는 그 종류의 설정에서 이미 데었다(`APP_PUBLIC_BASE_URL` · 서버 #216).
   * 버전은 `package.json`에 이미 있는 값이라 사람 손을 한 번 더 거칠 이유가 없다.
   *
   * 그래서 릴리스에서 고칠 곳은 `package.json` 하나이고, 여기서 화면까지 저절로 따라온다.
   */
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_GIT_SHA: resolveGitSha(),
    NEXT_PUBLIC_BUILT_AT: new Date().toISOString(),
  },
};

export default nextConfig;

/*
 * Cloudflare dev 플랫폼 프록시는 **`next dev`에서만** 세운다 (#653).
 *
 * 이 함수의 유일한 가드는 `globalThis.AsyncLocalStorage`가 있는 프로세스인지 하나여서
 * (`@opennextjs/cloudflare`의 `shouldContextInitializationRun`) **`next build`에서도 돌고**
 * 그때마다 wrangler/workerd를 띄운다. 그것이 필요한 곳은 dev 서버뿐이고 — 이름이 말하는
 * 그대로다 — 컨테이너 빌드(alpine · musl)에서는 workerd 바이너리가 무효해 spawn이
 * uncaughtException으로 빌드를 죽인다. Vercel·Cloudflare 빌드에서도 쓰이지 않는 miniflare를
 * 한 번 띄웠다 버리던 자리다.
 *
 * `next dev`는 NODE_ENV=development, `next build`는 production으로 고정이라 이 조건이
 * 정확히 «개발 서버일 때»를 가른다.
 */
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}
