"use client";

import { useRouter } from "next/navigation";
import {
  acdmActvSttsTone,
  type AcademicProgramSummary,
} from "@/entities/academic-program";
import type { SessionCrossListItem } from "@/entities/academic-session";
import { useAcademicProgramDashboard } from "@/features/academic-program";
import { ACDM_ACTV_STTS_NM } from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import { ddayText, formatMd, formatYmd, todayInSeoul } from "@/shared/lib/date";
import {
  Badge,
  Card,
  CardTitle,
  EmptyState,
  ProgressBar,
  PageBody,
  PageHeader,
  StatBox,
} from "@/shared/ui";

/*
 * 학술국장 대시보드 (#126 · 서버 #131·#136).
 *
 * 학술 그룹의 첫 화면이다 — 전체 활동 현황·이번 주 회차·승인 대기·최근 활동을 한눈에 본다.
 * 공개 앱(apps/lms)의 `/studio`와 제목은 "학술 대시보드"로 같지만 앱도 데이터도 다르다
 * (국장은 전체 감독, 스터디장은 본인 활동 1건) — 두 앱은 소스를 공유하지 않는다. 그래서
 * **역할로 분기하는 코드를 넣지 않는다**(#126 「결정해서 남길 것」).
 *
 * ── 통계 카드를 누르면 목록으로 간다 ──────────────────────────
 * 진행 중·지연은 스터디·프로젝트 목록으로(상태 필터를 걸고), 승인 대기는 회차·출석 승인
 * 화면으로 — 운영 대시보드의 카드가 승인함으로 가는 것과 같은 판단이다.
 *
 * ── "이번 주"·"지연"은 훅이 판정한다 ─────────────────────────
 * 집계 로직은 use-academic-program-dashboard 훅 하나에만 둔다(#126 결정). 화면은 그 값을
 * 그리기만 한다. "지연"은 진행률 근사이고(정확한 계획 대비 회차 미달은 대시보드 범위 밖),
 * "이번 주 회차"는 진행일 기준이라(계획일이 활동 횡단 회차 응답에 없다) 그 뜻을 문구가 밝힌다.
 */

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-[16px] w-2/5 rounded bg-black/5" />
            <div className="mt-3 h-[28px] w-1/4 rounded bg-black/5" />
          </Card>
        ))}
      </div>
      <Card className="animate-pulse">
        <div className="h-[20px] w-1/5 rounded bg-black/5" />
        <div className="mt-3 h-[120px] w-full rounded bg-black/5" />
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  hint: string;
  tone?: "default" | "accent" | "danger";
  onClick: () => void;
}) {
  return (
    <Card onClick={onClick}>
      <StatBox label={label} value={value} size="lg" tone={tone} className="border-0 p-0" />
      <div className="mt-1 text-[13px] text-n500">{hint}</div>
    </Card>
  );
}

function OngoingProgramCard({
  program,
  onClick,
}: {
  program: AcademicProgramSummary;
  onClick: () => void;
}) {
  const ratio = Math.round(program.progressRatio);
  const delayed = program.sttsCd === "ONGOING" && ratio < 40;

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-[12px] border border-line p-[14px] transition-colors hover:border-accent"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={delayed ? "outline-red" : acdmActvSttsTone(program.sttsCd)}>
          {delayed ? "지연" : ACDM_ACTV_STTS_NM[program.sttsCd]}
        </Badge>
        <Badge tone="grey">{program.typeCd}</Badge>
        <div className="flex-1" />
        {program.isLeader && (
          <span title="내가 스터디장/팀장인 활동입니다">
            <Badge tone="outline-accent">내 활동</Badge>
          </span>
        )}
      </div>
      <div className="mt-2 text-[16px] font-semibold">{program.title || "-"}</div>
      <div className="mt-1 text-[13.5px] text-n400">
        스터디장 {program.leaderName || "-"}
      </div>
      <div className="mt-[2px] text-[13px] text-n500">
        {formatYmd(program.eventBeginAt) || "-"} ~ {formatYmd(program.eventEndAt) || "-"}
      </div>
      <div className="mt-3 flex items-center gap-[10px]">
        <ProgressBar value={ratio} danger={delayed} />
        <div className="w-[38px] text-right text-[14px] text-n500">{ratio}%</div>
      </div>
    </div>
  );
}

function ThisWeekRow({
  session,
  today,
  onClick,
}: {
  session: SessionCrossListItem;
  today: string;
  onClick: () => void;
}) {
  const dday = session.actualYmd ? ddayText(session.actualYmd, today) : "";
  const near = dday === "D-DAY" || /^D-[0-3]$/.test(dday);

  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer items-start gap-3 hover:opacity-80"
    >
      <div className="w-[56px] flex-none pt-[2px] text-[14px] text-n500">
        {formatMd(session.actualYmd) || "-"}
      </div>
      <div className="min-w-0 flex-1">
        {dday && (
          <Badge tone={near ? "outline-accent" : "outline"}>{dday}</Badge>
        )}
        <div className="mt-[6px] text-[15px]">
          {session.academicProgramTitle || "-"}
          {session.seqno != null && ` · ${session.seqno}회차`}
          {session.curriculumTitle ? ` ${session.curriculumTitle}` : ""}
        </div>
      </div>
    </div>
  );
}

export function AcademicProgramDashboardPage() {
  const router = useRouter();
  const { data, status, errorMessage, reload } = useAcademicProgramDashboard();
  const today = todayInSeoul();

  // 활동 목록은 상태 필터를 `?status=` 쿼리로 받는다(views/academic-program-list)
  const goPrograms = (status?: string) =>
    router.push(
      status
        ? `${ROUTES.academicPrograms}?status=${status}`
        : ROUTES.academicPrograms,
    );

  return (
    <>
      <PageHeader
        title="학술 대시보드"
        subtitle="전체 활동 현황 · 이번 주 회차 · 승인 대기"
      />
      <PageBody>
        {status === "loading" && <DashboardSkeleton />}

        {status === "error" && (
          <EmptyState
            message={errorMessage || "학술 대시보드를 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: reload }}
          />
        )}

        {status === "ready" && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-3">
              <StatCard
                label="진행 중 활동"
                value={data.ongoingCount}
                hint={
                  data.ongoingByType.length
                    ? data.ongoingByType
                        .map((t) => `${t.typeCd} ${t.count}`)
                        .join(" · ")
                    : "진행 중인 활동이 없습니다"
                }
                onClick={() => goPrograms("ONGOING")}
              />
              <StatCard
                label="지연 활동"
                value={data.delayedCount}
                hint="진행률 40% 미만 (근사)"
                tone={data.delayedCount > 0 ? "danger" : "default"}
                onClick={() => goPrograms("ONGOING")}
              />
              <StatCard
                label="승인 대기"
                value={data.pendingSessionCount}
                hint="제출된 회차 기록"
                tone={data.pendingSessionCount > 0 ? "accent" : "default"}
                onClick={() => router.push(ROUTES.academicProgramSessionReviews)}
              />
            </div>

            <Card>
              <CardTitle
                right={
                  <span
                    onClick={() => goPrograms()}
                    className="cursor-pointer text-[14px] text-accent hover:underline"
                  >
                    전체보기
                  </span>
                }
              >
                진행 중 활동
              </CardTitle>
              {data.ongoingPrograms.length === 0 ? (
                <div className="py-6 text-center text-[15px] text-n500">
                  진행 중인 활동이 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
                  {data.ongoingPrograms.map((program) => (
                    <OngoingProgramCard
                      key={program.academicProgramId}
                      program={program}
                      onClick={() =>
                        router.push(
                          ROUTES.academicProgramDetail(program.academicProgramId),
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </Card>

            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.5fr_1fr]">
              <Card>
                <CardTitle
                  right={
                    <span className="text-[14px] text-n500">
                      {data.thisWeekSessions.length}건
                    </span>
                  }
                >
                  이번 주 회차
                </CardTitle>
                {data.thisWeekSessions.length === 0 ? (
                  <div className="py-6 text-center text-[15px] text-n500">
                    이번 주에 진행일이 잡힌 회차가 없습니다.
                  </div>
                ) : (
                  <div className="flex flex-col gap-[13px]">
                    {data.thisWeekSessions.map((session) => (
                      <ThisWeekRow
                        key={session.sessionId}
                        session={session}
                        today={today}
                        onClick={() =>
                          router.push(
                            ROUTES.academicProgramSessionDetail(
                              session.academicProgramId,
                              session.sessionId,
                            ),
                          )
                        }
                      />
                    ))}
                  </div>
                )}
                <div className="mt-4 text-[12.5px] text-n500">
                  진행일(actl_ymd) 기준입니다 — 활동 횡단 회차 응답에 계획일이 없어 아직
                  진행되지 않은 예정 회차는 포함되지 않습니다.
                </div>
              </Card>

              <Card>
                <CardTitle
                  right={
                    <span
                      onClick={() => goPrograms()}
                      className="cursor-pointer text-[14px] text-accent hover:underline"
                    >
                      전체보기
                    </span>
                  }
                >
                  최근 활동
                </CardTitle>
                {data.recentPrograms.length === 0 ? (
                  <div className="py-6 text-center text-[15px] text-n500">
                    등록된 활동이 없습니다.
                  </div>
                ) : (
                  <div className="flex flex-col gap-[14px]">
                    {data.recentPrograms.map((program) => (
                      <div
                        key={program.academicProgramId}
                        onClick={() =>
                          router.push(
                            ROUTES.academicProgramDetail(program.academicProgramId),
                          )
                        }
                        className="cursor-pointer hover:opacity-80"
                      >
                        <div className="flex items-center gap-[7px]">
                          <Badge tone={acdmActvSttsTone(program.sttsCd)}>
                            {ACDM_ACTV_STTS_NM[program.sttsCd]}
                          </Badge>
                          <Badge tone="grey">{program.typeCd}</Badge>
                        </div>
                        <div className="mt-[5px] text-[14.5px] text-n400">
                          {program.title || "-"} · 스터디장 {program.leaderName || "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </PageBody>
    </>
  );
}
