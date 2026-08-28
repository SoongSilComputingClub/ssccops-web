import Link from "next/link";
import {
  loadProposalForm,
  PROPOSAL_NOT_ACCEPTING_DESCRIPTION,
  PROPOSAL_NOT_ACCEPTING_TITLE,
} from "@/features/proposal";
import { LoginGate } from "@/features/auth";
import { ROUTES, signupUrl } from "@/shared/config/routes";
import { EmptyState, Notice } from "@/shared/ui";
import { ProposalForm } from "./proposal-form";

/*
 * 기획안 신규 작성 (/proposals/new · #185 · SSR 셸 + 클라이언트 작성 폼).
 *
 * ── 무엇을 하는 화면인가 ────────────────────────────────────
 * 회원이 스터디·프로젝트 기획안을 새로 작성해 학술국장에게 낸다. 지금까지는 카카오톡·구두로
 * 제안이 오가 무엇이 접수됐고 왜 안 됐는지 아무도 되짚을 수 없었다 — 이 화면이 그 입구다.
 *
 * ── 이미 있는 것을 쓴다 ────────────────────────────────────
 * 기획안 폼은 시드된 시스템 폼(`sys_form_cd = 'PROPOSAL'`)이고 문항·검증·자동 저장·제출은
 * 공개 폼 경로 그대로다. 여기서 하는 일은 셋뿐이다 — 폼을 코드로 찾고(주소에 번호가 없다),
 * 접수 중이 아니면 이 화면의 말로 안내하고, 제출한 뒤 제출 현황으로 보낸다.
 *
 * ── 이미 냈어도 화면이 닫히지 않는다 ────────────────────────
 * 기획안 폼은 `mltplRspnsYn = true`라 한 사람이 여러 건을 낸다. 화면에 따로 분기를 두지
 * 않는 것은 서버가 "더 낼 수 없는가"를 판정해 내려주기 때문이다 — 웹이 같은 판정을 다시
 * 적으면 규칙이 두 벌이 된다.
 *
 * ── 리다이렉트를 하지 않는다 ──────────────────────────────
 * 미로그인·미가입 모두 이 화면 안에서 안내한다 — 이 앱에는 로그인 화면도 가입 폼도 없다.
 */
export async function ProposalNewPage() {
  const result = await loadProposalForm();

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-[16px]">
      <header className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-medium tracking-[-.3px] lg:text-[24px]">
          기획안 작성
        </h1>
        <p className="text-[13.5px] text-n500">
          스터디·프로젝트 기획안을 작성해 학술국장에게 제출합니다
        </p>
      </header>

      <Body result={result} />
    </div>
  );
}

function Body({
  result,
}: {
  result: Awaited<ReturnType<typeof loadProposalForm>>;
}) {
  if (result.outcome === "unauthenticated") {
    return (
      <LoginGate
        title="로그인이 필요합니다"
        description="기획안은 로그인한 회원만 작성할 수 있습니다 — 구글 계정으로 로그인해 주세요"
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
        description="운영진이 기획안 접수를 시작하면 이 화면에서 작성해 제출할 수 있습니다."
      />
    );
  }

  if (result.outcome === "error") {
    return (
      <EmptyState title="기획안 폼을 불러오지 못했습니다" description={result.message} />
    );
  }

  /*
   * 접수 중이 아닌 것은 기획안 폼에서 정상 상태일 수 있다 — 시드 직후 작성 중이고 접수
   * 기간이 비어 있다. 화면이 미리 잠글 때와 제출 순간 서버가 409로 거절할 때가 같은 문장이다.
   */
  if (!result.acceptingYn) {
    return (
      <Notice
        title={PROPOSAL_NOT_ACCEPTING_TITLE}
        description={PROPOSAL_NOT_ACCEPTING_DESCRIPTION}
      >
        <Link
          href={ROUTES.myApplications}
          className="text-[13.5px] text-accent hover:underline"
        >
          이미 낸 기획안 보기
        </Link>
      </Notice>
    );
  }

  return <ProposalForm formId={result.formId} composition={result.qitemCpstCn} />;
}
