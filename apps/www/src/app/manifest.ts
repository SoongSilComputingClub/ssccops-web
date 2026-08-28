import type { MetadataRoute } from "next";

/*
 * PWA 매니페스트 (#167 · 범위 결정 ssccops#150의 B안 "아이콘·manifest만").
 *
 * 설치 유도(프롬프트·배너)와 서비스워커·푸시는 범위 밖이다. 이 앱의 방문자 대부분은 카톡·에타
 * 링크로 한 번 들어와 행사를 보고 나가므로 설치를 권할 대상이 뚜렷하지 않다 — 대신 재학생이
 * 스스로 홈 화면에 추가했을 때 아이콘 자리에 페이지 스크린샷이 박히는 일은 막는다. 그것이
 * manifest와 아이콘 한 벌로 끝나는 이유이고, 재방문 수요가 확인되면 그때 설치 유도를 얹는다.
 *
 * ── start_url이 "/"인 이유 ────────────────────────────────
 * "/"가 행사 목록이자 이 앱의 첫 화면이다. 나중에 홈페이지 첫 화면이 소개 페이지로 바뀌어도
 * "/"가 그것을 가리키게 될 테니, 설치된 사용자만 옛 주소로 남는 일이 없다.
 *
 * ── display: standalone ───────────────────────────────────
 * 브라우저 뒤로가기가 사라지지만 갇히는 경로가 없다 — 상세·신청·내 신청 전부 상단 바의
 * 로고로 목록에 돌아간다.
 *
 * ── 아이콘 ────────────────────────────────────────────────
 * 어드민과 같은 파일이다(ssccops#106의 임시 S 마크). 두 앱이 같은 동아리의 얼굴이므로 같은
 * 마크를 쓰는 것이 맞고, 정식 로고가 나오면 두 앱의 같은 파일명을 함께 교체한다.
 * 192·512가 둘 다 필요하다는 것, maskable을 따로 두는 이유, iOS가 manifest 아이콘을 보지
 * 않아 apple-touch-icon을 layout.tsx에서 거는 이유는 어드민 manifest.ts 주석과 같다.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SSCC 숭실컴퓨팅클럽",
    short_name: "SSCC",
    description: "숭실대학교 컴퓨팅 동아리 SSCC — 소개와 모집·세미나·프로젝트·행사 안내",
    lang: "ko",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // 화면 바탕(--color-bg). 앱이 뜨는 동안 보이는 색이라 본문과 같아야 이질감이 없다
    background_color: "#f2f4f6",
    // 상단 바가 bg-surface(흰색)라 상태 표시줄도 같은 색으로 이어 붙인다
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
    ],
  };
}
