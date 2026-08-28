import Link from "next/link";
import { acdmActvSttsBadge } from "@/entities/academic-program";
import {
  sesnSttsBadge,
  type AcademicProgramApproval,
  type AcademicSessionSummary,
  type CurriculumItemWithSession,
} from "@/entities/academic-session";
import {
  loadMyProgramDetail,
  type MyProgramDetailReady,
} from "@/features/academic-program";
import { LoginGate } from "@/features/auth";
import {
  ROUTES,
  signupUrl,
  studioRecordUrl,
  studioRosterUrl,
} from "@/shared/config/routes";
import { formatDt, formatYmd } from "@/shared/lib/date";
import { Badge, Card, EmptyState, Notice } from "@/shared/ui";

/*
 * 활동 상세 (`/studio/programs/{id}` · #188 · SSR).
 *
 * ── 대시보드와 무엇이 다른가 ────────────────────────────────
 * 대시보드(`/studio`)는 "이번 주에 뭘 해야 하나"다 — 이번 주 회차·밀린 회차·국장 처리 현황.
 * 이 화면은 "이 활동이 전체적으로 어디까지 왔나"다 — 커리큘럼 계획 대비 진행 전체, 회차
 * 이력 전부, 출석 요약. 프로토타입의 `program` 라우트(스터디장 메뉴 "내 활동")를 옮긴 것이다.
 *
 * ── 집계는 로더가 한다 (#126·#172와 같은 규칙) ────────────────
 * 진행률·완료 회차·평균 출석률·지연 회차는 `loadMyProgramDetail`이 `todayInSeoul()` 기준으로
 * 계산해 넘긴다. 이 뷰는 그 값을 카드·표로 그리기만 한다.
 *
 * ── 회차 진입 버튼을 새로 만들지 않는다 ────────────────────────
 * 회차 기록은 커리큘럼 항목 행에서 `studioRecordUrl`로(#128), 출석부는 헤더의 링크로(#172).
 * 이 화면에 `+ 회차 기록` 같은 버튼을 따로 두지 않는다.
 */

export async function MyProgramDetailPage({
  academicProgramId,
}: {
  academicProgramId: number | null;
}) {
  if (academicProgramId === null) {
    return (
      <div className="flex flex-col gap-[16px]">
        <BackLink />
        <EmptyState
          title="활동을 찾을 수 없습니다"
          description="내 활동 목록에서 활동을 골라 들어와주세요."
        />
      </div>
    );
  }

  const result = await loadMyProgramDetail(academicProgramId);

  return (
    <div className="flex flex-col gap-[16px]">
      <BackLink />
      <Body result={result} />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href={ROUTES.studioPrograms}
      className="text-[13.5px] text-n300 hover:text-accent"
    >
      ← 내 활동
    </Link>
  );
}

function Body({
  result,
}: {
  result: Awaited<ReturnType<typeof loadMyProgramDetail>>;
}) {
  if (result.outcome === "unauthenticated") {
    return (
      <LoginGate
        title="로그인이 필요합니다"
        description="활동 상세는 로그인한 회원만 볼 수 있습니다 — 구글 계정으로 로그인해 주세요"
      />
    );
  }

  if (result.outcome === "signup-required") {
    const signup = signupUrl();
    return (
      <Notice
        title="회원 가입을 마쳐야 학술 활동 화면을 볼 수 있습니다"
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

  if (result.outcome === "not-found") {
    return (
      <EmptyState
        title="활동을 찾을 수 없습니다"
        description="내가 맡은 활동이 아니거나 아직 이관되지 않은 활동일 수 있습니다 — 내 활동 목록을 다시 확인해주세요."
      />
    );
  }

  if (result.outcome === "error") {
    return (
      <EmptyState title="활동을 불러오지 못했습니다" description={result.message} />
    );
  }

  return <DetailBody data={result} />;
}

function DetailBody({ data }: { data: MyProgramDetailReady }) {
  const { program, curriculum, sessions, approvals, stats } = data;
  const badge = acdmActvSttsBadge(program.sttsCd);

  return (
    <div className="flex flex-col gap-[16px]">
      {/* 헤더 카드 */}
      <Card>
        <div className="flex flex-wrap items-center gap-[8px]">
          <Badge tone={badge.tone}>{badge.label}</Badge>
          <Badge tone="grey">{program.typeCd}</Badge>
          <div className="flex-1" />
          <Link
            href={studioRosterUrl(program.academicProgramId)}
            className="whitespace-nowrap rounded-[12px] border border-line px-[12px] py-[6px] text-[13.5px] text-n400 hover:border-accent hover:text-accent"
          >
            출석부
          </Link>
          <Link
            href={`${ROUTES.studioMembers}?programId=${program.academicProgramId}`}
            className="whitespace-nowrap rounded-[12px] border border-line px-[12px] py-[6px] text-[13.5px] text-n400 hover:border-accent hover:text-accent"
          >
            팀원 관리
          </Link>
        </div>
        <div className="mt-[10px] text-[22px] font-semibold">
          {program.title || "-"}
        </div>
        <div className="mt-[4px] text-[14px] text-n400">
          {formatYmd(program.eventBeginAt)} ~ {formatYmd(program.eventEndAt)}
          {program.leaderName ? ` · 스터디장 ${program.leaderName}` : ""}
        </div>

        <div className="mt-[16px] flex items-center gap-[10px]">
          <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-accent"
              style={{
                width: `${Math.max(0, Math.min(100, stats.progressPercent))}%`,
              }}
            />
          </div>
          <div className="w-[38px] text-right text-[14px] text-n500">
            {stats.progressPercent}%
          </div>
        </div>
      </Card>

      {/* 통계 4칸 */}
      <div className="grid grid-cols-2 gap-[12px] lg:grid-cols-4">
        <StatBox
          label="커리큘럼 진행률"
          value={`${stats.progressPercent}%`}
          hint={
            stats.curriculumTotal > 0
              ? `${stats.approvedSessions} / ${stats.curriculumTotal}회차 승인`
              : "커리큘럼 없음"
          }
        />
        <StatBox
          label="평균 출석률"
          value={
            stats.averageAttendancePercent === null
              ? "-"
              : `${stats.averageAttendancePercent}%`
          }
          hint={
            stats.recordedSessions > 0
              ? `${stats.recordedSessions}개 회차 기준`
              : "기록된 회차 없음"
          }
        />
        <StatBox
          label="완료 회차"
          value={String(stats.approvedSessions)}
          hint={`기록 ${stats.recordedSessions}개`}
        />
        <StatBox
          label="미기록 회차"
          value={String(stats.delayedItems.length)}
          hint={
            stats.delayedItems[0]
              ? `${stats.delayedItems[0].seqno ?? "-"}회차 · ${formatYmd(
                  stats.delayedItems[0].planYmd,
                )} 예정`
              : "밀린 회차 없음"
          }
          tone={stats.delayedItems.length > 0 ? "warn" : "default"}
        />
      </div>

      {/* 커리큘럼 대비 진행 */}
      <Card>
        <div className="mb-[4px] text-[16px] font-medium">커리큘럼 대비 진행</div>
        <p className="mb-[14px] text-[13px] text-n500">
          기획안에 등록한 계획과 실제 진행한 회차를 나란히 봅니다.
        </p>
        <CurriculumProgress program={data} curriculum={curriculum} />
      </Card>

      {/* 회차 이력 */}
      <Card>
        <div className="mb-[14px] flex items-baseline gap-[10px]">
          <div className="text-[16px] font-medium">회차 이력</div>
          <div className="flex-1" />
          <div className="text-[13.5px] text-n500">{sessions.length}건</div>
        </div>
        <SessionHistory sessions={sessions} />
      </Card>

      {/* 국장 처리 현황 */}
      <Card>
        <div className="mb-[14px] text-[16px] font-medium">국장 처리 현황</div>
        <ApprovalFeed approvals={approvals} />
      </Card>
    </div>
  );
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
    tone === "accent"
      ? "text-accent"
      : tone === "warn"
        ? "text-amber"
        : "text-ink";
  return (
    <div className="rounded-2xl bg-surface p-[16px] shadow-[0_0_0_1px_#e5e8eb]">
      <div className="text-[13px] text-n500">{label}</div>
      <div className={`mt-[6px] text-[24px] font-medium ${valueColor}`}>{value}</div>
      {hint && <div className="mt-[4px] text-[13px] text-n500">{hint}</div>}
    </div>
  );
}

/*
 * 계획(커리큘럼 항목) ↔ 실제 진행 매핑. 커리큘럼 항목마다 한 줄 — 계획일·제목·회차 상태와,
 * 실적이 있으면 실제 진행일. 지금 쓸 수 있는 회차(isEditable)는 기록 작성으로 링크한다.
 */
function CurriculumProgress({
  program,
  curriculum,
}: {
  program: MyProgramDetailReady;
  curriculum: CurriculumItemWithSession[];
}) {
  if (curriculum.length === 0) {
    return (
      <div className="text-[14px] text-n500">
        등록된 커리큘럼이 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-line">
      {curriculum.map((item) => {
        const badge = sesnSttsBadge(item.sesnSttsCd);
        return (
          <div
            key={item.curriculumItemId}
            className="flex items-start gap-[12px] py-[12px] first:pt-0 last:pb-0"
          >
            <div className="w-[64px] flex-none pt-[2px] text-[13px] text-n500">
              {item.seqno != null ? `${item.seqno}회차` : "·"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-[7px]">
                <Badge tone={badge.tone}>{badge.label}</Badge>
                <span className="text-[14.5px] text-ink">
                  {item.title || "커리큘럼 항목"}
                </span>
              </div>
              <div className="mt-[5px] text-[13px] text-n500">
                계획 {formatYmd(item.planYmd) || "미정"}
                {item.actualYmd
                  ? ` · 진행 ${formatYmd(item.actualYmd)}`
                  : ""}
              </div>
            </div>
            {item.isEditable && (
              <Link
                href={studioRecordUrl(
                  program.program.academicProgramId,
                  item.curriculumItemId,
                )}
                className="flex-none whitespace-nowrap rounded-[12px] border border-accent bg-accent px-[12px] py-[6px] text-[13px] font-semibold text-white hover:bg-accent-strong"
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

function SessionHistory({ sessions }: { sessions: AcademicSessionSummary[] }) {
  if (sessions.length === 0) {
    return (
      <div className="text-[14px] text-n500">
        아직 기록된 회차가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-line">
      {sessions.map((session) => {
        const badge = sesnSttsBadge(session.sesnSttsCd);
        return (
          <div
            key={session.sessionId}
            className="flex items-start gap-[12px] py-[12px] first:pt-0 last:pb-0"
          >
            <div className="w-[86px] flex-none pt-[2px] text-[13.5px] text-n500">
              {formatYmd(session.actualYmd) || formatYmd(session.planYmd)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-[7px]">
                <Badge tone={badge.tone}>{badge.label}</Badge>
                {session.seqno != null && (
                  <span className="text-[13px] text-n500">
                    {session.seqno}회차
                  </span>
                )}
              </div>
              <div className="mt-[5px] text-[14.5px] text-ink">
                {session.curriculumTitle || "커리큘럼 항목"}
              </div>
              <div className="mt-[4px] text-[13px] text-n500">
                출석 {session.presentCount}/{session.totalCount}
                {session.registrantMemberName
                  ? ` · 작성 ${session.registrantMemberName}`
                  : ""}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 승인 상태 코드 → 라벨·톤. 서버 enum이라 코드로 가른다(대시보드와 같은 규칙) */
function approvalStatusView(code: string): {
  label: string;
  tone: "blue" | "amber" | "grey";
} {
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
      {approvals.slice(0, 8).map((approval) => {
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
              회차 기록 처리
              {approval.approverMemberName
                ? ` — 학술국장 ${approval.approverMemberName}`
                : ""}
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
