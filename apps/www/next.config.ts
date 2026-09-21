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
/** 서버 `PublicCacheControl`과 같은 값 — 서버가 바꾸면 여기도 함께 바꾼다 */
const PUBLIC_CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@ssccops/form-renderer",
    "@ssccops/ui",
    "@ssccops/codes",
    "@ssccops/content",
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
    return [
      { source: "/my-applications", destination: "/me", permanent: true },
      /*
       * `/activities` → `/records` (#591 · ssccops#439). 포스트 아카이브의 축 이름이 «기록»이 되면서
       * (#585 · ssccops#437 — 학술 프로그램(ADR-0043)과 «활동»이 부딪혔다) 주소도 어휘 표대로 바꿨다.
       * 옛 주소는 카카오톡에 뿌린 링크와 메신저가 한 번 굳힌 OG 카드에 남아 있다 — 하위 경로
       * (분류·상세·학기)까지 통째로 받는다. permanent(308)인 것은 `/my-applications`와 같은 이유다.
       */
      { source: "/activities", destination: "/records", permanent: true },
      { source: "/activities/:path*", destination: "/records/:path*", permanent: true },
    ];
  },

  /*
   * 익명 콘텐츠 화면의 `Cache-Control` (#520 · ssccops#382 · ADR-0038).
   *
   * 서버의 익명 응답(`/public/v1/pages·posts·forms/open`)에는
   * `public, s-maxage=300, stale-while-revalidate=600`이 실린다. «그대로 전달»하려 했지만
   * **서버 컴포넌트는 응답 헤더를 만질 수 없고** `apiFetch`도 `data`만 돌려준다 — 그래서 같은
   * 값을 경로에 건다. Next는 이미 `Cache-Control`이 있으면 동적 페이지의 기본값(`private,
   * no-store`)을 덮어쓰지 않는다(`send-payload.js`). 두 플랫폼 모두 이 설정을 읽는다(Vercel
   * 라우팅 · OpenNext routes-manifest) — ISR·`use cache` 없이 CDN이 5분 캐시하는 길이다.
   *
   * 걸리는 경로는 **세션을 보지 않는 화면**뿐이다 — 상단 바의 로그인 상태는 브라우저가
   * 판정하므로(`AuthNav`) HTML이 사람마다 다르지 않다. `/me`·`/f`·`/events/{id}/apply`처럼
   * 미들웨어가 잡는 경로에 이 값을 걸면 남의 세션 화면이 CDN에 남는다 — **넓히지 않는다.**
   * 게시본이 없어 «준비 중»을 그린 응답도 같은 5분 동안 남는다(서버 404는 캐시하지 않지만
   * 화면 응답은 200이다) — 게시 뒤 최대 5분 뒤에 보이는 것은 게시 취소와 같은 지연이다.
   *
   * 홈(`/`)과 행사 목록(`/events`)·문의(`/contact`)는 #524에서 들어왔다 — 홈은 세션을 보지
   * 않는 익명 화면이고(ssccops#385) 재료가 전부 익명 API다. `/events`는 **정확히 그 주소만**이다 —
   * `/events/:path*`로 적으면 신청 화면(`/events/{id}/apply`)까지 걸린다.
   */
  async headers() {
    return [
      {
        source: "/",
        headers: [{ key: "Cache-Control", value: PUBLIC_CACHE_CONTROL }],
      },
      {
        source: "/events",
        headers: [{ key: "Cache-Control", value: PUBLIC_CACHE_CONTROL }],
      },
      {
        source:
          "/:section(about|operators|academic|join|contact|privacy|photo-notice|terms|records)/:path*",
        headers: [{ key: "Cache-Control", value: PUBLIC_CACHE_CONTROL }],
      },
    ];
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
