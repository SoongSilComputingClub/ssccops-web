import type { ReactNode } from "react";
import Link from "next/link";
import { ProgramSignupNotice } from "@/features/academic-program";
import { LoginGate } from "@/features/auth";
import { loadRecruitmentApplication } from "@/features/form/model/load-recruitment-applications";
import { selectionBadge, type AcademicProgramSummary } from "@/entities/academic-program";
import type { RecruitmentApplicationDetail } from "@/entities/form";
import { RSPNS_STTS_BADGE } from "@/entities/response";
import {
  studioProgramApplicationUrl,
  studioProgramApplicationsUrl,
} from "@/shared/config/routes";
import { formatDt } from "@/shared/lib/date";
import { Badge, Card, Notice } from "@/shared/ui";
import { ApplicationAnswers } from "./application-answers";

/*
 * 지원서 한 건 (#826 · ssccops#625 ·
 * `GET /v1/academic-programs/{id}/recruitment/applications/{formRspnsId}` · server#704).
 *
 * ── 읽기 전용이다 ──────────────────────────────────────────
 * 리더가 지원자의 답을 읽는다. 선발·심사·수정 버튼은 없다 — 선발은 학술국장이 어드민에서 하고, 리더
 * 역할에는 권한을 붙일 수 없다(ADR-0067). 서버도 이 경로를 **리더 한 사람**으로 끊는다(학술 조회
 * 권한 보유자에게는 열지 않는다 · ADR-0068은 국원에게 기획안 응답만 열었다).
 *
 * ── 그리지 않는 것 ─────────────────────────────────────────
 * 연락처와 검토 이력(처리자·검토 의견). 서버 응답에 그 필드가 아예 없다(ssccops#625 사용자 결정).
 * 화면에 남는 것은 응답 상태와 선발 상태 두 배지다.
 *
 * ── 이전·다음은 서버가 준다 ────────────────────────────────
 * 목록과 같은 순서(제출 일시 내림차순)다. 화면이 목록을 들고 다니며 계산하지 않는다 — 주소로 바로
 * 열어도 이동이 산다(어드민 응답 상세와 같은 판단).
 */

export async function RecruitmentApplicationPage({
  academicProgramId,
  formRspnsId,
}: Readonly<{ academicProgramId: number | null; formRspnsId: number | null }>) {
  if (academicProgramId == null) {
    return (
      <Notice
        title="어떤 프로그램의 지원서인지 알 수 없습니다"
        description="모집 관리에서 프로그램을 골라주세요."
      />
    );
  }

  const listHref = studioProgramApplicationsUrl(academicProgramId);

  if (formRspnsId == null) {
    return (
      <Shell listHref={listHref}>
        <BackToListNotice
          listHref={listHref}
          title="어떤 지원서인지 알 수 없습니다"
          description="지원자 목록에서 지원서를 골라주세요."
        />
      </Shell>
    );
  }

  const load = await loadRecruitmentApplication(academicProgramId, formRspnsId);

  if (load.outcome === "unauthenticated") {
    return (
      <Shell listHref={listHref}>
        <LoginGate
          title="로그인이 필요합니다"
          description="지원서는 로그인한 회원만 볼 수 있습니다 — 구글 계정으로 로그인해주세요"
        />
      </Shell>
    );
  }
  if (load.outcome === "signup-required") {
    return (
      <Shell listHref={listHref}>
        <ProgramSignupNotice />
      </Shell>
    );
  }
  if (load.outcome === "error") {
    return (
      <Shell listHref={listHref}>
        <BackToListNotice
          listHref={listHref}
          title="지원서를 불러오지 못했습니다"
          description={load.message}
        />
      </Shell>
    );
  }

  const { detail, program } = load;

  return (
    <Shell listHref={listHref}>
      <ApplicantHeader detail={detail} program={program} />
      <Neighbors academicProgramId={academicProgramId} detail={detail} />
      <ApplicationAnswers composition={detail.qitemCpstCn} rspnsCn={detail.rspnsCn} />
      <Neighbors academicProgramId={academicProgramId} detail={detail} />
    </Shell>
  );
}

function Shell({ listHref, children }: Readonly<{ listHref: string; children: ReactNode }>) {
  return (
    <div className="flex flex-col gap-[16px]">
      <Link href={listHref} className="self-start text-[14px] text-n400 hover:text-ink">
        ← 지원자 목록
      </Link>
      {children}
    </div>
  );
}

function BackToListNotice({
  listHref,
  title,
  description,
}: Readonly<{ listHref: string; title: string; description: string }>) {
  return (
    <Notice title={title} description={description}>
      <Link
        href={listHref}
        className="rounded-xl bg-accent px-[16px] py-[12px] text-[15px] font-semibold text-on-solid hover:bg-accent-strong"
      >
        지원자 목록으로
      </Link>
    </Notice>
  );
}

/** «20231234 · 컴퓨터학부 · 12기 · 3학년» — 없는 값은 빼고 잇는다(«미배정» 같은 말을 지어내지 않는다) */
function applicantMeta(detail: RecruitmentApplicationDetail): string {
  const { studentNo, subjectName, generationNumber, academicYear } = detail.applicant;
  return [
    studentNo,
    subjectName,
    generationNumber ? `${generationNumber}기` : null,
    academicYear ? `${academicYear}학년` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function ApplicantHeader({
  detail,
  program,
}: Readonly<{ detail: RecruitmentApplicationDetail; program: AcademicProgramSummary | null }>) {
  const status = RSPNS_STTS_BADGE[detail.rspnsSttsCd];
  const selection = selectionBadge(detail.ptcpSttsCd);
  const meta = applicantMeta(detail);

  return (
    <Card className="flex flex-col gap-[8px]">
      {program?.title && <div className="text-[13px] text-n500">{program.title} 지원서</div>}
      <div className="flex flex-wrap items-center gap-x-[8px] gap-y-[4px]">
        <h1 className="text-[20px] font-semibold tracking-[-.3px]">
          {detail.applicant.memberName || "-"}
        </h1>
        <Badge tone={status.tone}>{status.label}</Badge>
        <Badge tone={selection.tone}>{selection.label}</Badge>
      </div>
      {meta && <div className="text-[13.5px] text-n400">{meta}</div>}
      <div className="text-[13px] text-n500">
        {detail.sbmsnDt ? `제출 ${formatDt(detail.sbmsnDt)}` : "제출 일시 없음"}
        {detail.rspnsSeq !== null && detail.rspnsSeq >= 2 ? ` · ${detail.rspnsSeq}번째 지원` : ""}
      </div>
    </Card>
  );
}

/*
 * 이전·다음 — 끝이면 그 쪽을 흐리게 남긴다(자리가 사라지면 다른 쪽 버튼이 옮겨 다닌다).
 * 답이 길어 아래까지 읽은 사람도 위로 올라가지 않게 답변 위아래에 같은 줄을 둔다.
 */
function Neighbors({
  academicProgramId,
  detail,
}: Readonly<{ academicProgramId: number; detail: RecruitmentApplicationDetail }>) {
  if (detail.prevFormRspnsId === null && detail.nextFormRspnsId === null) return null;

  return (
    <nav aria-label="지원서 이동" className="flex items-center justify-between gap-[8px]">
      <NeighborLink
        academicProgramId={academicProgramId}
        formRspnsId={detail.prevFormRspnsId}
        label="‹ 이전 지원서"
      />
      <NeighborLink
        academicProgramId={academicProgramId}
        formRspnsId={detail.nextFormRspnsId}
        label="다음 지원서 ›"
      />
    </nav>
  );
}

function NeighborLink({
  academicProgramId,
  formRspnsId,
  label,
}: Readonly<{ academicProgramId: number; formRspnsId: number | null; label: string }>) {
  const base = "rounded-[10px] px-[14px] py-[8px] text-[14px]";
  if (formRspnsId === null) {
    return (
      <span aria-disabled="true" className={`${base} text-n500 opacity-60`}>
        {label}
      </span>
    );
  }
  return (
    <Link
      href={studioProgramApplicationUrl(academicProgramId, formRspnsId)}
      className={`${base} text-ink shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:text-accent`}
    >
      {label}
    </Link>
  );
}
