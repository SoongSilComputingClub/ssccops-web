"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApprovalStore, type Approval } from "@/entities/approval";
import { CAL_EVENTS } from "@/entities/event";
import { useSubWorkStore, type SubWork } from "@/entities/sub-work";
import { RejectSheet, useApprovalActions } from "@/features/approval";
import { CAL_YEAR, STAGES } from "@/shared/config/constants";
import { ROUTES } from "@/shared/config/routes";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  Chip,
  GridTable,
  MonthCalendar,
  PageBody,
  PageHeader,
  ProgressBar,
  flash,
  type GridColumn,
} from "@/shared/ui";

const MY_FILTERS = ["전체", "마감임박", "지연"] as const;

export function DashboardPage() {
  const router = useRouter();
  const approvals = useApprovalStore((s) => s.approvals);
  const tasks = useSubWorkStore((s) => s.tasks);
  const { decide } = useApprovalActions();

  const [myFilter, setMyFilter] = useState<(typeof MY_FILTERS)[number]>("전체");
  const [month, setMonth] = useState(7); // 0-based → 8월
  const [selDay, setSelDay] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Approval | null>(null);

  const pending = approvals.filter((a) => a.state === "대기");
  const weekEvents = CAL_EVENTS.filter((e) => e.m === 8 && e.d >= 9 && e.d <= 23).slice(0, 6);
  const myTasks = tasks.filter((t) => myFilter === "전체" || t.flag === myFilter);
  const monthEvents = CAL_EVENTS.filter((e) => e.m === month + 1);
  const selDayEvents = selDay ? monthEvents.filter((e) => e.d === selDay) : [];

  const openEvent = (task: string) => {
    if (task) router.push(ROUTES.taskDetail(task));
    else flash("연결된 하위 업무가 없습니다");
  };

  const approvalColumns: GridColumn<Approval>[] = [
    {
      key: "title",
      header: "하위 업무명",
      width: "2fr",
      render: (a) => (
        <span
          onClick={() => router.push(ROUTES.taskDetail(a.task))}
          className="cursor-pointer font-semibold hover:text-accent"
        >
          {a.title}
        </span>
      ),
    },
    { key: "owner", header: "담당자", width: ".8fr", render: (a) => <span className="text-n400">{a.owner}</span> },
    { key: "date", header: "마감", width: ".8fr", render: (a) => <span className="text-n400">{a.requested}</span> },
    {
      key: "type",
      header: "유형",
      width: ".9fr",
      render: (a) => <Badge tone="grey">{a.type}</Badge>,
    },
    {
      key: "actions",
      header: "조치",
      width: "150px",
      align: "right",
      render: (a) => (
        <span className="flex justify-end gap-[7px]">
          <Button variant="ghost-danger" size="sm" onClick={() => setRejectTarget(a)}>
            반려
          </Button>
          <Button size="sm" onClick={() => decide(a.id, a.task, true)}>
            승인
          </Button>
        </span>
      ),
    },
  ];

  const taskColumns: GridColumn<SubWork>[] = [
    {
      key: "title",
      header: "하위 업무명",
      width: "2fr",
      render: (t) => (
        <span
          onClick={() => router.push(ROUTES.taskDetail(t.id))}
          className="cursor-pointer font-semibold hover:text-accent"
        >
          {t.title}
        </span>
      ),
    },
    {
      key: "stage",
      header: "단계",
      width: ".7fr",
      render: (t) => (
        <Badge tone={t.stage >= 4 ? "outline-accent" : "outline"}>
          {STAGES[t.stage - 1]}
        </Badge>
      ),
    },
    {
      key: "due",
      header: "마감일",
      width: ".9fr",
      render: (t) => (
        <span className="flex items-center gap-2">
          <span className={t.flag === "지연" ? "text-danger" : undefined}>{t.due}</span>
          {t.flag && (
            <Badge tone={t.flag === "지연" ? "red" : "outline-accent"}>{t.flag}</Badge>
          )}
        </span>
      ),
    },
    {
      key: "progress",
      header: "진행률",
      width: "1.2fr",
      render: (t) => (
        <span className="flex items-center gap-[10px]">
          <ProgressBar value={t.progress} danger={t.flag === "지연"} />
          <span className="w-[38px] text-right text-[14px] text-n500">
            {t.progress}%
          </span>
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="운영 대시보드"
        subtitle="승인 대기 · 캘린더 · 내 업무"
        action={{ label: "+ 등록", onClick: () => router.push(ROUTES.operationNew) }}
      />
      <PageBody>
        <div className="grid grid-cols-[1.7fr_1fr] items-start gap-4">
          <Card>
            <CardTitle
              right={<div className="text-[14px] text-accent">{pending.length}건</div>}
            >
              승인 대기 목록
            </CardTitle>
            <GridTable
              columns={approvalColumns}
              rows={pending}
              rowKey={(a) => a.id}
              dense
              empty={
                <div className="py-6 text-center text-[15px] text-n500">
                  승인 대기 중인 하위 업무가 없습니다.
                </div>
              }
            />
          </Card>

          <Card>
            <CardTitle>이번 주 운영 캘린더</CardTitle>
            <div className="flex flex-col gap-[13px]">
              {weekEvents.map((e) => (
                <div
                  key={e.id}
                  onClick={() => openEvent(e.task)}
                  className="flex cursor-pointer items-start gap-3 hover:opacity-80"
                >
                  <div className="w-[52px] flex-none pt-[2px] text-[14px] text-n500">
                    {e.m}/{e.d} {e.dow}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Badge tone={e.type === "마감" ? "outline-red" : "outline-accent"}>
                      {e.type}
                    </Badge>
                    <div className="mt-[6px] text-[15.5px]">{e.title}</div>
                  </div>
                </div>
              ))}
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
          <GridTable columns={taskColumns} rows={myTasks} rowKey={(t) => t.id} dense />
        </Card>

        <Card className="mt-4">
          <div className="mb-[14px] flex items-center gap-3">
            <div className="text-[18px] font-medium">
              {CAL_YEAR}년 {month + 1}월
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMonth((m) => Math.max(0, m - 1));
                setSelDay(null);
              }}
            >
              이전 달
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMonth((m) => Math.min(11, m + 1));
                setSelDay(null);
              }}
            >
              다음 달
            </Button>
          </div>
          <MonthCalendar
            year={CAL_YEAR}
            month={month}
            events={monthEvents.map((e) => ({ day: e.d, title: e.title }))}
            selectedDay={selDay}
            onSelectDay={setSelDay}
          />
          {selDay !== null && (
            <div className="mt-4">
              <div className="mb-[10px] text-[14px] tracking-[.4px] text-n400">
                {month + 1}/{selDay} 일정
              </div>
              <div className="flex flex-col gap-[9px]">
                {selDayEvents.length === 0 ? (
                  <div className="text-[14.5px] text-n500">
                    해당 날짜에 일정이 없습니다.
                  </div>
                ) : (
                  selDayEvents.map((e) => (
                    <div
                      key={e.id}
                      onClick={() => openEvent(e.task)}
                      className="flex cursor-pointer items-center gap-[11px] rounded-[12px] border border-line px-[13px] py-[11px] transition-colors hover:border-accent"
                    >
                      <Badge tone={e.type === "마감" ? "outline-red" : "outline-accent"}>
                        {e.type}
                      </Badge>
                      <div className="text-[15.5px]">{e.title}</div>
                      <div className="flex-1" />
                      <div className="text-[14px] text-accent">하위 업무 상세 ›</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </Card>

        <RejectSheet
          open={rejectTarget !== null}
          onClose={() => setRejectTarget(null)}
          onReject={(reason) => {
            if (rejectTarget) decide(rejectTarget.id, rejectTarget.task, false, reason);
          }}
        />
      </PageBody>
    </>
  );
}
