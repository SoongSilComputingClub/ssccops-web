import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

import { version } from "./package.json";

/*
 * 공유 폼 렌더러(#152)는 빌드 산출물이 아니라 **소스를 그대로 export** 한다 — 패키지에 번들
 * 단계를 두면 앱을 고칠 때마다 패키지를 먼저 빌드해야 하고, 그 순서를 잊으면 옛 산출물이
 * 조용히 쓰인다. Turbopack은 워크스페이스 패키지를 자동으로 트랜스파일하지만, webpack 경로와
 * OpenNext 빌드에서도 같게 돌도록 여기서 명시한다.
 */
const nextConfig: NextConfig = {
  transpilePackages: ["@ssccops/form-renderer"],

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
  env: { NEXT_PUBLIC_APP_VERSION: version },
};

export default nextConfig;

initOpenNextCloudflareForDev();
