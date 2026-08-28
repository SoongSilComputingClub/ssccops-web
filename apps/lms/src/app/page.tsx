import { redirect } from "next/navigation";
import { ROUTES } from "@/shared/config/routes";

/**
 * 루트 라우트 — 학술 대시보드로 넘긴다 (#169).
 *
 * 이 앱의 첫 화면은 `/studio`(학술 대시보드)다. 루트에 별도 랜딩을 두지 않는 것은 전 화면이
 * 로그인 필수라 "로그인 전용 랜딩"이 곧 `/studio`의 로그인 게이트와 같은 화면이 되기 때문이다.
 * manifest의 `start_url`도 `/studio`를 직접 가리켜 설치된 앱에는 이 한 단계가 없다.
 */
export default function Page() {
  redirect(ROUTES.studio);
}
