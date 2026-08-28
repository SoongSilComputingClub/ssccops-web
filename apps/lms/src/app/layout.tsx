import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { AuthNav } from "@/features/auth";
import { ROUTES } from "@/shared/config/routes";
import { DesktopNav } from "./_shell/desktop-nav";
import { MobileNav } from "./_shell/mobile-nav";
import "./globals.css";

/**
 * 학술 공개 앱 루트 메타 (#169).
 *
 * 스터디장·회원이 자기 학술 활동을 보는 앱이다(lms.sscc.co.kr). 어드민·공개 행사 앱과 같은
 * 동아리의 얼굴이므로 서비스 이름을 공유하고, 제목 템플릿으로 화면 이름 뒤에 붙인다.
 */
export const metadata: Metadata = {
  title: {
    default: "SSCC 학술",
    template: "%s · SSCC 학술",
  },
  description: "숭실컴퓨팅클럽 학술 — 스터디·프로젝트 활동과 회차·출석, 기획안 제출",
  openGraph: {
    siteName: "SSCC 학술",
    type: "website",
    locale: "ko_KR",
  },
  /*
   * iOS Safari는 manifest를 보지 않는다 — 홈 화면에 추가했을 때 전체 화면으로 뜨게 하려면
   * 이 메타가 따로 있어야 한다(어드민 #108·www #167과 같은 이유). 상태 표시줄을 default로 둔
   * 것은 상단 바가 흰색이라 글자가 검게 나와야 읽히기 때문이다.
   */
  appleWebApp: {
    capable: true,
    title: "SSCC 학술",
    statusBarStyle: "default",
  },
  /*
   * iOS는 manifest의 icons도 보지 않는다 — 이 링크가 없으면 홈 화면 아이콘 자리에 페이지
   * 스크린샷이 들어간다. 파일은 어드민·www와 같은 임시 S 마크다(정식 로고가 나오면 세 앱을
   * 함께 교체).
   */
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

/*
 * 뷰포트 메타가 없으면 모바일 브라우저가 980px 가상 뷰포트로 렌더한 뒤 축소해 보여준다 —
 * 그러면 화면이 실제로 좁아도 미디어 쿼리는 980px 기준으로 걸려 반응형 분기가 통째로 죽는다.
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
         * 상단 바는 로고(왼쪽)와 메뉴·로그인 상태(오른쪽) 두 덩어리다 (apps/www #167과 같은
         * 구조). 메뉴 목차는 `_shell/nav-links.ts` 한 벌을 데스크톱 메뉴와 모바일 드로어가
         * 함께 쓴다. 로그인 여부에 따라 갈리는 부분만 클라이언트 컴포넌트(AuthNav)로 둔다.
         */}
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-[1000px] items-center justify-between gap-[10px] px-[20px] py-[12px] lg:px-[28px]">
            <Link href={ROUTES.studio} className="flex items-center gap-[8px]">
              <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] border border-accent text-[13px] text-accent">
                S
              </span>
              <b className="text-[15px]">SSCC 학술</b>
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
