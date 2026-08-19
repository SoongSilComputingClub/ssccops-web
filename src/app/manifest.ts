import type { MetadataRoute } from "next";

/*
 * PWA 매니페스트 (#108 · 범위 결정 ssccops#105의 1안 "설치만").
 *
 * 서비스워커와 푸시는 범위 밖이다 — manifest만으로도 홈 화면 설치와 전체 화면 실행은 된다.
 *
 * ── start_url을 "/"로 둔 이유 ──────────────────────────────
 * "/"는 이미 /dashboard로 보내고, 미인증이면 미들웨어가 /login?next=... 로 거른다.
 * 설치 아이콘에서 열어도 웹에서 주소를 친 것과 같은 길을 타므로 인증 흐름이 갈리지 않는다.
 * /dashboard를 직접 박으면 나중에 첫 화면을 바꿀 때 이미 설치된 사용자만 옛 주소로 남는다.
 *
 * ── display: standalone이 안전한 이유 ──────────────────────
 * 브라우저 뒤로가기가 사라지지만 갇히는 경로가 없다 — 들어가는 화면은 전부 PageHeader의
 * showBack을 쓰고, 그것이 없는 화면은 드로어에서 바로 갈 수 있는 최상위 화면뿐이다.
 *
 * ── 아이콘 ────────────────────────────────────────────────
 * 아직 앱 아이콘이 없다(ssccops#106). Android는 설치 판정에 192·512 PNG를 요구하는 것으로
 * 알려져 있어 지금은 설치 배너가 안 뜰 수 있고, iOS는 manifest 아이콘을 아예 보지 않는다
 * (apple-touch-icon을 쓴다). 아이콘이 나오면 여기에 더한다.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SSCC 운영관리",
    short_name: "SSCC 운영",
    description: "SSCC 운영관리시스템",
    lang: "ko",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // 화면 바탕(--color-bg). 앱이 뜨는 동안 보이는 색이라 본문과 같아야 이질감이 없다
    background_color: "#f2f4f6",
    // 상단 바가 bg-surface(흰색)라 상태 표시줄도 같은 색으로 이어 붙인다
    theme_color: "#ffffff",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
