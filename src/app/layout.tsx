import type { Metadata } from "next";
import { ToastViewport } from "@/shared/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "SSCC 운영관리",
  description: "SSCC 운영관리시스템",
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
