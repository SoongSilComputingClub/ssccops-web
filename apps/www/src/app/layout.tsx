import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Link from "next/link";
import { BrandMark, deployMarks } from "@ssccops/ui";
import { AuthNav } from "@/features/auth";
import { OG_IMAGE_SIZE, ogImagePath } from "@/shared/config/og-cards";
import { ROUTES } from "@/shared/config/routes";
import { ORGANIZATION_NAME, siteOrigin } from "@/shared/config/site";
import { THEME_INIT_SCRIPT } from "@/shared/lib/theme";
import { ThemeToggle } from "@/shared/ui";
import { DesktopNav } from "./_shell/desktop-nav";
import { MobileNav } from "./_shell/mobile-nav";
import { SiteFooter } from "./_shell/site-footer";
import { ON_VERCEL } from "@/shared/lib/vercel";
import "./globals.css";

/*
 * 배포 환경 표식 (ssccops#291 · #413) — 파비콘·apple-touch-icon·`[DEV] ` 제목.
 * `process.env.NEXT_PUBLIC_DEPLOY_ENV`는 **이 파일에 글자 그대로 적혀 있어야** 빌드 때 값이
 * 인라인된다 — `@ssccops/ui` 안에서 읽으면 빈 값이 되어 dev도 prod로 보인다. 그래서 값만
 * 넘기고 판정은 패키지가 한다. dev 워커의 Cloudflare 빌드 변수에만 `dev`, 없으면 prod.
 */
const DEPLOY = deployMarks(process.env.NEXT_PUBLIC_DEPLOY_ENV);

/*
 * 이 사이트의 오리진 (#602 · ssccops#444) — `NEXT_PUBLIC_PUBLIC_FORM_ORIGIN`(어드민·lms가 www를
 * 가리키는 바로 그 변수 · `shared/config/site.ts` 주석). 비면 절대 주소가 필요한 메타(아래
 * `metadataBase`·canonical·og:image)를 전부 뺀다 — 요청 헤더로 지어내지 않는다.
 */
const ORIGIN = siteOrigin();

/*
 * 검색엔진 소유 확인 토큰 — 사람이 Search Console·네이버 서치어드바이저에 등록하며 받은 값을
 * www Vercel(prod)의 env에 넣는다(#602 «사람이 할 것»). 비면 태그 자체가 없다(Next가 falsy를
 * 건너뛴다). 네이버는 표준 키가 아니라 `other`로 `naver-site-verification`을 낸다.
 */
const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const NAVER_SITE_VERIFICATION = process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION;

/**
 * 공개 웹사이트 루트 메타 (#167).
 *
 * 이 앱은 행사 앱으로 출발했지만(#141) 동아리 공식 홈페이지를 겸한다(#160) — 그래서 기본
 * 제목이 행사가 아니라 동아리 이름이다. `title.template`은 그대로 둔다: 행사 상세가 제목만
 * 돌려줘도 탭·공유 카드에 서비스 이름이 함께 붙는 장치이고, **OG 제목에는 이 템플릿이 적용되지
 * 않으므로**(og:title은 별도 필드다) 상세 화면이 openGraph.title을 직접 적는 구조도 유지한다.
 *
 * ── SEO (#602 · ssccops#444) ────────────────────────────────
 * `metadataBase`가 있어야 상대 경로로 적은 og:image·canonical이 절대 주소로 나간다(메신저·
 * 검색엔진은 상대 주소를 받지 않는다). canonical은 `"./"` — Next가 요청 경로로 풀어 화면마다
 * 자기 주소가 정본이 된다(`/events?clsf=X`·`/records?cursor=`처럼 쿼리가 붙은 주소도 쿼리 없는
 * 쪽을 가리킨다). 화면이 `alternates`를 따로 적으면 그쪽이 이긴다. 기본 og:image는 `/og`
 * (`app/og/route.tsx`)이고 대표 이미지·표지가 있는 행사·포스트, 자기 카드가 있는 폼은 자기
 * `openGraph.images`로 덮는다. 색인 여부는 여기가 아니라 `robots.ts`가 가른다(dev는 전부 차단).
 */
export const metadata: Metadata = {
  ...(ORIGIN
    ? {
        metadataBase: new URL(ORIGIN),
        alternates: { canonical: "./" },
      }
    : {}),
  // `[DEV] `는 default와 template 둘 다에 붙는다 — 화면 제목이 있는 페이지도 접두가 살아야 한다
  title: {
    default: DEPLOY.title(ORGANIZATION_NAME),
    template: DEPLOY.title("%s · SSCC"),
  },
  description:
    "숭실대학교 컴퓨팅 동아리 SSCC — 소개와 모집·세미나·프로젝트·행사 안내",
  openGraph: {
    siteName: "SSCC",
    type: "website",
    locale: "ko_KR",
    ...(ORIGIN ? { images: [{ url: ogImagePath("default"), ...OG_IMAGE_SIZE }] } : {}),
  },
  // 트위터(X)·디스코드는 og:image 대신 이 카드 타입을 먼저 본다 — 이미지가 있을 때만 큰 카드
  twitter: { card: ORIGIN ? "summary_large_image" : "summary" },
  ...(GOOGLE_SITE_VERIFICATION || NAVER_SITE_VERIFICATION
    ? {
        verification: {
          google: GOOGLE_SITE_VERIFICATION,
          other: NAVER_SITE_VERIFICATION
            ? { "naver-site-verification": NAVER_SITE_VERIFICATION }
            : undefined,
        },
      }
    : {}),
  /*
   * iOS Safari는 manifest를 보지 않는다 — 홈 화면에 추가했을 때 전체 화면으로 뜨게 하려면
   * 이 메타가 따로 있어야 한다(어드민 #108과 같은 이유). 상태 표시줄을 default로 둔 것은
   * 상단 바가 흰색이라 글자가 검게 나와야 읽히기 때문이다.
   */
  appleWebApp: {
    capable: true,
    title: "SSCC",
    statusBarStyle: "default",
  },
  /*
   * `icon`은 탭 파비콘이다 — `src/app/favicon.ico` 파일 규약을 걷어냈다(#413). 파일 규약은
   * 환경으로 갈릴 수 없고, 남겨 두면 `metadata.icons`와 둘이 `/favicon.ico`를 다툰다.
   *
   * `apple`: iOS는 manifest의 icons도 보지 않는다 — 이 링크가 없으면 홈 화면 아이콘 자리에
   * 페이지 스크린샷이 들어간다. 파일은 세 앱이 같은 마크를 색만 달리한 것이다(manifest.ts 주석).
   */
  icons: DEPLOY.icons,
};

/*
 * 뷰포트 메타가 없으면 모바일 브라우저가 980px 가상 뷰포트로 렌더한 뒤 축소해 보여준다 —
 * 그러면 화면이 실제로 좁아도 미디어 쿼리는 980px 기준으로 걸려 반응형 분기가 통째로 죽는다.
 * themeColor는 manifest에도 있지만 여기에도 둔다 — manifest 쪽은 설치된 앱의 창 색이고,
 * 이쪽은 브라우저로 열었을 때의 주소창 색이라 적용 시점이 다르다.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  /*
   * 브라우저 주소창 색 — 테마마다 다르다 (#575 · lms #341과 같다). 하나만 두면 어두운 화면 위에
   * 흰 주소창이 남아 그 자리만 튄다. 값은 각 테마의 `surface`다(`globals.css`). manifest의
   * `theme_color`는 라이트 하나뿐이다 — manifest는 미디어 쿼리를 받지 못한다.
   */
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1f1f26" },
  ],
};

/*
 * ── `suppressHydrationWarning`은 아래 테마 스크립트의 짝이다 (#575 · lms와 같다) ──
 * 서버는 `data-theme` 없이 `<html>`을 그리는데(`localStorage`를 읽을 수 없다) `<head>`의
 * 동기 스크립트가 React보다 먼저 그 속성을 박는다 — 하이드레이션이 «서버에 없던 속성»을 보고
 * 경고한다. 스크립트를 뒤로 미루면 흰 화면이 한 번 번쩍이므로(그것이 admin #226의 이유다)
 * 경고 쪽을 끈다.
 *
 * **이 요소의 속성 불일치 한 겹만** 눌린다 — 자식 요소의 진짜 불일치는 그대로 잡힌다.
 * 그래서 `<html>`에만 붙이고 `<body>`나 그 아래로 내리지 않는다.
 */
export default function RootLayout({ children }: Readonly<LayoutProps<"/">>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/*
          * 저장된 테마를 **첫 페인트 전에** 박는다 (#575 · lms #341 · admin #226과 같다). React가
          * 붙은 뒤에 적용하면 밝은 화면이 한 번 번쩍이고 어두워진다 — 그래서 이것만 동기
          * 스크립트다. 문자열은 `shared/lib/theme`(→ `@ssccops/ui`)이 저장 키와 함께 쥐고 있어 갈리지 않는다.
          */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      {/*
       * 푸터가 짧은 화면에서도 바닥에 붙도록 body를 세로 flex로 두고 main이 남는 높이를 차지한다
       * (#520). 상단 바는 로고(왼쪽)와 메뉴·로그인 상태(오른쪽) 두 덩어리다 (#167). 메뉴 목차는
       * `_shell/nav-links.ts` 한 벌(다섯 축)을 데스크톱 메뉴와 모바일 드로어가 함께 쓴다.
       * 로그인 여부에 따라 갈리는 부분만 클라이언트 컴포넌트(AuthNav)로 두어, 익명 공개인
       * 목록·상세 렌더에 세션 조회가 끼어들지 않게 한다(#150).
       */}
      <body className="flex min-h-screen flex-col antialiased">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-[1000px] items-center justify-between gap-[10px] px-[20px] py-[12px] lg:px-[28px]">
            <Link href={ROUTES.home} className="flex items-center gap-[8px]">
              <BrandMark src={DEPLOY.mark} size={26} />
              <b className="text-[15px]">SSCC</b>
            </Link>
            <div className="flex items-center gap-[6px]">
              <DesktopNav />
              <AuthNav />
              {/*
               * 테마는 admin(사이드바 발치)·lms(상단 바)와 같은 3버튼으로 고른다 (#575 · lms #349).
               * `fit`을 주는 것은 이 자리가 로고·메뉴·로그인과 한 줄을 나눠 쓰기 때문이다 —
               * 기본값(`flex-1`)은 폭을 채우려 들어 드로어 발치에서만 맞다.
               *
               * `lg:` 이상에서만 보이는 것은 좁은 화면에서 드로어와 겹치기 때문이다 — 그쪽은
               * 드로어 발치의 `ThemeToggle`이 맡고, 둘은 같은 상태를 본다.
               */}
              <ThemeToggle fit className="hidden lg:flex" />
              <MobileNav />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1000px] flex-1 px-[20px] py-[22px] lg:px-[28px] lg:py-[26px]">
          {children}
        </main>
        <SiteFooter />
        {/*
         * 측정 둘 — 방문 통계와 실사용자 Web Vitals (#600 · ssccops#443). Vercel에서만(가드는
         * shared/lib/vercel.ts). Speed Insights는 세 앱이 한 할당(30일 1만)을 나누므로 **www에만**
         * 싣는다 — 어드민·LMS는 회원 소수라 데이터가 적고 그 트래픽이 www 할당을 깎는다. 둘 다
         * 쿠키 없이 돌고 개인을 식별하지 않는다(/privacy가 그것을 말한다).
         */}
        {ON_VERCEL && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}
      </body>
    </html>
  );
}
