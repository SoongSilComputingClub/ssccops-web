import Link from "next/link";
import {
  acdmActvSttsBadge,
  type AcademicProgramSummary,
} from "@/entities/academic-program";
import {
  sesnSttsBadge,
  type AcademicProgramApproval,
  type CurriculumItemWithSession,
} from "@/entities/academic-session";
import {
  loadLeaderDashboard,
  type LeaderDashboardReady,
} from "@/features/academic-program";
import { LoginGate } from "@/features/auth";
import {
  ROUTES,
  signupUrl,
  studioRecordUrl,
  studioRosterUrl,
} from "@/shared/config/routes";
import { formatDt, formatYmd, todayInSeoul } from "@/shared/lib/date";
import { Badge, Card, EmptyState, Notice } from "@/shared/ui";

/*
 * 학술 대시보드 — 스터디장 홈 (#126 · 서버 #131·#134·#139).
 *
 * **이 앱의 첫 화면이다**(`/studio`). 스터디장이 자기 활동 하나의 진행률·이번 주 회차·
 * 미기록 회차·국장의 처리 현황을 한눈에 본다. 어드민의 `/academic-programs/dashboard`와 제목은
 * "학술 대시보드"로 같지만 앱도 데이터도 다르다(국장은 전체 감독) — 두 앱은 소스를 공유하지
 * 않고, **역할로 분기하는 코드를 넣지 않는다**(#126 결정). 국장이 스터디장을 겸하면 두 앱을
 * 각자 오간다.
 *
 * ── 왜 SSR인가 ────────────────────────────────────────────────
 * 이 앱은 조회 화면을 서버 컴포넌트로 그린다(AGENTS.md · program-members·attendance-roster와
 * 같은 규약). 대시보드는 카드를 눌러 이동만 하므로 클라이언트 훅이 없다. 로그인 상태로 갈리는
 * 부분(`LoginGate`)만 클라이언트다.
 *
 * ── 집계는 로더가 한다 (#126 결정) ────────────────────────────
 * "이번 주"·"지연" 판정은 `loadLeaderDashboard`가 `todayInSeoul()` 기준으로 계산해 넘긴다 —
 * 같은 계산이 여러 곳에 흩어지지 않게. 이 뷰는 그 결과를 커리큘럼 배열에서 세어 통계 칸으로
 * 그리기만 한다(진행률·미기록·승인 대기).
 */

/** 커리큘럼에서 파생하는 통계 — 서버가 요약을 주지 않아 화면이 센다(진행률은 목록 응답의 progressRatio를 우선) */
function deriveStats(
  program: AcademicProgramSummary,
  curriculum: CurriculumItemWithSession[],
  today: string,
) {
  const total = curriculum.length;
  const approved = curriculum.filter((c) => c.sesnSttsCd === "APPROVED").length;
  // 목록 응답의 progressRatio(서버 계산)를 우선 쓰고, 없으면 커리큘럼에서 근사한다
  const progress =
    program.progressRatio > 0
      ? Math.round(program.progressRatio)
      : total > 0
        ? Math.round((approved / total) * 100)
        : 0;

  const pendingReview = curriculum.filter(
    (c) => c.sesnSttsCd === "SUBMITTED" || c.sesnSttsCd === "REVISION_REQUESTED",
  ).length;

  // 미기록 = 계획일이 지났는데 아직 실적이 없는(NOT_SUBMITTED) 회차
  const unrecorded = curriculum.filter(
    (c) =>
      c.sesnSttsCd === "NOT_SUBMITTED" &&
      c.planYmd != null &&
      c.planYmd.slice(0, 10) < today,
  );

  return { total, approved, progress, pendingReview, unrecorded };
}

function StatBox({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "accent" | "warn";
}) {
  const valueColor =
    tone === "accent" ? "text-accent" : tone === "warn" ? "text-amber" : "text-ink";
  return (
    <div className="rounded-2xl bg-surface p-[16px] shadow-[0_0_0_1px_#e5e8eb]">
      <div className="text-[13px] text-n500">{label}</div>
      <div className={`mt-[6px] text-[24px] font-medium ${valueColor}`}>{value}</div>
      {hint && <div className="mt-[4px] text-[13px] text-n500">{hint}</div>}
    </div>
  );
}

function CurriculumStrip({
  program,
  curriculum,
}: {
  program: AcademicProgramSummary;
  curriculum: CurriculumItemWithSession[];
}) {
  return (
    <div className="flex flex-wrap gap-[6px]">
      {curriculum.map((item) => {
        const badge = sesnSttsBadge(item.sesnSttsCd);
        const label = item.seqno != null ? String(item.seqno) : "·";
        const cell = (
          <span
            className={`flex h-[34px] min-w-[34px] items-center justify-center rounded-[8px] px-[6px] text-[12.5px] ${
              badge.tone === "grey"
                ? "bg-bg text-n300"
                : badge.tone === "blue"
                  ? "bg-accent-soft text-accent"
                  : badge.tone === "amber"
                    ? "bg-amber-soft text-amber"
                    : "text-accent shadow-[inset_0_0_0_1px_#3182f6]"
            }`}
            title={`${item.title || "커리큘럼 항목"} · ${badge.label}`}
          >
            {label}
          </span>
        );
        // 지금 쓸 수 있는 회차(NOT_SUBMITTED·REVISION_REQUESTED · isEditable)만 링크를 건다
        return item.isEditable ? (
          <Link
            key={item.curriculumItemId}
            href={studioRecordUrl(program.academicProgramId, item.curriculumItemId)}
          >
            {cell}
          </Link>
        ) : (
          <span key={item.curriculumItemId}>{cell}</span>
        );
      })}
    </div>
  );
}

function ThisWeekList({
  program,
  items,
}: {
  program: AcademicProgramSummary;
  items: CurriculumItemWithSession[];
}) {
  if (items.length === 0) {
    return (
      <div className="text-[14px] text-n500">이번 주에 계획된 회차가 없습니다.</div>
    );
  }
  return (
    <div className="flex flex-col gap-[12px]">
      {items.map((item) => {
        const badge = sesnSttsBadge(item.sesnSttsCd);
        return (
          <div key={item.curriculumItemId} className="flex items-start gap-[12px]">
            <div className="w-[86px] flex-none pt-[2px] text-[13.5px] text-n500">
              {formatYmd(item.planYmd)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-[7px]">
                <Badge tone={badge.tone}>{badge.label}</Badge>
                {item.seqno != null && (
                  <span className="text-[13px] text-n500">{item.seqno}회차</span>
                )}
              </div>
              <div className="mt-[5px] text-[14.5px] text-ink">
                {item.title || "커리큘럼 항목"}
              </div>
            </div>
            {item.isEditable && (
              <Link
                href={studioRecordUrl(program.academicProgramId, item.curriculumItemId)}
                className="flex-none whitespace-nowrap rounded-[12px] border border-accent bg-accent px-[12px] py-[6px] text-[13.5px] font-semibold text-white hover:bg-accent-strong"
              >
                기록 작성
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** 승인 상태 코드 → 라벨·톤. 서버 enum(`AcademicProgramApprovalStatus`)이라 코드로 가른다 */
function approvalStatusView(code: string): { label: string; tone: "blue" | "amber" | "grey" } {
  if (code === "APPROVED") return { label: "승인", tone: "grey" };
  if (code === "REVISION_REQUESTED") return { label: "수정요청", tone: "amber" };
  return { label: code, tone: "grey" };
}

function ApprovalFeed({ approvals }: { approvals: AcademicProgramApproval[] }) {
  if (approvals.length === 0) {
    return (
      <div className="text-[14px] text-n500">
        아직 국장이 처리한 회차 기록이 없습니다.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-[14px]">
      {approvals.slice(0, 6).map((approval) => {
        const view = approvalStatusView(approval.aprvSttsCd);
        return (
          <div key={approval.approvalId}>
            <div className="flex items-center gap-[7px]">
              <Badge tone={view.tone}>{view.label}</Badge>
              <span className="text-[13px] text-n500">
                {formatDt(approval.approvedAt) || formatYmd(approval.approvedAt)}
              </span>
            </div>
            <div className="mt-[5px] text-[14px] text-n400">
              {approval.sessionId != null
                ? `회차 기록 처리`
                : `활동 처리`}
              {approval.approverMemberName ? ` — 학술국장 ${approval.approverMemberName}` : ""}
            </div>
            {approval.opinionContent && (
              <div className="mt-[4px] rounded-[10px] bg-bg px-[10px] py-[7px] text-[13px] text-n400">
                {approval.opinionContent}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DashboardBody({ data }: { data: LeaderDashboardReady }) {
  const { program, curriculum, approvals, otherPrograms, thisWeekItems } = data;
  const today = todayInSeoul();
  const stats = deriveStats(program, curriculum, today);
  const statusBadge = acdmActvSttsBadge(program.sttsCd);

  return (
    <div className="flex flex-col gap-[16px]">
      {/* 통계 4칸 */}
      <div className="grid grid-cols-2 gap-[12px] lg:grid-cols-4">
        <StatBox
          label="커리큘럼 진행률"
          value={`${stats.progress}%`}
          hint={stats.total > 0 ? `${stats.approved} / ${stats.total}회차` : "커리큘럼 없음"}
        />
        <StatBox
          label="미기록 회차"
          value={String(stats.unrecorded.length)}
          hint={
            stats.unrecorded[0]
              ? `${stats.unrecorded[0].seqno ?? "-"}회차 · ${formatYmd(stats.unrecorded[0].planYmd)} 예정`
              : "밀린 회차 없음"
          }
          tone={stats.unrecorded.length > 0 ? "warn" : "default"}
        />
        <StatBox
          label="검토 대기"
          value={String(stats.pendingReview)}
          hint="국장 검토 중인 회차"
          tone={stats.pendingReview > 0 ? "accent" : "default"}
        />
        <StatBox
          label="이번 주 회차"
          value={String(thisWeekItems.length)}
          hint="계획일 기준"
        />
      </div>

      {/* 활동 카드 + 회차 스트립 */}
      <Card>
        <div className="flex flex-wrap items-center gap-[8px]">
          <Badge tone={statusBadge.tone}>{statusBadge.label}</Badge>
          <Badge tone="grey">{program.typeCd}</Badge>
          <div className="flex-1" />
          <Link
            href={studioRosterUrl(program.academicProgramId)}
            className="whitespace-nowrap rounded-[12px] border border-line px-[12px] py-[6px] text-[13.5px] text-n400 hover:border-accent hover:text-accent"
          >
            출석부
          </Link>
          <Link
            href={ROUTES.studioMembers + `?programId=${program.academicProgramId}`}
            className="whitespace-nowrap rounded-[12px] border border-line px-[12px] py-[6px] text-[13.5px] text-n400 hover:border-accent hover:text-accent"
          >
            팀원 관리
          </Link>
        </div>
        <div className="mt-[10px] text-[22px] font-semibold">{program.title || "-"}</div>
        <div className="mt-[4px] text-[14px] text-n400">
          {formatYmd(program.eventBeginAt)} ~ {formatYmd(program.eventEndAt)}
          {program.leaderName ? ` · 스터디장 ${program.leaderName}` : ""}
        </div>

        <div className="mt-[16px] flex items-center gap-[10px]">
          <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.max(0, Math.min(100, stats.progress))}%` }}
            />
          </div>
          <div className="w-[38px] text-right text-[14px] text-n500">
            {stats.progress}%
          </div>
        </div>

        {curriculum.length > 0 && (
          <div className="mt-[18px]">
            <CurriculumStrip program={program} curriculum={curriculum} />
            <div className="mt-[10px] flex flex-wrap items-center gap-[14px] text-[12.5px] text-n500">
              <span className="flex items-center gap-[6px]">
                <span className="h-[10px] w-[10px] rounded-[3px] bg-bg" />예정
              </span>
              <span className="flex items-center gap-[6px]">
                <span className="h-[10px] w-[10px] rounded-[3px] bg-amber-soft" />미제출
              </span>
              <span className="flex items-center gap-[6px]">
                <span className="h-[10px] w-[10px] rounded-[3px] bg-accent-soft" />제출
              </span>
              <span className="flex items-center gap-[6px]">
                <span className="h-[10px] w-[10px] rounded-[3px] shadow-[inset_0_0_0_1px_#d1d6db]" />
                승인
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* 이번 주 회차 + 처리 현황 */}
      <div className="grid grid-cols-1 items-start gap-[16px] lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="mb-[14px] flex items-baseline gap-[10px]">
            <div className="text-[16px] font-medium">이번 주 내 회차</div>
            <div className="flex-1" />
            <div className="text-[13.5px] text-n500">{thisWeekItems.length}건</div>
          </div>
          <ThisWeekList program={program} items={thisWeekItems} />

          {stats.unrecorded.length > 0 && (
            <div className="mt-[18px] border-t border-line pt-[14px]">
              <div className="mb-[8px] text-[13.5px] text-n500">밀린 회차</div>
              <div className="flex flex-col gap-[10px]">
                {stats.unrecorded.map((item) => (
                  <div key={item.curriculumItemId} className="flex items-center gap-[10px]">
                    <Badge tone="amber">미제출</Badge>
                    <div className="min-w-0 flex-1 text-[13.5px] text-n400">
                      {item.seqno != null ? `${item.seqno}회차 ` : ""}
                      {item.title || "커리큘럼 항목"} — {formatYmd(item.planYmd)} 예정
                    </div>
                    {item.isEditable && (
                      <Link
                        href={studioRecordUrl(
                          program.academicProgramId,
                          item.curriculumItemId,
                        )}
                        className="flex-none whitespace-nowrap rounded-[12px] border border-accent bg-accent px-[12px] py-[6px] text-[13px] font-semibold text-white hover:bg-accent-strong"
                      >
                        기록 작성
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-[14px] text-[16px] font-medium">내 기록 처리 현황</div>
          <ApprovalFeed approvals={approvals} />
        </Card>
      </div>

      {/* 내가 맡은 다른 활동 */}
      {otherPrograms.length > 0 && (
        <Card>
          <div className="mb-[12px] text-[16px] font-medium">내가 맡은 다른 활동</div>
          <div className="flex flex-col gap-[10px]">
            {otherPrograms.map((other) => {
              const badge = acdmActvSttsBadge(other.sttsCd);
              return (
                <div key={other.academicProgramId} className="flex items-center gap-[10px]">
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                  <Badge tone="grey">{other.typeCd}</Badge>
                  <div className="min-w-0 flex-1 text-[14px] text-n400">
                    {other.title || "-"}
                  </div>
                  <Link
                    href={studioRosterUrl(other.academicProgramId)}
                    className="flex-none whitespace-nowrap rounded-[12px] border border-line px-[10px] py-[5px] text-[13px] text-n400 hover:border-accent hover:text-accent"
                  >
                    출석부
                  </Link>
                </div>
              );
            })}
          </div>
          <div className="mt-[10px] text-[12.5px] text-n500">
            대시보드는 진행 중 활동 하나를 보여 줍니다 — 다른 활동은 출석부·팀원 관리에서
            이어서 봅니다.
          </div>
        </Card>
      )}
    </div>
  );
}

export async function StudioDashboardPage() {
  const result = await loadLeaderDashboard();

  return (
    <div className="flex flex-col gap-[16px]">
      <header className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-medium tracking-[-.3px] lg:text-[24px]">
          학술 대시보드
        </h1>
        <p className="text-[13.5px] text-n500">
          내 활동의 진행 현황 · 이번 주 회차 · 국장 처리 현황
        </p>
      </header>

      {result.outcome === "unauthenticated" && (
        <LoginGate
          title="로그인이 필요합니다"
          description="학술 대시보드는 로그인한 회원만 볼 수 있습니다 — 구글 계정으로 로그인해 주세요"
        />
      )}

      {result.outcome === "signup-required" && <SignupNotice />}

      {result.outcome === "error" && (
        <EmptyState
          title="학술 대시보드를 불러오지 못했습니다"
          description={result.message}
        />
      )}

      {result.outcome === "no-program" && (
        <EmptyState
          title="맡고 있는 스터디·프로젝트가 없습니다"
          description="기획안이 승인되어 활동이 만들어지고 스터디장으로 지정되면 이 화면에 나타납니다."
        />
      )}

      {result.outcome === "ready" && <DashboardBody data={result} />}
    </div>
  );
}

function SignupNotice() {
  const signup = signupUrl();
  return (
    <Notice
      title="회원 가입을 마쳐야 학술 대시보드를 볼 수 있습니다"
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
