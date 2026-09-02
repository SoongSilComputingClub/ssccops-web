import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { AuthNav } from "@/features/auth";
import { ROUTES } from "@/shared/config/routes";
import { DesktopNav } from "./_shell/desktop-nav";
import { MobileNav } from "./_shell/mobile-nav";
import "./globals.css";

/**
 * 공개 웹사이트 루트 메타 (#167).
 *
 * 이 앱은 행사 앱으로 출발했지만(#141) 동아리 공식 홈페이지를 겸한다(#160) — 그래서 기본
 * 제목이 행사가 아니라 동아리 이름이다. `title.template`은 그대로 둔다: 행사 상세가 제목만
 * 돌려줘도 탭·공유 카드에 서비스 이름이 함께 붙는 장치이고, **OG 제목에는 이 템플릿이 적용되지
 * 않으므로**(og:title은 별도 필드다) 상세 화면이 openGraph.title을 직접 적는 구조도 유지한다.
 */
export const metadata: Metadata = {
  title: {
    default: "SSCC 숭실컴퓨팅클럽",
    template: "%s · SSCC",
  },
  description:
    "숭실대학교 컴퓨팅 동아리 SSCC — 동아리 소개와 모집 · 세미나 · 프로젝트 · 행사 안내",
  openGraph: {
    siteName: "SSCC",
    type: "website",
    locale: "ko_KR",
  },
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
   * iOS는 manifest의 icons도 보지 않는다 — 이 링크가 없으면 홈 화면 아이콘 자리에 페이지
   * 스크린샷이 들어간다. 파일은 어드민과 같은 임시 S 마크다(정식 로고가 나오면 두 앱을 함께 교체).
   */
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
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
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="antialiased">
        {/*
         * 상단 바는 로고(왼쪽)와 메뉴·로그인 상태(오른쪽) 두 덩어리다 (#167). 메뉴 목차는
         * `_shell/nav-links.ts` 한 벌을 데스크톱 메뉴와 모바일 드로어가 함께 쓴다 — 소개·활동
         * 같은 항목이 붙을 때 그 파일 한 줄만 늘리면 된다. 로그인 여부에 따라 갈리는 부분만
         * 클라이언트 컴포넌트(AuthNav)로 두어, 익명 공개인 목록·상세 렌더에 세션 조회가
         * 끼어들지 않게 한다(#150).
         */}
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-[1000px] items-center justify-between gap-[10px] px-[20px] py-[12px] lg:px-[28px]">
            <Link href={ROUTES.events} className="flex items-center gap-[8px]">
              <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] border border-accent text-[13px] text-accent">
                S
              </span>
              <b className="text-[15px]">SSCC</b>
            </Link>
            <div className="flex items-center gap-[6px]">
              <DesktopNav />
              <AuthNav />
              <MobileNav />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1000px] px-[20px] py-[22px] lg:px-[28px] lg:py-[26px]">
          {children}
        </main>
      </body>
    </html>
  );
}
