"use client";

import { useRouter } from "next/navigation";
import {
  LOW_ATTENDANCE_RATE,
  formatAttendanceRate,
} from "@/entities/academic-session";
import {
  useAttendanceStats,
  type LowAttendanceMember,
  type ProgramAttendanceRate,
} from "@/features/academic-session";
import { ROUTES } from "@/shared/config/routes";
import {
  Card,
  EmptyState,
  GridTable,
  PageBody,
  PageHeader,
  ProgressBar,
  SectionLabel,
  StatBox,
  type GridColumn,
} from "@/shared/ui";

/*
 * 출석 통계 (#130).
 *
 * ── 전용 엔드포인트가 없다 (결정 사항) ──────────────────────────
 * 서버에 출석 통계 API 가 없어 회차 이력·출석부 응답을 웹에서 집계한다. 그 계산은
 * features/academic-session/model/use-attendance-stats 훅 하나에만 있다 — 이 화면은
 * 훅이 낸 수치를 그리기만 한다. 활동 수가 크게 늘어 집계 조회(회차 수만큼의 출석부 호출)가
 * 느려지면 서버 집계 API 를 요청한다(그 판단 기준은 훅 주석에 있다).
 *
 * ── CSV 내보내기는 범위 밖 (#130 결정 사항) ────────────────────
 * 프로토타입 헤더에 있으나 서버 지원이 없다 — 필요하면 별도 이슈로 연다.
 *
 * ── 70% 기준 ─────────────────────────────────────────────────
 * 서버 값이 아니라 화면이 정한 상수다(LOW_ATTENDANCE_RATE · entities/academic-session).
 * 근거(수료 기준 2/3 올림)는 그 파일에 적혀 있고, 공개 앱 출석부 화면(#172)과 같은 값이다.
 */

function StatsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[76px] animate-pulse rounded-[12px] bg-black/5"
          />
        ))}
      </div>
      <Card className="animate-pulse">
        <div className="h-[18px] w-[120px] rounded bg-black/5" />
        <div className="mt-4 h-[160px] w-full rounded bg-black/5" />
      </Card>
    </div>
  );
}

function ProgramRateRow({ row }: { row: ProgramAttendanceRate }) {
  const value = row.rate ?? 0;
  const low = row.rate !== null && row.rate < LOW_ATTENDANCE_RATE;
  return (
    <div className="py-[11px]">
      <div className="flex items-center justify-between gap-3 text-[14px]">
        <span className="min-w-0 truncate">
          {row.academicProgramTitle || "-"}
          <span className="ml-2 text-[13px] text-n500">
            {row.sessionCount}회차
          </span>
        </span>
        <span
          className={low ? "flex-none text-danger" : "flex-none text-n400"}
        >
          {formatAttendanceRate(row.rate)}
        </span>
      </div>
      <div className="mt-[6px] flex items-center gap-[10px]">
        <ProgressBar value={value} danger={low} />
      </div>
    </div>
  );
}

export function AttendanceStatsPage() {
  const router = useRouter();
  const {
    status,
    errorMessage,
    reload,
    totalSessionCount,
    overallRate,
    lowAttendanceMemberCount,
    programRates,
    lowAttendanceMembers,
  } = useAttendanceStats();

  const memberColumns: GridColumn<LowAttendanceMember>[] = [
    {
      key: "member",
      header: "회원",
      width: "1fr",
      mobilePrimary: true,
      render: (row) => row.memberName || "-",
    },
    {
      key: "programs",
      header: "활동",
      width: "1.4fr",
      render: (row) => (
        <span className="min-w-0 truncate">
          {row.programTitles.length > 0 ? row.programTitles.join(", ") : "-"}
        </span>
      ),
    },
    {
      key: "attended",
      header: "출석",
      width: ".7fr",
      align: "right",
      render: (row) => `${row.attendedCount}/${row.sessionCount}`,
    },
    {
      key: "rate",
      header: "출석률",
      width: ".7fr",
      align: "right",
      render: (row) => (
        <span className="text-danger">{formatAttendanceRate(row.rate)}</span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="출석 통계"
        subtitle="전체 활동의 출석 현황을 집계합니다"
      />
      <PageBody maxWidth={1100}>
        {status === "loading" && <StatsSkeleton />}

        {status === "error" && (
          <EmptyState
            message={errorMessage || "출석 통계를 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: reload }}
          />
        )}

        {status === "ready" && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatBox
                label="집계 회차"
                value={`${totalSessionCount}회차`}
              />
              <StatBox
                label="전체 평균 출석률"
                value={formatAttendanceRate(overallRate)}
              />
              <StatBox
                label={`출석률 ${LOW_ATTENDANCE_RATE}% 미만 회원`}
                value={`${lowAttendanceMemberCount}명`}
                tone={lowAttendanceMemberCount > 0 ? "danger" : "default"}
              />
            </div>

            <Card>
              <SectionLabel className="mb-1">활동별 출석률</SectionLabel>
              {programRates.length === 0 ? (
                <EmptyState
                  message="집계할 회차가 없습니다."
                  padding="sm"
                />
              ) : (
                <div className="flex flex-col divide-y divide-black/6">
                  {programRates.map((row) => (
                    <ProgramRateRow key={row.academicProgramId} row={row} />
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <SectionLabel className="mb-3">
                출석률이 낮은 회원
                <span className="ml-2 text-[13px] font-normal text-n500">
                  {LOW_ATTENDANCE_RATE}% 미만
                </span>
              </SectionLabel>
              <GridTable
                columns={memberColumns}
                rows={lowAttendanceMembers}
                rowKey={(row) => String(row.eventParticipantId)}
                empty={
                  <EmptyState
                    message={`출석률이 ${LOW_ATTENDANCE_RATE}% 미만인 회원이 없습니다.`}
                    padding="sm"
                  />
                }
              />
            </Card>

            <div className="text-[13px] text-n500">
              회차 진행 내역은{" "}
              <button
                type="button"
                onClick={() => router.push(ROUTES.academicProgramSessions)}
                className="cursor-pointer text-accent underline"
              >
                회차 이력
              </button>
              에서 확인합니다.
            </div>
          </div>
        )}
      </PageBody>
    </>
  );
}
