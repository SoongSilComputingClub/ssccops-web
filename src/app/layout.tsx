import type { Metadata, Viewport } from "next";
import { ToastViewport } from "@/shared/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "SSCC 운영관리",
  description: "SSCC 운영관리시스템",
};

/*
 * 뷰포트 메타가 없으면 모바일 브라우저가 980px 가상 뷰포트로 렌더한 뒤 축소해 보여준다 —
 * 그러면 화면이 실제로 좁아도 미디어 쿼리는 980px 기준으로 걸려 반응형 분기가 통째로 죽는다.
 * `body { min-width: 1024px }` 제거(#85)와 이 선언은 한 쌍이라 따로 떼어 놓지 않는다.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
