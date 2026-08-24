import {
  fetchMyApplications,
  myApplicationsErrorMessage,
  type MyApplication,
} from "@/entities/application";
import { fetchAuthSession, loginErrorMessage, type AuthSession } from "@/entities/session";
import {
  currentAccessToken,
  isSignupRequired,
  isUnauthenticated,
} from "@/shared/api/authed-client";
import { SignInButton } from "@/features/auth";
import { ROUTES, signupUrl } from "@/shared/config/routes";
import { EmptyState } from "@/shared/ui";
import { ApplicationCard } from "./application-card";
import { Notice } from "./notice";

/*
 * 내 신청 현황 (SSR · wave2 D10).
 *
 * ── 왜 SSR인가 ────────────────────────────────────────────────
 * 이 앱은 전 화면이 서버 컴포넌트다(#141). 그 규약을 따르면서 사용자 토큰이 필요한 화면을
 * 만드는 방법이 SSR이다 — Supabase 세션 쿠키는 서버에서 읽을 수 있고(@supabase/ssr), 그러면
 * **토큰이 브라우저 코드에 실리지 않고** 로딩 상태를 쥐는 훅도 필요 없다. 클라이언트 조회로
 * 가면 이 앱에 처음으로 데이터 페칭 상태 기계가 생기는데, 화면 하나 때문에 그것을 들일 이유가
 * 없다. 대신 access token 갱신을 미들웨어가 이 경로에서만 맡는다(src/middleware.ts).
 *
 * ── 조회를 나란히 두 번 하는 이유 ───────────────────────────────
 * `/v1/auth/session`은 미가입자에게도 200을 준다. 그래서 **가입 안내를 오류로 배우지 않아도**
 * 된다 — 신청 목록이 403으로 깨지기를 기다리는 대신 세션이 곧바로 답한다. 두 요청은 나란히
 * 보내므로 왕복 시간이 늘지 않는다(목록 화면이 필터 칩을 위해 두 번 조회하는 것과 같은 방식).
 *
 * ── 리다이렉트를 하지 않는다 ────────────────────────────────────
 * 미로그인·미가입 모두 **이 화면 안에서** 안내한다. 이 앱에는 로그인 화면도 가입 폼도 없어
 * 보낼 곳이 없고, 억지로 어딘가로 보내면 되돌아올 곳이 없어 왕복만 도는 길이 생긴다.
 */
export async function MyApplicationsPage({ loginError }: { loginError: string | null }) {
  const token = await currentAccessToken();

  return (
    <div className="flex flex-col gap-[16px]">
      <header className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-medium tracking-[-.3px] lg:text-[24px]">내 신청</h1>
        <p className="text-[13.5px] text-n500">
          신청한 행사의 진행 상황을 이 화면에서 확인할 수 있습니다
        </p>
      </header>

      {loginError && (
        <Notice title={loginErrorMessage(loginError)}>
          <SignInButton next={ROUTES.myApplications} label="다시 로그인" />
        </Notice>
      )}

      {token ? <SignedInBody /> : !loginError && <SignedOutNotice />}
    </div>
  );
}

/** 아직 로그인하지 않았다 — 이 화면의 기본 상태이지 오류가 아니다 */
function SignedOutNotice() {
  return (
    <Notice
      title="로그인하면 신청 현황을 볼 수 있습니다"
      description="행사 목록과 상세는 로그인 없이 볼 수 있습니다. 신청 결과는 본인만 볼 수 있어 로그인이 필요합니다."
    >
      <SignInButton next={ROUTES.myApplications} label="구글로 로그인" />
    </Notice>
  );
}

/**
 * 인증은 됐지만 아직 회원이 아니다.
 *
 * **가입 화면으로 보내지 않는다** — 이 앱에는 가입 폼이 없다(#150 범위 밖). 어드민 오리진이
 * 설정돼 있으면 그쪽 가입 화면을 링크로 열어 주고, 없으면 문구만 남긴다. 없는 화면으로 보내
 * 404를 만들거나, 가입할 곳이 없는 앱 안에서 리다이렉트를 돌리지 않기 위해서다.
 */
function SignupRequiredNotice() {
  const signup = signupUrl();

  return (
    <Notice
      title="회원 가입을 마쳐야 신청 현황을 볼 수 있습니다"
      description="로그인은 되었지만 아직 동아리 회원으로 등록되지 않았습니다. 가입을 마친 뒤 이 화면을 다시 열어 주세요."
    >
      {signup && (
        <a
          href={signup}
          className="rounded-xl bg-accent px-[16px] py-[12px] text-[15px] font-semibold text-white transition-colors hover:bg-accent-strong"
        >
          가입하러 가기
        </a>
      )}
    </Notice>
  );
}

/** 토큰은 있는데 서버가 받아 주지 않았다 — 대개 만료다 */
function SessionExpiredNotice() {
  return (
    <Notice
      title="로그인이 만료되었습니다"
      description="보안을 위해 일정 시간이 지나면 로그인이 풀립니다. 다시 로그인하면 신청 현황을 이어서 볼 수 있습니다."
    >
      <SignInButton next={ROUTES.myApplications} label="다시 로그인" />
    </Notice>
  );
}

async function SignedInBody() {
  /*
   * 한쪽이 실패해도 다른 쪽의 답은 쓴다 — allSettled인 이유다. 세션이 "미가입"이라고 답하면
   * 신청 목록이 403으로 깨진 것은 당연한 결과이므로 오류로 그리지 않고 가입 안내를 그린다.
   */
  const [sessionResult, applicationsResult] = await Promise.allSettled([
    fetchAuthSession(),
    fetchMyApplications(),
  ]);

  const session: AuthSession | null =
    sessionResult.status === "fulfilled" ? sessionResult.value : null;

  if (session && !session.signedUp) return <SignupRequiredNotice />;

  if (applicationsResult.status === "rejected") {
    const reason = applicationsResult.reason;
    if (isSignupRequired(reason)) return <SignupRequiredNotice />;
    if (isUnauthenticated(reason)) return <SessionExpiredNotice />;
    return <EmptyState title={myApplicationsErrorMessage(reason)} />;
  }

  return <ApplicationList applications={applicationsResult.value} session={session} />;
}

function ApplicationList({
  applications,
  session,
}: {
  applications: MyApplication[];
  session: AuthSession | null;
}) {
  /*
   * 어느 계정으로 보고 있는지 밝힌다. 구글 계정을 둘 이상 쓰는 사람이 빈 목록을 보고 "신청이
   * 사라졌다"고 읽는 것을 막는 것이 목적이라, 목록이 비었을 때도 함께 남긴다.
   * 회원 이름이 있으면 그것을, 없으면 로그인한 계정의 이메일을 쓴다.
   */
  const account = session?.member?.name ?? session?.authUser.email ?? null;

  return (
    <div className="flex flex-col gap-[12px]">
      {account && (
        <p className="text-[13px] text-n500">{account} 계정으로 보고 있습니다</p>
      )}

      {applications.length === 0 ? (
        <EmptyState
          title="아직 신청한 행사가 없습니다"
          description="행사 목록에서 모집 중인 행사를 확인해 보세요"
        />
      ) : (
        <div className="flex flex-col gap-[12px]">
          {applications.map((application) => (
            <ApplicationCard
              key={`${application.eventId}-${application.formRspnsId ?? application.eventPtcpId ?? "none"}`}
              application={application}
            />
          ))}
        </div>
      )}
    </div>
  );
}
