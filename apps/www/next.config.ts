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
 * 공유 폼 렌더러(#152)를 소스 그대로 컴파일한다. 이 앱에는 아직 폼 화면이 없고 의존성만 걸어
 * 두었다 — 신청 흐름(EV-006)이 붙을 때 설정을 다시 손대지 않아도 되게 하려는 것이다.
 *
 * `@ssccops/auth`(ssccops-web#329)도 같은 이유로 여기 있다 — 미들웨어와 라우트 핸들러가
 * 그 소스를 그대로 컴파일한다.
 */
const nextConfig: NextConfig = {
  transpilePackages: [
    "@ssccops/form-renderer",
    "@ssccops/ui",
    "@ssccops/codes",
    "@ssccops/auth",
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

  /*
   * `/my-applications` → `/me` (#518 · ssccops#386). '내 신청'이 '내 활동'으로 이사했고 옛 주소는
   * 이미 뿌린 링크·북마크·OAuth 되돌아올 곳에 남아 있다. **화면이 아니라 설정이 옮긴다** — 이
   * 앱의 «리다이렉트를 하지 않는다» 규칙은 401·403을 로그인 화면으로 밀어내지 않는다는 뜻이고,
   * 주소 자체의 이사는 그 규칙과 무관하다. 쿼리(`?login_error=`)는 Next가 그대로 넘긴다.
   * permanent(308)인 것은 되돌릴 일이 없기 때문이다.
   */
  async redirects() {
    return [{ source: "/my-applications", destination: "/me", permanent: true }];
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
