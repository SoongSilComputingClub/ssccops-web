import { execSync } from "node:child_process";
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

import { version } from "./package.json";

/*
 * 빌드된 커밋 sha (ssccops#340 · #442). `/version`이 돌려주고 deploy-history 워크플로가 «이
 * sha가 실제로 떠 있는가»를 폴링한다. 플랫폼마다 주는 변수가 달라 순서대로 본다 —
 * Vercel `VERCEL_GIT_COMMIT_SHA` → Cloudflare Workers Builds `WORKERS_CI_COMMIT_SHA` →
 * 로컬·CI는 git. git이 없거나(.git 없이 복사한 트리) 실패하면 "unknown"으로 두고 빌드는 막지
 * 않는다 — 배포 확인은 워크플로가 `unverified`로 남기면 되지 빌드가 죽을 일은 아니다.
 */
function resolveGitSha(): string {
  const fromPlatform =
    process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.WORKERS_CI_COMMIT_SHA;
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

initOpenNextCloudflareForDev();
