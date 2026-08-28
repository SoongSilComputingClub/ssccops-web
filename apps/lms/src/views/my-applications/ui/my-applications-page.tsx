import { loadMyApplications } from "@/features/proposal";
import { LoginGate } from "@/features/auth";
import { signupUrl } from "@/shared/config/routes";
import { EmptyState, Notice } from "@/shared/ui";
import { SubmissionCard } from "./submission-card";

/*
 * 기획안 제출 현황 (#171 · SSR).
 *
 * ── 무엇을 하는 화면인가 ────────────────────────────────────
 * 회원이 자기가 낸 기획안의 상태를 훑고, 카드에서 상세(검토 이력·재제출)로 들어가는 화면이다.
 * 지금까지 무엇이 접수됐고 왜 안 됐는지는 카카오톡·구두에만 남아 아무도 되짚을 수 없었다.
 *
 * ── 왜 SSR인가 ────────────────────────────────────────────
 * 이 앱은 조회를 서버 컴포넌트로 그린다(AGENTS.md · www·#128). 쿠키의 Supabase 세션을
 * 서버에서 읽으면 토큰이 브라우저 코드에 실리지 않고 데이터 페칭 상태 기계도 필요 없다.
 * 미들웨어가 이 경로에서 세션 갱신을 맡는다(src/middleware.ts는 전 경로를 잡는다).
 *
 * ── 리다이렉트를 하지 않는다 ──────────────────────────────
 * 미로그인·미가입 모두 이 화면 안에서 안내한다 — 이 앱에는 로그인 화면도 가입 폼도 없어
 * 보낼 곳이 없다(www 규약).
 */

export async function MyApplicationsPage() {
  const result = await loadMyApplications();

  return (
    <div className="flex flex-col gap-[16px]">
      <header className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-medium tracking-[-.3px] lg:text-[24px]">
          기획안 제출 현황
        </h1>
        <p className="text-[13.5px] text-n500">
          낸 기획안과 학술국장 검토 상태를 이 화면에서 확인할 수 있습니다
        </p>
      </header>

      <Body result={result} />
    </div>
  );
}

function Body({
  result,
}: {
  result: Awaited<ReturnType<typeof loadMyApplications>>;
}) {
  if (result.outcome === "unauthenticated") {
    return (
      <LoginGate
        title="로그인이 필요합니다"
        description="기획안 제출 현황은 로그인한 회원만 볼 수 있습니다 — 구글 계정으로 로그인해 주세요"
      />
    );
  }

  if (result.outcome === "signup-required") {
    const signup = signupUrl();
    return (
      <Notice
        title="회원 가입을 마쳐야 기획안을 낼 수 있습니다"
        description="로그인은 되었지만 아직 동아리 회원으로 등록되지 않았습니다."
      >
        {signup && (
          <a
            href={signup}
            className="rounded-xl bg-accent px-[16px] py-[12px] text-[15px] font-semibold text-white hover:bg-accent-strong"
          >
            회원 가입하기
          </a>
        )}
      </Notice>
    );
  }

  if (result.outcome === "not-seeded") {
    return (
      <EmptyState
        title="기획안 폼이 아직 준비되지 않았습니다"
        description="운영진이 기획안 접수를 시작하면 이 화면에서 작성·확인할 수 있습니다."
      />
    );
  }

  if (result.outcome === "error") {
    return (
      <EmptyState title="제출 현황을 불러오지 못했습니다" description={result.message} />
    );
  }

  if (result.responses.length === 0) {
    return (
      <EmptyState
        title="아직 낸 기획안이 없습니다"
        description="기획안 작성 화면에서 기획안을 내면 여기에서 검토 상태를 확인할 수 있습니다."
      />
    );
  }

  return (
    <div className="flex flex-col gap-[10px]">
      {result.responses.map((response) => (
        <SubmissionCard key={response.formRspnsId} response={response} />
      ))}
    </div>
  );
}
