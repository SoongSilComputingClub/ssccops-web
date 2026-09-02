import type { Metadata } from "next";
import { Notice } from "@/shared/ui";
import { StudioDashboardPage } from "@/views/studio-dashboard";
import { loginErrorMessage } from "@/shared/lib/login-error";
import { LOGIN_ERROR_QUERY } from "@/shared/config/routes";

/**
 * /studio — 학술 대시보드 · 스터디장 홈 (#126).
 *
 * 이 앱의 **첫 화면**이다(`app/page.tsx`가 여기로 넘긴다). `app/`은 라우팅 전용이라
 * 뷰(`views/studio-dashboard`)를 얇게 감싼다. 상단 활동 선택 드롭다운(#192)이 고른 활동은
 * `?programId=`로 실리므로 그것을 읽어 넘긴다 — 없으면 로더가 기본값(진행 중 활동)을 고른다.
 *
 * OAuth 콜백이 로그인 실패 사유를 `?login_error=`로 실어 이 화면으로 돌려보내므로, 그 배너를
 * 대시보드 위에 함께 그린다(#169가 세운 규약).
 */
export const metadata: Metadata = {
  title: "학술 대시보드",
};

function toId(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export default async function Page({ searchParams }: PageProps<"/studio">) {
  const params = await searchParams;
  const raw = params[LOGIN_ERROR_QUERY];
  const loginError = (Array.isArray(raw) ? raw[0] : raw) || null;

  return (
    <div className="flex flex-col gap-[16px]">
      {loginError && (
        <Notice title="로그인하지 못했습니다" description={loginErrorMessage(loginError)} />
      )}
      <StudioDashboardPage academicProgramId={toId(params.programId)} />
    </div>
  );
}
