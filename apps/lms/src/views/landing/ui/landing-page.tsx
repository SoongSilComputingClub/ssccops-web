import type { ReactNode } from "react";
import Link from "next/link";
import type { LandingLoad } from "@/features/academic-program/model/load-landing";
import { LoginGate } from "@/features/auth";
import { ROUTES, signupUrl } from "@/shared/config/routes";
import { Card, Notice } from "@/shared/ui";

/*
 * 첫 화면 — 무엇을 하러 왔는지 고르는 자리 (#228).
 *
 * ── 왜 생겼나 ──────────────────────────────────────────────
 * 전에는 `/`가 `/studio`(학술 대시보드)로 곧장 넘겼다. 상단 바가 역할별로 갈리고 나니(#224)
 * 일반 회원의 첫 화면이 **제목은 "학술 대시보드"인데 본문은 "맡고 있는 스터디·프로젝트가
 * 없습니다"**가 되어, 자기와 상관없는 화면에 도착한 것처럼 보였다. 대시보드를 고치는 대신
 * 그 앞에 고르는 화면을 두었다 — `/studio`는 대시보드 그대로다.
 *
 * ── 스터디장은 그냥 지나간다 ─────────────────────────────────
 * 매일 대시보드를 여는 사람에게 한 번 더 누르게 하지 않는다(페이지가 `redirect`). 랜딩은
 * **역할을 묻지 않는다** — `leader`는 여기 닿기 전에 걸러지고, 이 뷰는 남은 세 상태만 그린다.
 * 뷰 안에 역할 조건문을 흩지 않는다(#126 결정과 같은 태도).
 *
 * 로더를 여기서 부르지 않고 결과를 prop으로 받는 것은 페이지가 그 결과로 리다이렉트까지
 * 하기 때문이다 — 양쪽이 각자 부르면 `no-store`라 요청이 두 번 나간다.
 *
 * ── 미가입자에게는 카드를 내밀지 않는다 ────────────────────────
 * 기획안 제출도 회원이어야 하므로 두 카드가 다 막힌다. 가입 안내가 먼저다(대시보드의
 * `SignupNotice`와 같은 문구 구조).
 *
 * ── 대시보드 카드를 두지 않는다 ───────────────────────────────
 * 스터디장은 이 화면에 닿기 전에 `/studio`로 넘어가므로, **여기 있는 사람은 정의상 스터디장이
 * 아니다** — 대시보드 카드를 눌러 봐야 "맡고 있는 스터디·프로젝트가 없습니다"만 나온다.
 * 갈 수 없는 곳을 크게 세워 두지 않는다(#224가 상단 바에서 한 것과 같은 판단). 그래서 두 카드는
 * 상단 바의 `MEMBER` 항목 둘과 정확히 같다 — 이 사람이 지금 할 수 있는 일이 그 둘이다.
 * 활동을 맡게 되면 이 화면 자체를 지나치게 되므로 카드를 다시 세울 일도 없다.
 */
export function LandingPage({ result }: { result: LandingLoad }) {
  if (result.outcome === "unauthenticated") {
    return (
      <Shell>
        <LoginGate
          title="로그인이 필요합니다"
          description="학술 화면은 로그인한 회원만 볼 수 있습니다 — 구글 계정으로 로그인해 주세요"
        />
      </Shell>
    );
  }

  if (result.outcome === "signup-required") {
    return (
      <Shell>
        <SignupNotice />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="grid gap-[14px] lg:grid-cols-2">
        <ActionCard
          href={ROUTES.proposalNew}
          title="기획안 제출"
          description="새 스터디·프로젝트를 제안합니다."
          cta="기획안 쓰기"
        />
        <ActionCard
          href={ROUTES.myApplications}
          title="기획안 제출 현황"
          description="내가 낸 기획안과 처리 상태를 확인합니다."
          cta="현황 보기"
        />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[16px]">
      <header className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-medium tracking-[-.3px] lg:text-[24px]">SSCC 학술</h1>
        <p className="text-[13.5px] text-n500">
          스터디·프로젝트 활동과 회차·출석, 기획안 제출
        </p>
      </header>
      {children}
    </div>
  );
}

/**
 * 첫 화면의 큰 버튼 한 장.
 *
 * 카드 전체가 링크다 — 좁은 화면에서 작은 글자 링크를 겨누게 하지 않는다. `block`으로 둔 것도
 * 같은 이유이고, 안쪽 `cta`는 누를 곳을 눈에 띄게 하는 표시일 뿐 따로 링크를 겹치지 않는다
 * (링크 안에 링크를 넣으면 마크업이 무효가 된다).
 */
function ActionCard({
  href,
  title,
  description,
  cta,
}: {
  href: string;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <Link href={href} className="block rounded-2xl focus:outline-accent">
      <Card className="flex h-full flex-col gap-[8px] px-[20px] py-[24px] transition-shadow hover:shadow-[0_0_0_1px_var(--color-accent)]">
        <div className="text-[17px] font-semibold text-ink lg:text-[18px]">{title}</div>
        <p className="text-[13.5px] leading-[1.6] text-n500">{description}</p>
        <span className="mt-[6px] text-[14px] font-semibold text-accent">{cta} →</span>
      </Card>
    </Link>
  );
}

/** 대시보드의 같은 이름 컴포넌트와 문구 구조를 맞춘다 — 같은 상황에는 같은 안내를 쓴다 */
function SignupNotice() {
  const signup = signupUrl();
  return (
    <Notice
      title="회원 가입을 마쳐야 학술 화면을 볼 수 있습니다"
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
