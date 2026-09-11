import type { MetadataRoute } from "next";
import { deployMarks } from "@ssccops/ui";

/*
 * PWA 매니페스트 (#169 · apps/www #167과 같은 범위 — "아이콘·manifest만").
 *
 * 설치 유도(프롬프트·배너)와 서비스워커·푸시는 범위 밖이다. 재학생이 스스로 홈 화면에
 * 추가했을 때 아이콘 자리에 페이지 스크린샷이 박히는 일만 막는다.
 *
 * start_url이 "/studio"인 이유: 그것이 이 앱의 첫 화면(학술 대시보드)이다. "/"로 두면
 * 루트 라우트가 /studio로 넘기는 한 단계가 설치된 앱에도 남는다.
 *
 * 아이콘은 `scripts/icons/generate-icons.py`의 산출물이다(ssccops#291 · #413). 세 앱이 같은
 * 마크를 쓰되 색으로 갈리고(lms는 남색→청록), dev 배포는 우하단 호박색 모서리로 갈린다.
 * 폴더(`/icons/prod`·`/icons/dev`)와 이름 뒤 ` (dev)`는 `NEXT_PUBLIC_DEPLOY_ENV`가 정한다.
 * 192·512가 둘 다 필요한 것, maskable을 따로 두는 것, iOS가 manifest 아이콘을 보지 않아
 * apple-touch-icon을 layout.tsx에서 거는 것은 어드민·www manifest.ts 주석과 같다.
 */
// 아이콘 경로·이름 접미는 layout.tsx와 같은 판정 — 값은 이 파일이 읽어 넘긴다(인라인 함정은 그쪽 주석)
const DEPLOY = deployMarks(process.env.NEXT_PUBLIC_DEPLOY_ENV);

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: DEPLOY.name("SSCC 학술"),
    short_name: DEPLOY.name("SSCC 학술"),
    description: "숭실컴퓨팅클럽 학술 — 스터디·프로젝트 활동과 회차·출석, 기획안 제출",
    lang: "ko",
    start_url: "/studio",
    scope: "/",
    display: "standalone",
    // 화면 바탕(--color-bg). 앱이 뜨는 동안 보이는 색이라 본문과 같아야 이질감이 없다
    background_color: "#f2f4f6",
    // 상단 바가 bg-surface(흰색)라 상태 표시줄도 같은 색으로 이어 붙인다
    theme_color: "#ffffff",
    icons: DEPLOY.manifestIcons,
  };
}
