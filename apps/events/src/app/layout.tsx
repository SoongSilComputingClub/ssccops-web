import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { AuthNav } from "@/features/auth";
import { ROUTES } from "@/shared/config/routes";
import "./globals.css";

/**
 * 공개 앱 루트 메타.
 *
 * `title.template`을 두면 상세 화면이 행사 제목만 돌려줘도 탭·공유 카드에 서비스 이름이 함께
 * 붙는다. 다만 **OG 제목에는 이 템플릿이 적용되지 않으므로**(og:title은 별도 필드다) 상세
 * 화면이 openGraph.title을 직접 적는다.
 */
export const metadata: Metadata = {
  title: {
    default: "SSCC 행사",
    template: "%s · SSCC",
  },
  description: "숭실컴퓨팅클럽(SSCC)이 여는 모집 · 세미나 · 프로젝트 · 행사 안내입니다",
  openGraph: {
    siteName: "SSCC",
    type: "website",
    locale: "ko_KR",
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
         * 공개 앱의 셸은 상단 바 하나뿐이다 — 어드민의 사이드바·권한 게이트는 로그인이 있는
         * 화면의 것이다. 여기에 붙는 것은 행사 목록과, 로그인한 사람에게만 서는 '내 신청'뿐이다
         * (#150). 로그인 여부에 따라 갈리는 부분만 클라이언트 컴포넌트(AuthNav)로 두어, 익명
         * 공개인 목록·상세 렌더에 세션 조회가 끼어들지 않게 한다.
         */}
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-[1000px] items-center gap-[10px] px-[20px] py-[12px] lg:px-[28px]">
            <Link href={ROUTES.events} className="flex items-center gap-[8px]">
              <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] border border-accent text-[13px] text-accent">
                S
              </span>
              <b className="text-[15px]">SSCC</b>
            </Link>
            <Link href={ROUTES.events} className="ml-[6px] text-[14.5px] text-n300">
              행사
            </Link>
            <AuthNav />
          </div>
        </header>
        <main className="mx-auto max-w-[1000px] px-[20px] py-[22px] lg:px-[28px] lg:py-[26px]">
          {children}
        </main>
      </body>
    </html>
  );
}
