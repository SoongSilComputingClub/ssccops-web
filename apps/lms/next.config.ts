import { execSync } from "node:child_process";
import { join } from "node:path";
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

import { version } from "./package.json";

/*
 * 빌드된 커밋 sha (ssccops#340 · #442). `/version`이 돌려주고 deploy-history 워크플로가 «이
 * sha가 실제로 떠 있는가»를 폴링한다. Vercel `VERCEL_GIT_COMMIT_SHA` → Cloudflare
 * `WORKERS_CI_COMMIT_SHA` → Coolify `SOURCE_COMMIT`(#653 — 컨테이너 빌드는 `.git`을 넣지
 * 않는다) → git 순서이고, 실패하면 "unknown"으로 두고 빌드는 막지 않는다.
 * admin `next.config.ts`와 같은 함수다.
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
 * 공유 폼 렌더러(#152)를 소스 그대로 컴파일한다. 이 앱에는 아직 화면이 없고 의존성만 걸어
 * 두었다(#169) — 기획안 제출 화면(회원이 PROPOSAL 시스템 폼을 그린다)이 붙을 때 설정을 다시
 * 손대지 않아도 되게 하려는 것이다. `globals.css`의 `@source`도 같은 이유로 함께 걸어 둔다.
 *
 * `@ssccops/auth`(ssccops-web#329)도 같은 이유로 여기 있다 — 미들웨어와 라우트 핸들러가
 * 그 소스를 그대로 컴파일한다. `@ssccops/pwa`(#606 · ADR-0045)는 `app/sw.js/route.ts`가 서버에서
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
    "@ssccops/auth",
    "@ssccops/pwa",
  ],

  /*
   * 버전은 `package.json`에서 그대로(ssccops#229 · admin과 같은 이유 — `.env`로 받으면 배포
   * 설정에서 잊는다). sha·빌드 시각은 `/version`(#442)이 돌려준다.
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
