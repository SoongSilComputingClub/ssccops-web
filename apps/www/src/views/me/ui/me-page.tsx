import Link from "next/link";
import type { ReactNode } from "react";
import type { AcademicProgramSummary } from "@/entities/academic-program";
// 배럴을 거치지 않는다 — 배럴이 SSR 로더를 재export 하면 클라 번들이 오염된다(각 index.ts 주석)
import { fetchMyLeadingPrograms } from "@/entities/academic-program/api/programs-read";
import {
  fetchMyApplications,
  myApplicationsErrorMessage,
  type MyApplication,
} from "@/entities/application";
import type { MyFormResponseOverview } from "@/entities/form";
import { fetchMyResponsesAcrossForms } from "@/entities/form/api/my-responses-across-forms";
import { fetchAuthSession } from "@/entities/session";
import { NotificationSettings } from "@/features/pwa";
import { ROUTES } from "@/shared/config/routes";
import { EmptyState } from "@/shared/ui";
import { resolveGate } from "../model/gate";
import { lookupProposalForm, proposalFormIdOf } from "../model/proposal-form";
import { HUB_PREVIEW_COUNT, needsAction, needsActionFirst, splitProposals } from "../model/responses";
import { loadReviewOpinions } from "../model/review-opinions";
import { ApplicationCard } from "./application-card";
import { FormResponseCard } from "./form-response-card";
import { AccountLine, GateNotice } from "./gate-notices";
import { MeFrame } from "./me-frame";
import { ProgramCard } from "./program-card";
import { ProposalCard } from "./proposal-card";

/*
 * 내 활동 허브 (SSR · #574 · ssccops#428) — 첫 판 #518의 «한 장»이 이 자리다.
 *
 * 로그인한 부원이 «오늘 내가 할 것»을 훑는 화면. 묶음 넷마다 제목에 건수, 최근 몇 건
 * (`HUB_PREVIEW_COUNT`), «전부 보기»가 있고 전량은 내부 페이지가 그린다.
 *   ① 신청한 행사   `GET /v1/events/my-applications`          → /me/applications
 *   ② 낸 폼         `GET /v1/forms/responses/mine` 중 기획안 밖 → /me/responses
 *   ③ 낸 기획안     같은 목록 중 기획안 폼(`PROPOSAL`) 응답     → /me/proposals · 카드는 lms로
 *   ④ 이끄는 프로그램   `GET /v1/academic-programs?mine=leader`     → /me/programs · 카드는 lms로
 *   ⑤ 푸시 알림       `NotificationSettings`(클라이언트 · #616 · ssccops#453) — 이 기기의 설정, 발치에
 *   ⓪ 다시 제출할 것  ①·②·③ 중 수정 요청(`CHANGES_REQUESTED`)을 받은 것 전부 — **맨 위**, 있을 때만
 *                    (#626 · ssccops#457). 첫 판은 ②·③ 안에서 앞으로 당기기만 했는데 셋째 묶음이라
 *                    첫 화면 아래였고, 카드의 주의 상자는 없는 팔레트 클래스(`amber-50`)라 밋밋한
 *                    글자였다 — 운영진이 «재제출이 필요한지 안 보인다»고 했다. 위에 올린 건은 아래
 *                    묶음의 미리보기에서 뺀다(두 번 보이지 않게). 건수는 묶음 제목에 그대로 남는다.
 * 팀원으로 참여한 활동(`mine=member`가 없다)과 출석 요약은 서버에 없어 이번에도 없다 —
 * ssccops#386에 «API 필요»로 남아 있다. 없는 데이터를 화면이 지어내지 않는다.
 *
 * ── 조회를 나란히 보내는 이유 ───────────────────────────────────
 * `/v1/auth/session`은 미가입자에게도 200을 준다. 그래서 **가입 안내를 오류로 배우지 않아도**
 * 된다 — 목록이 403으로 깨지기를 기다리는 대신 세션이 곧바로 답한다(`model/gate.ts`). 조회는
 * 전부 나란히 보내므로 왕복 시간이 늘지 않고, 한 블록이 실패해도 다른 블록의 답은 쓴다
 * (allSettled). 틀(제목·탭·로그인 문)은 `MeFrame`.
 */
export async function MePage({ loginError }: Readonly<{ loginError: string | null }>) {
  return (
    <MeFrame
      pathname={ROUTES.me}
      description="신청한 행사, 낸 폼과 기획안, 내가 이끄는 학술 프로그램을 이 화면에서 확인할 수 있습니다"
      loginError={loginError}
    >
      <HubBody />
    </MeFrame>
  );
}

async function HubBody() {
  const [sessionResult, applicationsResult, responsesResult, programsResult, proposalForm] =
    await Promise.allSettled([
      fetchAuthSession(),
      fetchMyApplications(),
      fetchMyResponsesAcrossForms(),
      fetchMyLeadingPrograms(),
      lookupProposalForm(),
    ]);

  // 인증 문제는 어느 블록에서 나든 화면 전체의 문제다 — 신청 목록이 그것을 대표한다
  const gate = resolveGate(sessionResult, applicationsResult);
  if (gate.kind !== "ready") return <GateNotice gate={gate} next={ROUTES.me} />;

  const proposalFormId =
    proposalForm.status === "fulfilled" ? proposalFormIdOf(proposalForm.value) : null;
  const split =
    responsesResult.status === "fulfilled"
      ? splitProposals(responsesResult.value, proposalFormId)
      : null;

  const pendingForms = split?.forms.filter(needsAction) ?? [];
  const pendingProposals = split?.proposals.filter(needsAction) ?? [];
  // 행사·학술 프로그램 신청도 수정 요청을 받는다 — 서버 #530이 그 값을 접지 않고 내려준다 (#628)
  const pendingApplications =
    applicationsResult.status === "fulfilled"
      ? applicationsResult.value.filter((a) => a.applicationStatus === "CHANGES_REQUESTED")
      : [];

  return (
    <div className="flex flex-col gap-[24px]">
      <AccountLine session={gate.session} />
      <NeedsActionBlock
        applications={pendingApplications}
        forms={pendingForms}
        proposals={pendingProposals}
      />
      <ApplicationsBlock result={applicationsResult} />
      <ResponsesBlock forms={split?.forms ?? null} />
      <ProposalsBlock proposals={split?.proposals ?? null} />
      <ProgramsBlock result={programsResult} />
      <PushSection />
    </div>
  );
}

/* ── ⓪ 다시 제출할 것 (#626 · ssccops#457) ───────────────────────── */

/*
 * 수정 요청을 받은 응답은 «오늘 내가 할 것»의 첫째다 — 검토가 멈춰 있고 내가 움직여야 풀린다.
 * 미리보기 상한(`HUB_PREVIEW_COUNT`)을 두지 않는다: 이 절에 오는 건은 한두 건이고, 잘라서 못 본
 * 건이 곧 안 낸 건이 된다. 사유는 여기 건에 대해서만 부른다(아래 묶음은 이 건을 빼므로 중복 조회
 * 없음). 하나도 없으면 절 자체가 없다 — 빈 «할 것 없음»은 자리만 차지한다.
 */
async function NeedsActionBlock({
  applications,
  forms,
  proposals,
}: Readonly<{
  applications: MyApplication[];
  forms: MyFormResponseOverview[];
  proposals: MyFormResponseOverview[];
}>) {
  const total = applications.length + forms.length + proposals.length;
  if (total === 0) return null;
  const reviewOpinions = await loadReviewOpinions([...forms, ...proposals]);

  return (
    <section className="flex flex-col gap-[10px]">
      <h2 className="text-[16px] font-semibold tracking-[-.2px]">
        다시 제출할 것
        <span className="ml-[6px] text-[14px] font-medium text-amber">{total}</span>
      </h2>
      <p className="text-[13.5px] text-n500">운영진이 수정을 요청한 응답입니다. 사유를 보고 고쳐서 다시 내주세요.</p>
      <div className="flex flex-col gap-[12px]">
        {applications.map((application) => (
          <ApplicationCard
            key={`${application.eventId}-${application.formRspnsId ?? application.eventPtcpId ?? "none"}`}
            application={application}
          />
        ))}
        {forms.map((response) => (
          <FormResponseCard
            key={response.formRspnsId}
            response={response}
            reviewOpinion={reviewOpinions[response.formRspnsId] ?? null}
          />
        ))}
        {proposals.map((response) => (
          <ProposalCard
            key={response.formRspnsId}
            response={response}
            reviewOpinion={reviewOpinions[response.formRspnsId] ?? null}
          />
        ))}
      </div>
    </section>
  );
}

/* ── ⑤ 푸시 알림 (#616 · ssccops#453) ─────────────────────────── */

/*
 * 이 앱에는 «내 정보» 화면이 따로 없다 — 회원 정보는 어드민 것이고 계정은 계정 메뉴가 보인다. 스위치는
 * «이 기기의 설정»이라 어느 묶음의 부속도 아니어서 허브 발치에 절 하나로 둔다(admin·lms `/my`와 같은
 * 카드 — `@ssccops/pwa/ui` 한 벌, #634). `/notifications` 맨 위에도 같은 카드가 있다(ssccops#461).
 * 로그인한 사람에게만 — 문(`resolveGate`) 안쪽이라 미가입은 여기 오지 않는다.
 */
function PushSection() {
  return (
    <section className="flex flex-col gap-[10px]">
      <h2 className="text-[16px] font-semibold tracking-[-.2px]">알림 설정</h2>
      <NotificationSettings />
    </section>
  );
}

/**
 * 묶음 하나 — 제목(건수) · «전부 보기» · 본문. 건수는 목록을 받았을 때만 붙는다(실패하면 제목만).
 * «전부 보기»는 실패했을 때도 남긴다 — 내부 페이지가 다시 조회하므로 거기서 될 수 있다.
 */
function HubSection({
  title,
  count,
  href,
  children,
}: Readonly<{
  title: string;
  count: number | null;
  href: string;
  children: ReactNode;
}>) {
  return (
    <section className="flex flex-col gap-[10px]">
      <div className="flex items-baseline justify-between gap-[8px]">
        <h2 className="text-[16px] font-semibold tracking-[-.2px]">
          {title}
          {count !== null && (
            <span className="ml-[6px] text-[14px] font-medium text-n500">{count}</span>
          )}
        </h2>
        <Link
          href={href}
          className="whitespace-nowrap text-[13.5px] font-semibold text-accent-strong hover:underline"
        >
          전부 보기 →
        </Link>
      </div>
      {children}
    </section>
  );
}

/* ── ① 신청한 행사 ─────────────────────────────────────────── */

function ApplicationsBlock({
  result,
}: Readonly<{
  result: PromiseSettledResult<MyApplication[]>;
}>) {
  const applications = result.status === "fulfilled" ? result.value : null;
  return (
    <HubSection
      title="신청한 행사"
      count={applications?.length ?? null}
      href={ROUTES.meApplications}
    >
      {result.status === "rejected" ? (
        <EmptyState title={myApplicationsErrorMessage(result.reason)} />
      ) : (
        <ApplicationPreview applications={result.value} />
      )}
    </HubSection>
  );
}

function ApplicationPreview({ applications }: Readonly<{ applications: MyApplication[] }>) {
  if (applications.length === 0) {
    return (
      <EmptyState
        title="아직 신청한 행사가 없습니다"
        description="행사 목록에서 모집 중인 행사를 확인해 보세요"
      />
    );
  }
  // 수정 요청 건은 ⓪이 이미 보였다 — 여기서는 나머지의 최근 몇 건
  const rest = applications.filter((a) => a.applicationStatus !== "CHANGES_REQUESTED");
  return (
    <div className="flex flex-col gap-[12px]">
      {rest.slice(0, HUB_PREVIEW_COUNT).map((application) => (
        <ApplicationCard
          key={`${application.eventId}-${application.formRspnsId ?? application.eventPtcpId ?? "none"}`}
          application={application}
        />
      ))}
    </div>
  );
}

/* ── ② 낸 폼 (ssccops#221) ────────────────────────────────── */

/*
 * 조치가 필요한 건이 먼저 오도록 정렬한 뒤 앞의 몇 건만 — 수정요청을 받은 응답이 허브에서
 * 보이지 않으면 이 화면을 만든 이유가 절반만 달성된다. 사유는 그 몇 건에 대해서만 부른다.
 */
async function ResponsesBlock({
  forms,
}: Readonly<{
  /** 기획안을 뺀 낸 폼 — 조회 실패면 null */
  forms: MyFormResponseOverview[] | null;
}>) {
  if (forms === null) {
    return (
      <HubSection title="낸 폼" count={null} href={ROUTES.meResponses}>
        <EmptyState title="폼 응답을 불러오지 못했습니다 — 잠시 후 다시 시도해주세요" />
      </HubSection>
    );
  }

  // 수정 요청 건은 ⓪이 이미 보였다 — 여기서는 나머지의 최근 몇 건
  const preview = needsActionFirst(forms.filter((r) => !needsAction(r))).slice(0, HUB_PREVIEW_COUNT);
  const reviewOpinions = await loadReviewOpinions(preview);

  return (
    <HubSection title="낸 폼" count={forms.length} href={ROUTES.meResponses}>
      {forms.length === 0 ? (
        <EmptyState
          title="아직 낸 응답이 없습니다"
          description="받은 폼 링크를 열면 이 화면에서 진행 상황을 확인할 수 있습니다"
        />
      ) : (
        <div className="flex flex-col gap-[12px]">
          {preview.map((response) => (
            <FormResponseCard
              key={response.formRspnsId}
              response={response}
              reviewOpinion={reviewOpinions[response.formRspnsId] ?? null}
            />
          ))}
        </div>
      )}
    </HubSection>
  );
}

/* ── ③ 낸 기획안 ─────────────────────────────────────────── */

async function ProposalsBlock({
  proposals,
}: Readonly<{
  /** 기획안 폼 응답 — 응답 조회 실패면 null. 기획안 폼을 모르면 빈 배열(전부 «낸 폼»에 남는다) */
  proposals: MyFormResponseOverview[] | null;
}>) {
  if (proposals === null) {
    return (
      <HubSection title="낸 기획안" count={null} href={ROUTES.meProposals}>
        <EmptyState title="기획안을 불러오지 못했습니다 — 잠시 후 다시 시도해주세요" />
      </HubSection>
    );
  }

  // 수정 요청 건은 ⓪이 이미 보였다
  const preview = needsActionFirst(proposals.filter((r) => !needsAction(r))).slice(0, HUB_PREVIEW_COUNT);
  const reviewOpinions = await loadReviewOpinions(preview);

  return (
    <HubSection title="낸 기획안" count={proposals.length} href={ROUTES.meProposals}>
      {proposals.length === 0 ? (
        <EmptyState title="아직 낸 기획안이 없습니다" />
      ) : (
        <div className="flex flex-col gap-[12px]">
          {preview.map((response) => (
            <ProposalCard
              key={response.formRspnsId}
              response={response}
              reviewOpinion={reviewOpinions[response.formRspnsId] ?? null}
            />
          ))}
        </div>
      )}
    </HubSection>
  );
}

/* ── ④ 내가 이끄는 학술 프로그램 ──────────────────────────────── */

/*
 * 빈 목록은 실패가 아니다: 스터디장/팀장이 아닌 부원이 대부분이라 «없음»이 이 블록의 흔한 상태다.
 */
function ProgramsBlock({
  result,
}: Readonly<{
  result: PromiseSettledResult<AcademicProgramSummary[]>;
}>) {
  const programs = result.status === "fulfilled" ? result.value : null;
  return (
    <HubSection title="이끄는 프로그램" count={programs?.length ?? null} href={ROUTES.mePrograms}>
      {programs === null ? (
        <EmptyState title="프로그램을 불러오지 못했습니다 — 잠시 후 다시 시도해주세요" />
      ) : programs.length === 0 ? (
        <EmptyState title="이끄는 프로그램이 없습니다" />
      ) : (
        <div className="flex flex-col gap-[12px]">
          {programs.slice(0, HUB_PREVIEW_COUNT).map((program) => (
            <ProgramCard key={program.academicProgramId} program={program} />
          ))}
        </div>
      )}
    </HubSection>
  );
}
