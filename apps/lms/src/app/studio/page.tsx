import type { Metadata } from "next";
import { Notice } from "@/shared/ui";
import { StudioDashboardPage } from "@/views/studio-dashboard";
import { loginErrorMessage } from "@/shared/lib/login-error";
import { LOGIN_ERROR_QUERY } from "@/shared/config/routes";

/**
 * /studio — 학술 대시보드 · 스터디장 홈 (#126).
 *
 * 이 앱의 **첫 화면**이다(`app/page.tsx`가 여기로 넘긴다). `app/`은 라우팅 전용이라
 * 뷰(`views/studio-dashboard`)를 얇게 감싼다 — 대상 활동은 주소가 아니라 로더가 고른다
 * (스터디장이 여러 활동을 맡아도 대시보드는 지금 굴러가는 하나를 보여 준다).
 *
 * OAuth 콜백이 로그인 실패 사유를 `?login_error=`로 실어 이 화면으로 돌려보내므로, 그 배너를
 * 대시보드 위에 함께 그린다(#169가 세운 규약).
 */
export const metadata: Metadata = {
  title: "학술 대시보드",
};

export default async function Page({ searchParams }: PageProps<"/studio">) {
  const params = await searchParams;
  const raw = params[LOGIN_ERROR_QUERY];
  const loginError = (Array.isArray(raw) ? raw[0] : raw) || null;

  return (
    <div className="flex flex-col gap-[16px]">
      {loginError && (
        <Notice title="로그인하지 못했습니다" description={loginErrorMessage(loginError)} />
      )}
      <StudioDashboardPage />
    </div>
  );
}
