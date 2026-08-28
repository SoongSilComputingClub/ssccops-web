import { Notice } from "@/shared/ui";
import { LoginGate } from "@/features/auth";
import { loginErrorMessage } from "@/shared/lib/login-error";
import { LOGIN_ERROR_QUERY } from "@/shared/config/routes";

/**
 * 학술 대시보드 (#169) — **셸·인프라 확인용 플레이스홀더**다.
 *
 * 실제 대시보드 화면은 후속 이슈가 만든다. 이 이슈는 워크스페이스·셸·전송 계층까지만 세우므로,
 * 지금은 로그인 게이트만 그려 "비로그인 → 화면 안 로그인 유도"(#169 결정)가 동작하는지
 * 확인할 수 있게 한다. 로그인한 사용자에게는 게이트가 "준비 중" 안내로 바뀐다.
 */
export default async function Page({ searchParams }: PageProps<"/studio">) {
  const params = await searchParams;
  const raw = params[LOGIN_ERROR_QUERY];
  const loginError = (Array.isArray(raw) ? raw[0] : raw) || null;

  return (
    <div className="flex flex-col gap-[16px]">
      {loginError && (
        <Notice title="로그인하지 못했습니다" description={loginErrorMessage(loginError)} />
      )}
      <LoginGate />
    </div>
  );
}
