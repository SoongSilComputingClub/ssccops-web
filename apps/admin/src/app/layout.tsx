import type { Metadata, Viewport } from "next";
import { deployMarks } from "@ssccops/ui";
import { THEME_INIT_SCRIPT } from "@/shared/lib/theme";
import { ToastViewport } from "@/shared/ui";
import "./globals.css";

/*
 * 배포 환경 표식 (ssccops#291 · #413) — 파비콘·apple-touch-icon·`[DEV] ` 제목.
 * `process.env.NEXT_PUBLIC_DEPLOY_ENV`는 **이 파일에 글자 그대로 적혀 있어야** 빌드 때 값이
 * 인라인된다 — `@ssccops/ui` 안에서 읽으면 빈 값이 되어 dev도 prod로 보인다. 그래서 값만
 * 넘기고 판정은 패키지가 한다. dev 워커의 Cloudflare 빌드 변수에만 `dev`, 없으면 prod.
 */
const DEPLOY = deployMarks(process.env.NEXT_PUBLIC_DEPLOY_ENV);

export const metadata: Metadata = {
  // 문자열 하나라 접두를 바로 붙인다 — www·lms는 `{ default, template }`이라 둘 다에 붙는다
  title: DEPLOY.title("SSCC 운영관리"),
  description: "SSCC 운영관리시스템",
  /*
   * iOS Safari는 manifest를 보지 않는다 (#108) — 홈 화면에 추가했을 때 전체 화면으로 뜨게
   * 하려면 이 메타가 따로 있어야 한다. 상태 표시줄을 default로 둔 것은 상단 바가 흰색이라
   * 글자가 검게 나와야 읽히기 때문이다.
   */
  appleWebApp: {
    capable: true,
    title: "SSCC 운영",
    /*
     * 다크에서도 default를 유지한다 (#226) — black-translucent로 바꾸면 상태 표시줄이
     * 화면 위로 겹쳐 올라와 상단 바가 그만큼 잘린다. 테마별로 가를 수 있는 값도 아니다.
     */
    statusBarStyle: "default",
  },
  /*
   * `icon`은 탭 파비콘이다 — `src/app/favicon.ico` 파일 규약을 걷어냈다(#413). 파일 규약은
   * 환경으로 갈릴 수 없고, 남겨 두면 `metadata.icons`와 둘이 `/favicon.ico`를 다툰다.
   *
   * `apple`: iOS는 manifest의 icons를 보지 않는다 — 이 링크가 없으면 홈 화면 아이콘 자리에
   * 페이지 스크린샷이 들어간다. 투명도를 지원하지 않고 모서리는 iOS가 알아서 깎으므로
   * 배경을 가장자리까지 채운 이미지를 쓴다.
   */
  icons: DEPLOY.icons,
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1f1f26" },
  ],
};

export default function RootLayout({ children }: Readonly<LayoutProps<"/">>) {
  return (
    <html lang="ko">
      <head>
        {/*
          * 저장된 테마를 **첫 페인트 전에** 박는다 (#226). React가 붙은 뒤에 적용하면
          * 밝은 화면이 한 번 번쩍이고 어두워진다 — 그래서 이것만 동기 스크립트다.
          * 문자열은 shared/lib/theme.ts가 저장 키와 함께 쥐고 있어 둘이 갈리지 않는다.
          */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
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
