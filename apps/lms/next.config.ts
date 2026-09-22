import { execSync } from "node:child_process";
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

import { version } from "./package.json";

/*
 * 빌드된 커밋 sha (ssccops#340 · #442). `/version`이 돌려주고 deploy-history 워크플로가 «이
 * sha가 실제로 떠 있는가»를 폴링한다. Vercel `VERCEL_GIT_COMMIT_SHA` → Cloudflare
 * `WORKERS_CI_COMMIT_SHA` → git 순서이고, 실패하면 "unknown"으로 두고 빌드는 막지 않는다.
 * admin `next.config.ts`와 같은 함수다.
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
 * 공유 폼 렌더러(#152)를 소스 그대로 컴파일한다. 이 앱에는 아직 화면이 없고 의존성만 걸어
 * 두었다(#169) — 기획안 제출 화면(회원이 PROPOSAL 시스템 폼을 그린다)이 붙을 때 설정을 다시
 * 손대지 않아도 되게 하려는 것이다. `globals.css`의 `@source`도 같은 이유로 함께 걸어 둔다.
 *
 * `@ssccops/auth`(ssccops-web#329)도 같은 이유로 여기 있다 — 미들웨어와 라우트 핸들러가
 * 그 소스를 그대로 컴파일한다. `@ssccops/pwa`(#606 · ADR-0045)는 `app/sw.js/route.ts`가 서버에서
 * 부르고 훅은 브라우저가 쓴다 — 양쪽 다 이 목록에 있어야 한다.
 */
const nextConfig: NextConfig = {
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

initOpenNextCloudflareForDev();
