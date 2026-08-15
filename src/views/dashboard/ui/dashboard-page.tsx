"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApprovalInboxItem } from "@/entities/approval";
import { CAPABILITY } from "@/entities/session";
import type { SubWorkListItem } from "@/entities/sub-work";
import { useCan } from "@/features/auth";
import { useDashboard } from "@/features/dashboard";
import { WORK_STTS_NM } from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import { daysUntil, ddayText, deadlineFlag, formatMd, todayInSeoul } from "@/shared/lib/date";
import {
  Badge,
  Card,
  CardTitle,
  Chip,
  EmptyState,
  GridTable,
  PageBody,
  PageHeader,
  ProgressBar,
  type GridColumn,
} from "@/shared/ui";

/*
 * 운영 대시보드 (ssccops-server OPS-038 · GET /v1/dashboard · ssccops-web#60).
 *
 * 목 스토어(subWorks·subWorkAprvs를 화면에서 이어 붙이던 방식)를 서버 응답 한 벌로 바꿨다 —
 * 승인 대기 미리보기 · 다가오는 마감(±5일) · 내 업무 목록(담당자 본인 전량)을 모두 서버가
 * 계산해 내려주므로 더 이상 클라이언트가 여러 스토어를 조인하지 않는다(승인함 #45·하위 업무
 * 목록 #41이 밟은 경로와 같다).
 *
 * 승인 대기 카드는 이슈 설명의 UI 변경 계획을 반영해 반려·승인 버튼을 두지 않는다 — 행을
 * 클릭하면 승인함(ROUTES.approvals)으로 이동하고, 그 화면이 `subWorkId` 쿼리로 해당 카드에
 * 스크롤·강조한다(승인함 쪽 구현은 features/approval의 useApprovalHighlight).
 */

const MY_FILTERS = ["전체", "마감임박", "지연"] as const;

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-[1.7fr_1fr] items-start gap-4">
      {[0, 1].map((i) => (
        <Card key={i} className="animate-pulse">
          <div className="h-[20px] w-2/5 rounded bg-black/5" />
          <div className="mt-3 h-[80px] w-full rounded bg-black/5" />
        </Card>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const router = useRouter();
  const { data, status, errorMessage, reload } = useDashboard();
  /* 헤더의 '+ 등록'은 운영 등록 화면으로 간다 — 그 화면의 업무·하위 업무 등록과 같은 권한이다 */
  const canManageWork = useCan(CAPABILITY.WORK_MANAGE);

  const [myFilter, setMyFilter] = useState<(typeof MY_FILTERS)[number]>("전체");
  // 서버가 Asia/Seoul 오프셋으로 내려주는 마감_일시와 같은 시간대로 D-day를 센다 (withServiceOffset과 같은 판단)
  const today = todayInSeoul();

  const goToSubWorkApproval = (subWorkId: number) =>
    router.push(`${ROUTES.approvals}?subWorkId=${subWorkId}`);

  const myTasks = data.myTasks.filter(
    (sw) => myFilter === "전체" || deadlineFlag(sw.dueAt, sw.isDelayed, today) === myFilter,
  );

  const approvalColumns: GridColumn<ApprovalInboxItem>[] = [
    {
      key: "title",
      header: "하위 업무명",
      width: "2fr",
      render: (item) => (
        <span
          onClick={() => goToSubWorkApproval(item.subWorkId)}
          className="cursor-pointer font-semibold hover:text-accent"
        >
          {item.title}
        </span>
      ),
    },
    {
      key: "registrantName",
      header: "요청자",
      width: ".8fr",
      render: (item) => <span className="text-n400">{item.registrantName ?? "-"}</span>,
    },
    {
      key: "dueAt",
      header: "마감_일시",
      width: ".8fr",
      render: (item) => <span className="text-n400">{formatMd(item.dueAt) || "-"}</span>,
    },
    {
      key: "subWorkTypeName",
      header: "하위_업무_유형",
      width: ".9fr",
      render: (item) => <Badge tone="grey">{item.subWorkTypeName || "-"}</Badge>,
    },
  ];

  const taskColumns: GridColumn<SubWorkListItem>[] = [
    {
      key: "title",
      header: "하위 업무명",
      width: "2fr",
      render: (sw) => (
        <span
          onClick={() => router.push(ROUTES.subWorkDetail(sw.subWorkId))}
          className="cursor-pointer font-semibold hover:text-accent"
        >
          {sw.title}
        </span>
      ),
    },
    {
      key: "workStatus",
      header: "업무_상태",
      width: ".7fr",
      render: (sw) => (
        <Badge tone={sw.workStatus === "DONE" ? "outline-accent" : "outline"}>
          {WORK_STTS_NM[sw.workStatus]}
        </Badge>
      ),
    },
    {
      key: "dueAt",
      header: "마감_일시",
      width: ".9fr",
      render: (sw) => {
        const flag = deadlineFlag(sw.dueAt, sw.isDelayed, today);
        return (
          <span className="flex items-center gap-2">
            <span className={flag === "지연" ? "text-danger" : undefined}>
              {formatMd(sw.dueAt) || "-"}
            </span>
            {flag && (
              <Badge tone={flag === "지연" ? "red" : "outline-accent"}>{flag}</Badge>
            )}
          </span>
        );
      },
    },
    {
      key: "progressRate",
      header: "진행률",
      width: "1.2fr",
      render: (sw) => (
        <span className="flex items-center gap-[10px]">
          <ProgressBar value={sw.progressRate} danger={sw.isDelayed} />
          <span className="w-[38px] text-right text-[14px] text-n500">
            {sw.progressRate}%
          </span>
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="운영 대시보드"
        subtitle="승인 대기 · 다가오는 마감 · 내 업무"
        action={{
          label: "+ 등록",
          onClick: () => router.push(ROUTES.operationNew),
          disabled: !canManageWork,
          title: canManageWork
            ? undefined
            : "업무를 등록할 권한이 없습니다 — 운영진 권한이 필요합니다",
        }}
      />
      <PageBody>
        {status === "loading" && <DashboardSkeleton />}

        {status === "error" && (
          <EmptyState
            message={errorMessage || "운영 대시보드를 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: reload }}
          />
        )}

        {status === "ready" && (
          <>
            <div className="grid grid-cols-[1.7fr_1fr] items-start gap-4">
              <Card>
                <CardTitle
                  right={
                    <span
                      onClick={() => router.push(ROUTES.approvals)}
                      className="cursor-pointer text-[14px] text-accent hover:underline"
                    >
                      전체보기
                    </span>
                  }
                >
                  승인 대기 목록
                </CardTitle>
                <GridTable
                  columns={approvalColumns}
                  rows={data.pendingApproval}
                  rowKey={(item) => String(item.subWorkId)}
                  dense
                  empty={
                    <div className="py-6 text-center text-[15px] text-n500">
                      승인 대기 중인 하위 업무가 없습니다.
                    </div>
                  }
                />
              </Card>

              <Card>
                <CardTitle>다가오는 마감</CardTitle>
                <div className="flex flex-col gap-[13px]">
                  {data.upcomingDeadlines.length === 0 ? (
                    <div className="text-[14.5px] text-n500">예정된 마감이 없습니다.</div>
                  ) : (
                    data.upcomingDeadlines.map((sw) => {
                      const flag = deadlineFlag(sw.dueAt, sw.isDelayed, today);
                      const d = daysUntil(sw.dueAt, today);
                      return (
                        <div
                          key={sw.subWorkId}
                          onClick={() => router.push(ROUTES.subWorkDetail(sw.subWorkId))}
                          className="flex cursor-pointer items-start gap-3 hover:opacity-80"
                        >
                          <div className="w-[64px] flex-none pt-[2px] text-[14px] text-n500">
                            {formatMd(sw.dueAt)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <Badge
                              tone={
                                flag === "지연"
                                  ? "outline-red"
                                  : d !== null && d <= 3
                                    ? "outline-accent"
                                    : "outline"
                              }
                            >
                              {ddayText(sw.dueAt, today)}
                            </Badge>
                            <div className="mt-[6px] text-[15.5px]">{sw.title}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>

            <Card className="mt-4">
              <div className="mb-[14px] flex items-center gap-3">
                <div className="text-[18px] font-medium">내 업무 목록</div>
                <div className="flex gap-[7px]">
                  {MY_FILTERS.map((f) => (
                    <Chip key={f} active={myFilter === f} onClick={() => setMyFilter(f)}>
                      {f}
                    </Chip>
                  ))}
                </div>
                <div className="flex-1" />
                <div className="text-[14px] text-n500">{myTasks.length}건</div>
              </div>
              <GridTable
                columns={taskColumns}
                rows={myTasks}
                rowKey={(sw) => String(sw.subWorkId)}
                dense
              />
            </Card>
          </>
        )}
      </PageBody>
    </>
  );
}
