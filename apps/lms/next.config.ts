import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/*
 * 공유 폼 렌더러(#152)를 소스 그대로 컴파일한다. 이 앱에는 아직 화면이 없고 의존성만 걸어
 * 두었다(#169) — 기획안 제출 화면(회원이 PROPOSAL 시스템 폼을 그린다)이 붙을 때 설정을 다시
 * 손대지 않아도 되게 하려는 것이다. `globals.css`의 `@source`도 같은 이유로 함께 걸어 둔다.
 */
const nextConfig: NextConfig = {
  transpilePackages: ["@ssccops/form-renderer"],
};

export default nextConfig;

initOpenNextCloudflareForDev();
