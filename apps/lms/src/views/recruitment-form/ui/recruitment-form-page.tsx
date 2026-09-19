import Link from "next/link";
import { BackToProgramsNotice, ProgramSignupNotice } from "@/features/academic-program";
import { LoginGate } from "@/features/auth";
import { loadRecruitmentForm } from "@/features/form/model/load-recruitment-form";
import { receiptStatusBadge } from "@/entities/form";
import { acdmActvTypeNm } from "@/entities/academic-program";
import { ROUTES } from "@/shared/config/routes";
import { Badge } from "@/shared/ui";
import { RecruitmentFormEditor } from "./recruitment-form-editor";

/*
 * 지원서 문항 편집·보기 (#528 · ssccops-server#483 ·
 * `GET·PUT /v1/academic-programs/{id}/recruitment/form`).
 *
 * ── SSR 셸 + 클라이언트 폼 ─────────────────────────────────
 * 조회 결과가 `ready`가 되기 전에는 `RecruitmentFormEditor`를 마운트하지 않는다 — `useState`
 * 초깃값이 곧 편집기의 초깃값이라 **비동기 로딩을 기다리는 `useEffect` 동기화가 없다**
 * (#128 회차 기록·업무 수정 화면이 세운 패턴).
 *
 * ── 한 화면이 «편집»과 «보기» 둘로 쓰인다 ───────────────────
 * 서버가 창이 닫혀도 200에 문항을 그대로 주고 `isEditable`만 false로 내린다. 접수가 시작된
 * 뒤에도 리더는 자기 공고에 무엇을 물었는지 볼 수 있어야 하기 때문이다 — 그래서 화면을
 * 감추지 않고 잠근다(«이동은 감추고, 동작은 잠근다»).
 *
 * ── 모집 일정은 읽기 전용이다 (#528 요구 3) ──────────────────
 * 접수 시작·종료 일시를 이 화면에서 바꿀 수 없다. 서버가 본문에서 받지 않으므로 덮어쓸
 * 길이 애초에 없고(첫 번째 방어선), 화면은 그 값을 입력란 모양으로 보여 주되 잠그고 누가
 * 정하는지 밝힌다(두 번째).
 */

export async function RecruitmentFormPage({
  academicProgramId,
}: Readonly<{ academicProgramId: number | null }>) {
  if (academicProgramId == null) {
    return (
      <BackToProgramsNotice
        title="어떤 활동의 지원서인지 알 수 없습니다"
        description="모집 관리에서 활동을 골라주세요."
      />
    );
  }

  const load = await loadRecruitmentForm(academicProgramId);

  if (load.outcome === "unauthenticated") {
    return (
      <LoginGate
        title="로그인이 필요합니다"
        description="지원서는 로그인한 회원만 볼 수 있습니다 — 구글 계정으로 로그인해주세요"
      />
    );
  }
  if (load.outcome === "signup-required") return <ProgramSignupNotice />;
  if (load.outcome === "error") {
    return (
      <BackToProgramsNotice title="지원서를 불러오지 못했습니다" description={load.message} />
    );
  }

  const { view, program } = load;
  const badge = receiptStatusBadge(view.form.receiptStatus);

  return (
    <div className="flex flex-col gap-[16px]">
      <Link href={ROUTES.studioRecruitment} className="self-start text-[14px] text-n400 hover:text-ink">
        ← 모집 관리
      </Link>

      <header className="rounded-[14px] border border-line bg-surface p-[16px]">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={badge.tone}>{badge.label}</Badge>
          {program && (
            <Badge tone="outline">{acdmActvTypeNm(program.typeCd)}</Badge>
          )}
          <div className="flex-1" />
          <div className="text-[13px] text-n500">문항 버전 v{view.form.qitemVer}</div>
        </div>
        {/*
          머리글은 활동명을 쓴다. 폼 제목(«{행사명} 모집»)은 이관이 파생한 사본이라 활동명이
          정본이다 — 활동 목록 조회가 실패했으면 폼 제목으로 떨어뜨린다.
        */}
        <h1 className="mt-3 text-[22px] font-medium tracking-[-.3px] lg:text-[24px]">
          {program?.title || view.form.formTtlNm || "-"}
        </h1>
        <p className="mt-[2px] text-[13.5px] text-n500">
          지원자에게 받을 응답 폼
          {program?.leaderName ? ` · ${program.leaderName}` : ""}
        </p>
      </header>

      <RecruitmentFormEditor academicProgramId={academicProgramId} initialView={view} />
    </div>
  );
}
