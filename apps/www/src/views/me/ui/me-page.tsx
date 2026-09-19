import type { AcademicProgramSummary } from "@/entities/academic-program";
// 배럴을 거치지 않는다 — 배럴이 SSR 로더를 재export 하면 클라 번들이 오염된다(각 index.ts 주석)
import { fetchMyLeadingPrograms } from "@/entities/academic-program/api/programs-read";
import {
  fetchMyApplications,
  myApplicationsErrorMessage,
  type MyApplication,
} from "@/entities/application";
import { PROPOSAL_SYS_FORM_CD, type MyFormResponseOverview } from "@/entities/form";
import { fetchMyResponseDetail } from "@/entities/form/api/my-response-detail";
import { fetchMyResponsesAcrossForms } from "@/entities/form/api/my-responses-across-forms";
import { fetchSystemForm } from "@/entities/form/api/system-form";
import { fetchAuthSession, loginErrorMessage, type AuthSession } from "@/entities/session";
import {
  currentAccessToken,
  isSignupRequired,
  isUnauthenticated,
} from "@/shared/api/authed-client";
import { SignInButton } from "@/features/auth";
import { ROUTES } from "@/shared/config/routes";
import { EmptyState, Notice } from "@/shared/ui";
import { ApplicationCard } from "./application-card";
import { InlineSignup } from "./inline-signup";
import { FormResponsesSection } from "./form-responses-section";
import { ProgramCard } from "./program-card";

/*
 * 내 활동 (SSR · #518 · ssccops#386) — `/my-applications`(wave2 D10)가 여기로 이사했다.
 *
 * 로그인한 부원이 «오늘 내가 할 것»을 한 화면에서 본다. 블록은 셋이다.
 *   ① 신청한 행사       `GET /v1/events/my-applications`
 *   ② 낸 폼             `GET /v1/forms/responses/mine` — 기획안 폼 응답에는 «기획안» 칩
 *   ③ 내가 이끄는 활동  `GET /v1/academic-programs?mine=leader` — 카드는 lms로 간다
 * 팀원으로 참여한 활동(`mine=member`가 없다)과 출석 요약은 서버에 없어 이번에 없다 —
 * ssccops#386에 «API 필요»로 남긴다. 없는 데이터를 화면이 지어내지 않는다.
 *
 * ── 왜 SSR인가 ────────────────────────────────────────────────
 * 이 앱은 전 화면이 서버 컴포넌트다(#141). 그 규약을 따르면서 사용자 토큰이 필요한 화면을
 * 만드는 방법이 SSR이다 — Supabase 세션 쿠키는 서버에서 읽을 수 있고(@supabase/ssr), 그러면
 * **토큰이 브라우저 코드에 실리지 않고** 로딩 상태를 쥐는 훅도 필요 없다. 클라이언트 조회로
 * 가면 이 앱에 처음으로 데이터 페칭 상태 기계가 생기는데, 화면 하나 때문에 그것을 들일 이유가
 * 없다. 대신 access token 갱신을 미들웨어가 이 경로에서만 맡는다(src/middleware.ts).
 *
 * ── 조회를 나란히 보내는 이유 ───────────────────────────────────
 * `/v1/auth/session`은 미가입자에게도 200을 준다. 그래서 **가입 안내를 오류로 배우지 않아도**
 * 된다 — 목록이 403으로 깨지기를 기다리는 대신 세션이 곧바로 답한다. 블록 조회는 전부 나란히
 * 보내므로 왕복 시간이 늘지 않는다.
 *
 * ── 리다이렉트를 하지 않는다 ────────────────────────────────────
 * 미로그인·미가입 모두 **이 화면 안에서** 안내하고, 가입도 이 자리에서 한다(#451 —
 * `InlineSignup`). 억지로 어딘가로 보내면 되돌아올 곳이 없어 왕복만 도는 길이 생기고, 어드민
 * 도메인으로 보내던 링크는 부원에게 운영 도메인을 드러냈다. 옛 주소 `/my-applications`의
 * 이동은 화면이 아니라 `next.config.ts`의 정적 redirect가 한다 — 401·403 규칙과 무관하다.
 */
export async function MePage({ loginError }: Readonly<{ loginError: string | null }>) {
  const token = await currentAccessToken();

  return (
    <div className="flex flex-col gap-[16px]">
      <header className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-medium tracking-[-.3px] lg:text-[24px]">내 활동</h1>
        <p className="text-[13.5px] text-n500">
          신청한 행사, 낸 폼, 내가 이끄는 스터디·프로젝트를 이 화면에서 확인할 수 있습니다
        </p>
      </header>

      {loginError && (
        <Notice title={loginErrorMessage(loginError)}>
          <SignInButton next={ROUTES.me} label="다시 로그인" />
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
      title="로그인하면 내 활동을 볼 수 있습니다"
      description="신청 결과와 활동은 본인만 볼 수 있어 로그인이 필요합니다."
    >
      <SignInButton next={ROUTES.me} label="구글로 로그인" />
    </Notice>
  );
}

/**
 * 인증은 됐지만 아직 회원이 아니다 — 안내와 가입 폼은 `InlineSignup`(클라이언트)이 든다.
 * 어드민 가입 화면으로 보내던 링크는 #451에서 걷어냈다(부원에게 운영 도메인이 노출됐다).
 * 세션을 못 읽은 채 목록만 403으로 온 경우엔 이메일·이름 없이 연다 — 폼이 초깃값만 비운다.
 */
function SignupRequiredNotice({ session }: Readonly<{ session: AuthSession | null }>) {
  return (
    <InlineSignup
      authUserEmail={session?.authUser.email ?? null}
      authUserName={session?.authUser.name ?? null}
    />
  );
}

/** 토큰은 있는데 서버가 받아 주지 않았다 — 대개 만료다 */
function SessionExpiredNotice() {
  return (
    <Notice
      title="로그인이 만료되었습니다"
      description="로그인이 풀렸습니다. 다시 로그인하면 내 활동을 이어서 볼 수 있습니다."
    >
      <SignInButton next={ROUTES.me} label="다시 로그인" />
    </Notice>
  );
}

async function SignedInBody() {
  /*
   * 한 블록이 실패해도 다른 블록의 답은 쓴다 — allSettled인 이유다. 세션이 "미가입"이라고
   * 답하면 목록이 403으로 깨진 것은 당연한 결과이므로 오류로 그리지 않고 가입 안내를 그린다.
   *
   * 기획안 폼 조회(`fetchSystemForm`)는 «기획안» 칩 하나를 위한 것이다 — 실패하면(아직 시드
   * 안 됨·404) 칩만 빠지고 «낸 폼»은 그대로 선다.
   */
  const [sessionResult, applicationsResult, responsesResult, programsResult, proposalFormResult] =
    await Promise.allSettled([
      fetchAuthSession(),
      fetchMyApplications(),
      fetchMyResponsesAcrossForms(),
      fetchMyLeadingPrograms(),
      fetchSystemForm(PROPOSAL_SYS_FORM_CD),
    ]);

  const session: AuthSession | null =
    sessionResult.status === "fulfilled" ? sessionResult.value : null;

  if (session && !session.signedUp) return <SignupRequiredNotice session={session} />;

  /*
   * 인증 문제는 어느 블록에서 나든 화면 전체의 문제다 — 신청 목록이 그것을 대표한다(세 블록이
   * 같은 토큰을 보내므로 하나가 401·403이면 나머지도 그렇다). 그 밖의 실패는 그 블록만 «—»다.
   */
  if (applicationsResult.status === "rejected") {
    const reason = applicationsResult.reason;
    if (isSignupRequired(reason)) return <SignupRequiredNotice session={session} />;
    if (isUnauthenticated(reason)) return <SessionExpiredNotice />;
  }

  const responses: MyFormResponseOverview[] | null =
    responsesResult.status === "fulfilled" ? responsesResult.value : null;
  const programs: AcademicProgramSummary[] | null =
    programsResult.status === "fulfilled" ? programsResult.value : null;
  const proposalFormId =
    proposalFormResult.status === "fulfilled" ? proposalFormResult.value.formId : null;

  return (
    <div className="flex flex-col gap-[24px]">
      <AccountLine session={session} />
      <ApplicationList result={applicationsResult} />
      <FormResponses responses={responses} proposalFormId={proposalFormId} />
      <LeadingPrograms programs={programs} />
    </div>
  );
}

/**
 * 어느 계정으로 보고 있는지 밝힌다. 구글 계정을 둘 이상 쓰는 사람이 빈 목록을 보고 "신청이
 * 사라졌다"고 읽는 것을 막는 것이 목적이라, 목록이 비었을 때도 함께 남긴다.
 * 회원 이름이 있으면 그것을, 없으면 로그인한 계정의 이메일을 쓴다.
 */
function AccountLine({ session }: Readonly<{ session: AuthSession | null }>) {
  const account = session?.member?.name ?? session?.authUser.email ?? null;
  if (!account) return null;
  return <p className="text-[13px] text-n500">{account} 계정으로 보고 있습니다</p>;
}

function SectionHeading({ title }: Readonly<{ title: string }>) {
  return <h2 className="text-[16px] font-semibold tracking-[-.2px]">{title}</h2>;
}

/* ── ① 신청한 행사 ─────────────────────────────────────────── */

function ApplicationList({
  result,
}: Readonly<{
  result: PromiseSettledResult<MyApplication[]>;
}>) {
  return (
    <section className="flex flex-col gap-[10px]">
      <SectionHeading title="신청한 행사" />
      {result.status === "rejected" ? (
        <EmptyState title={myApplicationsErrorMessage(result.reason)} />
      ) : (
        <ApplicationCards applications={result.value} />
      )}
    </section>
  );
}

function ApplicationCards({ applications }: Readonly<{ applications: MyApplication[] }>) {
  if (applications.length === 0) {
    return (
      <EmptyState
        title="아직 신청한 행사가 없습니다"
        description="행사 목록에서 모집 중인 행사를 확인해 보세요"
      />
    );
  }
  return (
    <div className="flex flex-col gap-[12px]">
      {applications.map((application) => (
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
 * **수정요청 사유는 응답 상세(서버 #177)에만 있다** — 목록은 "무엇을 어떤 상태로 냈는가"까지만
 * 답한다. 그래서 수정요청을 받은 건에 대해서만 상세를 한 번씩 더 부른다. 전부 부르지 않는 것은
 * 사유가 있는 상태가 그것 하나이기 때문이고, 그런 건은 대개 없거나 한둘이라 요청 수가 목록
 * 길이에 비례하지 않는다.
 *
 * 사유 조회가 실패해도 카드는 선다 — 사유를 못 읽는 것과 수정요청을 받았다는 사실을 모르는
 * 것은 다른 일이고, 후자만 막으면 이 화면은 제 몫을 한다.
 */
async function FormResponses({
  responses,
  proposalFormId,
}: Readonly<{
  responses: MyFormResponseOverview[] | null;
  /** 기획안 폼의 formId — 모르면(조회 실패) null이고 칩을 달지 않는다 */
  proposalFormId: number | null;
}>) {
  if (responses === null) {
    return (
      <section className="flex flex-col gap-[10px]">
        <SectionHeading title="낸 폼" />
        <EmptyState title="폼 응답을 불러오지 못했습니다 — 잠시 후 다시 시도해주세요" />
      </section>
    );
  }

  const changesRequested = responses.filter(
    (response) => response.rspnsSttsCd === "CHANGES_REQUESTED",
  );
  const details = await Promise.allSettled(
    changesRequested.map((response) =>
      fetchMyResponseDetail(response.formId, response.formRspnsId),
    ),
  );

  const reviewOpinions: Record<number, string> = {};
  for (const detail of details) {
    if (detail.status !== "fulfilled") continue;
    /*
     * 마지막 수정요청의 의견을 쓴다. 이력은 처리 일시 오름차순이라 뒤에서 찾으며, 승인·반려
     * 뒤에는 수정요청 상태로 돌아오지 않으므로 이 값이 곧 지금 고쳐야 할 이유다.
     */
    const opinion = [...detail.value.reviewHistories]
      .reverse()
      .find((history) => history.rvwPrcsSeCd === "REQUEST_CHANGES")?.rvwOpnnCn;
    if (opinion) reviewOpinions[detail.value.formRspnsId] = opinion;
  }

  return (
    <section className="flex flex-col gap-[10px]">
      <SectionHeading title="낸 폼" />
      <FormResponsesSection
        responses={responses}
        reviewOpinions={reviewOpinions}
        proposalFormId={proposalFormId}
      />
    </section>
  );
}

/* ── ③ 내가 이끄는 스터디·프로젝트 ────────────────────────── */

/*
 * 조회가 실패하면 이 블록만 안내로 대체한다 — 다른 두 블록과 같은 규칙이다. 빈 목록은
 * 실패가 아니다: 스터디장/팀장이 아닌 부원이 대부분이라 «없음»이 이 블록의 흔한 상태다.
 */
function LeadingPrograms({
  programs,
}: Readonly<{
  programs: AcademicProgramSummary[] | null;
}>) {
  return (
    <section className="flex flex-col gap-[10px]">
      <SectionHeading title="내가 이끄는 스터디·프로젝트" />
      {programs === null ? (
        <EmptyState title="활동을 불러오지 못했습니다 — 잠시 후 다시 시도해주세요" />
      ) : (
        <ProgramCards programs={programs} />
      )}
    </section>
  );
}

function ProgramCards({ programs }: Readonly<{ programs: AcademicProgramSummary[] }>) {
  if (programs.length === 0) return <EmptyState title="이끄는 활동이 없습니다" />;
  return (
    <div className="flex flex-col gap-[12px]">
      {programs.map((program) => (
        <ProgramCard key={program.academicProgramId} program={program} />
      ))}
    </div>
  );
}
