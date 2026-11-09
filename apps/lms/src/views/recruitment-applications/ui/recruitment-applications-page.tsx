import type { ReactNode } from "react";
import Link from "next/link";
import { ProgramSignupNotice } from "@/features/academic-program";
import { LoginGate } from "@/features/auth";
import { loadRecruitmentApplications } from "@/features/form/model/load-recruitment-applications";
import { acdmActvTypeNm, type AcademicProgramSummary } from "@/entities/academic-program";
import { receiptStatusBadge, type RecruitmentApplication } from "@/entities/form";
import { ROUTES } from "@/shared/config/routes";
import { Badge, EmptyState, Notice } from "@/shared/ui";
import { ApplicationCardMobile, ApplicationRowDesktop } from "./application-row";

/*
 * 지원자 목록 (#826 · ssccops#625 · `GET /v1/academic-programs/{id}/recruitment/applications`).
 *
 * ── 무엇을 하는 화면인가 ────────────────────────────────────
 * 리더(스터디장·프로젝트장·트랙장)가 자기 프로그램에 들어온 지원서를 **읽기만** 한다. 그전에는
 * 모집 관리 카드에 «지원 N건» 숫자만 있었고, 누가 무엇을 써서 냈는지는 학술국장에게 물어야 했다.
 * 선발·심사 버튼은 없다 — 선발은 학술국장 전용이고(ACADEMIC_PROGRAM_MANAGE · 2026-08-23 확정)
 * 리더 역할에는 권한을 붙일 수 없다(ADR-0067).
 *
 * ── 왜 SSR인가 ────────────────────────────────────────────
 * 조회 화면은 서버 컴포넌트로 그린다(lms AGENTS.md). 토큰을 브라우저에 싣지 않고, 고칠 것이 없는
 * 화면에 상태 기계를 들이지 않는다.
 *
 * ── 무엇을 그리지 않는가 ────────────────────────────────────
 * 연락처와 학술국장의 검토 이력(ssccops#625 사용자 결정). 목록 응답에는 원래 없고, 상세 응답에도
 * 서버가 싣지 않는다(server#704).
 */

export async function RecruitmentApplicationsPage({
  academicProgramId,
}: Readonly<{ academicProgramId: number | null }>) {
  if (academicProgramId == null) {
    return (
      <Shell>
        <BackToRecruitmentNotice
          title="어떤 프로그램의 지원자인지 알 수 없습니다"
          description="모집 관리에서 프로그램을 골라주세요."
        />
      </Shell>
    );
  }

  const load = await loadRecruitmentApplications(academicProgramId);

  if (load.outcome === "unauthenticated") {
    return (
      <Shell>
        <LoginGate
          title="로그인이 필요합니다"
          description="지원서는 로그인한 회원만 볼 수 있습니다 — 구글 계정으로 로그인해주세요"
        />
      </Shell>
    );
  }
  if (load.outcome === "signup-required") {
    return (
      <Shell>
        <ProgramSignupNotice />
      </Shell>
    );
  }
  if (load.outcome === "error") {
    return (
      <Shell>
        <BackToRecruitmentNotice title="지원자를 불러오지 못했습니다" description={load.message} />
      </Shell>
    );
  }

  return (
    <Shell>
      <Header program={load.program} count={load.applications.length} />
      <ApplicationList academicProgramId={academicProgramId} applications={load.applications} />
    </Shell>
  );
}

function Shell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex flex-col gap-[16px]">
      <Link
        href={ROUTES.studioRecruitment}
        className="self-start text-[14px] text-n400 hover:text-ink"
      >
        ← 모집 관리
      </Link>
      {children}
    </div>
  );
}

function BackToRecruitmentNotice({
  title,
  description,
}: Readonly<{ title: string; description: string }>) {
  return (
    <Notice title={title} description={description}>
      <Link
        href={ROUTES.studioRecruitment}
        className="rounded-xl bg-accent px-[16px] py-[12px] text-[15px] font-semibold text-on-solid hover:bg-accent-strong"
      >
        모집 관리로
      </Link>
    </Notice>
  );
}

/*
 * 머리글은 프로그램명을 쓴다(지원서 문항 화면과 같다). 목록 조회가 실패해 `program`이 없으면 제목은
 * «지원자»로만 둔다 — 지원서 응답에는 프로그램명이 없고, 없는 이름을 지어내지 않는다.
 */
function Header({
  program,
  count,
}: Readonly<{ program: AcademicProgramSummary | null; count: number }>) {
  const receipt = program?.formReceiptStatus ? receiptStatusBadge(program.formReceiptStatus) : null;

  return (
    <header className="rounded-[14px] border border-line bg-surface p-[16px]">
      {program && (
        <div className="flex flex-wrap items-center gap-2">
          {receipt && <Badge tone={receipt.tone}>{receipt.label}</Badge>}
          <Badge tone="outline">{acdmActvTypeNm(program.typeCd)}</Badge>
        </div>
      )}
      <h1 className="mt-3 text-[22px] font-medium tracking-[-.3px] first:mt-0 lg:text-[24px]">
        {program?.title || "지원자"}
      </h1>
      <p className="mt-[2px] text-[13.5px] text-n500">지원서 {count}건</p>
      <p className="mt-3 text-[13.5px] leading-[1.7] text-n400">
        들어온 지원서를 읽을 수 있습니다. 선발은 학술국장이 합니다.
      </p>
    </header>
  );
}

function ApplicationList({
  academicProgramId,
  applications,
}: Readonly<{ academicProgramId: number; applications: RecruitmentApplication[] }>) {
  if (applications.length === 0) {
    return <EmptyState title="아직 들어온 지원서가 없습니다." />;
  }

  return (
    // 팀원 명단(`members-manager.tsx`)과 같은 틀 — 표와 카드가 한 면 위에 놓인다
    <section className="rounded-2xl bg-surface p-[6px] shadow-[0_0_0_1px_var(--color-line)] lg:p-[10px]">
      {/* 데스크톱: 표 */}
      <table className="hidden w-full border-collapse lg:table">
        <thead>
          <tr className="text-left text-[12.5px] font-semibold uppercase tracking-[.4px] text-n500">
            <th className="px-[12px] pb-[10px] pt-[8px]">이름</th>
            <th className="px-[12px] pb-[10px] pt-[8px]">학번</th>
            <th className="px-[12px] pb-[10px] pt-[8px]">학과</th>
            <th className="px-[12px] pb-[10px] pt-[8px]">제출 일시</th>
            <th className="px-[12px] pb-[10px] pt-[8px]">응답 상태</th>
            <th className="px-[12px] pb-[10px] pt-[8px]">선발</th>
            <th className="px-[12px] pb-[10px] pt-[8px]">
              <span className="sr-only">열기</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <ApplicationRowDesktop
              key={app.formRspnsId}
              academicProgramId={academicProgramId}
              app={app}
            />
          ))}
        </tbody>
      </table>

      {/* 모바일: 카드 */}
      <div className="flex flex-col px-[8px] py-[4px] lg:hidden">
        {applications.map((app) => (
          <ApplicationCardMobile
            key={app.formRspnsId}
            academicProgramId={academicProgramId}
            app={app}
          />
        ))}
      </div>
    </section>
  );
}
