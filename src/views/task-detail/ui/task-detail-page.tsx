"use client";

import { useState } from "react";
import { useApprovalStore } from "@/entities/approval";
import { subWorkTypeTone, useSubWorkStore } from "@/entities/sub-work";
import { useWorkStore } from "@/entities/work";
import { RejectSheet, useApprovalActions } from "@/features/approval";
import { STAGES } from "@/shared/config/constants";
import {
  Badge,
  Button,
  Card,
  CircleStepper,
  EmptyState,
  KeyValueGrid,
  PageBody,
  PageHeader,
  SectionLabel,
  flash,
} from "@/shared/ui";

export function TaskDetailPage({ taskId }: { taskId: string }) {
  const task = useSubWorkStore((s) => s.tasks.find((t) => t.id === taskId));
  const toggleCheck = useSubWorkStore((s) => s.toggleCheck);
  const updateTask = useSubWorkStore((s) => s.updateTask);
  const works = useWorkStore((s) => s.works);
  const approval = useApprovalStore((s) =>
    s.approvals.find((a) => a.task === taskId && a.state === "대기"),
  );
  const { decide, rejectTask } = useApprovalActions();
  const [rejectOpen, setRejectOpen] = useState(false);

  if (!task) {
    return (
      <>
        <PageHeader title="하위 업무 상세" showBack />
        <PageBody>
          <EmptyState message="하위 업무를 찾을 수 없습니다." />
        </PageBody>
      </>
    );
  }

  const parent = works.find((w) => w.subs.includes(task.id));
  const pending = task.approval === "대기";
  const canRequest = !pending && task.stage < 4 && task.progress < 100;
  const done = task.checklist.filter((c) => c.done).length;

  const approve = () => {
    if (approval) {
      decide(approval.id, task.id, true);
    } else {
      updateTask(task.id, { approval: "", stage: 4, progress: 100 });
      flash("완료 승인했습니다");
    }
  };

  const requestApproval = () => {
    updateTask(task.id, { approval: "대기", stage: 3 });
    flash("완료 승인을 요청했습니다");
  };

  return (
    <>
      <PageHeader title="하위 업무 상세" subtitle="단계 · 체크리스트 · 승인" showBack />
      <PageBody>
        <Card className="mb-4">
          <div className="flex items-center gap-[10px]">
            <div className="text-[24px] font-medium">{task.title}</div>
            <Badge tone={subWorkTypeTone(task.type)}>{task.type}</Badge>
            {pending && <Badge tone="amber">승인 대기</Badge>}
            <div className="flex-1" />
            {pending ? (
              <div className="flex gap-[9px]">
                <Button variant="ghost-danger" onClick={() => setRejectOpen(true)}>
                  반려
                </Button>
                <Button onClick={approve}>완료 승인</Button>
              </div>
            ) : (
              canRequest && <Button onClick={requestApproval}>완료 승인 요청</Button>
            )}
          </div>
          <CircleStepper steps={STAGES} current={task.stage} className="mt-[22px]" />
          <div className="mt-[14px] text-center text-[13.5px] text-n400">
            완료 전환은 회장 · 국장 승인이 필요합니다.
          </div>
        </Card>

        <div className="grid grid-cols-2 items-start gap-4">
          <Card>
            <SectionLabel>공통 속성 · operation</SectionLabel>
            <KeyValueGrid
              className="mt-[10px] border-b border-black/8 pb-[14px]"
              items={[
                { k: "운영_ID", v: <span className="font-mono text-[13.5px]">{task.id}</span> },
                { k: "운영유형", v: "하위 업무 (sub_work)" },
                { k: "제목", v: task.title },
                { k: "상위 업무", v: parent ? parent.name : <Badge tone="red">미연결</Badge> },
                { k: "담당자", v: task.owner },
                { k: "기수", v: "제38대" },
              ]}
            />
            <SectionLabel className="mt-4 mb-[10px]">확장 속성 · sub_work</SectionLabel>
            <KeyValueGrid
              items={[
                { k: "담당자", v: task.owner },
                { k: "협업자", v: task.collab || "-" },
                {
                  k: "마감",
                  v: (
                    <span className="flex items-center gap-2">
                      {task.due} ({task.dday})
                      {task.flag && (
                        <Badge tone={task.flag === "지연" ? "red" : "outline-accent"}>
                          {task.flag}
                        </Badge>
                      )}
                    </span>
                  ),
                },
                { k: "유형", v: task.type },
                { k: "업무 내용", v: task.content },
              ]}
            />
            {task.link && (
              <div className="mt-[14px] cursor-pointer text-[14.5px] text-accent">
                {task.link} ↗
              </div>
            )}
            {task.reject && (
              <div className="mt-3 text-[14px] text-danger">반려 사유 · {task.reject}</div>
            )}
          </Card>

          <Card>
            <SectionLabel className="mb-[14px]">완료 체크리스트</SectionLabel>
            <div className="flex flex-col gap-[13px]">
              {task.checklist.map((c, i) => (
                <div
                  key={i}
                  onClick={() => toggleCheck(task.id, i)}
                  className="flex cursor-pointer items-center gap-[11px]"
                >
                  <div
                    className={
                      c.done
                        ? "flex size-[18px] flex-none items-center justify-center rounded-[6px] bg-accent-strong text-[11px] text-white"
                        : "size-[18px] flex-none rounded-[6px] shadow-[inset_0_0_0_1px_#d1d6db]"
                    }
                  >
                    {c.done ? "✓" : ""}
                  </div>
                  <div className={c.done ? "text-[15.5px] text-n400" : "text-[15.5px]"}>
                    {c.label}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-[14px] text-n500">
              {done}/{task.checklist.length} 완료
            </div>
          </Card>
        </div>

        <RejectSheet
          open={rejectOpen}
          onClose={() => setRejectOpen(false)}
          onReject={(reason) => rejectTask(task.id, reason)}
        />
      </PageBody>
    </>
  );
}
