import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/*
 * 공유 폼 렌더러(#152)를 소스 그대로 컴파일한다. 이 앱에는 아직 폼 화면이 없고 의존성만 걸어
 * 두었다 — 신청 흐름(EV-006)이 붙을 때 설정을 다시 손대지 않아도 되게 하려는 것이다.
 */
const nextConfig: NextConfig = {
  transpilePackages: ["@ssccops/form-renderer"],
};

export default nextConfig;

initOpenNextCloudflareForDev();
