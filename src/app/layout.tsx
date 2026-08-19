import type { Metadata, Viewport } from "next";
import { ToastViewport } from "@/shared/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "SSCC 운영관리",
  description: "SSCC 운영관리시스템",
  /*
   * iOS Safari는 manifest를 보지 않는다 (#108) — 홈 화면에 추가했을 때 전체 화면으로 뜨게
   * 하려면 이 메타가 따로 있어야 한다. 상태 표시줄을 default로 둔 것은 상단 바가 흰색이라
   * 글자가 검게 나와야 읽히기 때문이다.
   */
  appleWebApp: {
    capable: true,
    title: "SSCC 운영",
    statusBarStyle: "default",
  },
  /*
   * iOS는 manifest의 icons를 보지 않는다 — 이 링크가 없으면 홈 화면 아이콘 자리에
   * 페이지 스크린샷이 들어간다. 투명도를 지원하지 않고 모서리는 iOS가 알아서 깎으므로
   * 배경을 가장자리까지 채운 이미지를 쓴다 (#106 임시 아이콘).
   */
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

/*
 * 뷰포트 메타가 없으면 모바일 브라우저가 980px 가상 뷰포트로 렌더한 뒤 축소해 보여준다 —
 * 그러면 화면이 실제로 좁아도 미디어 쿼리는 980px 기준으로 걸려 반응형 분기가 통째로 죽는다.
 * `body { min-width: 1024px }` 제거(#85)와 이 선언은 한 쌍이라 따로 떼어 놓지 않는다.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  /*
   * manifest에도 theme_color가 있지만 여기에도 둔다 (#108) — manifest 쪽은 설치된 앱의
   * 창 색이고, 이쪽은 브라우저로 열었을 때의 주소창 색이라 적용 시점이 다르다.
   * Next 14부터 themeColor는 metadata가 아니라 viewport에 넣는다.
   */
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
        {children}
        <ToastViewport />
      </body>
    </html>
  );
}
