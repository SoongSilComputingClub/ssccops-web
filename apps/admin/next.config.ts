import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/*
 * 공유 폼 렌더러(#152)는 빌드 산출물이 아니라 **소스를 그대로 export** 한다 — 패키지에 번들
 * 단계를 두면 앱을 고칠 때마다 패키지를 먼저 빌드해야 하고, 그 순서를 잊으면 옛 산출물이
 * 조용히 쓰인다. Turbopack은 워크스페이스 패키지를 자동으로 트랜스파일하지만, webpack 경로와
 * OpenNext 빌드에서도 같게 돌도록 여기서 명시한다.
 */
const nextConfig: NextConfig = {
  transpilePackages: ["@ssccops/form-renderer"],
};

export default nextConfig;

initOpenNextCloudflareForDev();
