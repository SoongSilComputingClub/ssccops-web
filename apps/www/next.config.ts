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
 * 공유 폼 렌더러(#152)를 소스 그대로 컴파일한다. 이 앱에는 아직 폼 화면이 없고 의존성만 걸어
 * 두었다 — 신청 흐름(EV-006)이 붙을 때 설정을 다시 손대지 않아도 되게 하려는 것이다.
 *
 * `@ssccops/auth`(ssccops-web#329)도 같은 이유로 여기 있다 — 미들웨어와 라우트 핸들러가
 * 그 소스를 그대로 컴파일한다. `@ssccops/pwa`(#607 · ADR-0045)는 `app/sw.js/route.ts`가 서버에서
 * 부르고 훅은 브라우저가 쓴다 — 양쪽 다 이 목록에 있어야 한다. `@ssccops/signup`(#664)은
 * 가입 화면 한 벌이다 — lms와 나눠 쓴다.
 */
/** 서버 `PublicCacheControl`과 같은 값 — 서버가 바꾸면 여기도 함께 바꾼다 */
const PUBLIC_CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";

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
    "@ssccops/signup",
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
      /*
       * sitemap(#602)도 같은 5분 — 요청마다 만드는 라우트(`app/sitemap.ts` `force-dynamic`)인데
       * 재료가 전부 위와 같은 익명 API라 같은 값이 맞다. robots.txt는 빌드 때 굳는 정적 파일이라
       * 여기 없다.
       */
      {
        source: "/sitemap.xml",
        headers: [{ key: "Cache-Control", value: PUBLIC_CACHE_CONTROL }],
      },
    ];
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
