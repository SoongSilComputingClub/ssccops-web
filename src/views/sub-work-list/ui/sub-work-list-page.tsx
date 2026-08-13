"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  isSubWorkDone,
  subWorkStatus,
  subWorkTypeTone,
  useSubWorkStore,
  type SubWork,
} from "@/entities/sub-work";
import { useWorkStore } from "@/entities/work";
import { ROUTES } from "@/shared/config/routes";
import {
  Badge,
  Card,
  Chip,
  EmptyState,
  GridTable,
  PageBody,
  PageHeader,
  ProgressBar,
  type GridColumn,
} from "@/shared/ui";

const TABS = ["전체", "진행", "승인대기", "마감임박", "지연", "완료"] as const;

export function SubWorkListPage() {
  const router = useRouter();
  const tasks = useSubWorkStore((s) => s.tasks);
  const works = useWorkStore((s) => s.works);
  const [tab, setTab] = useState<(typeof TABS)[number]>("전체");

  const filtered = tasks.filter((t) => {
    if (tab === "전체") return true;
    if (tab === "완료") return isSubWorkDone(t);
    if (tab === "승인대기") return t.approval === "대기";
    if (tab === "진행") return !isSubWorkDone(t);
    return t.flag === tab;
  });

  const parentOf = (t: SubWork) => works.find((w) => w.subs.includes(t.id));

  const columns: GridColumn<SubWork>[] = [
    {
      key: "title",
      header: "하위 업무",
      width: "1.4fr",
      render: (t) => <span className="font-semibold hover:text-accent">{t.title}</span>,
    },
    {
      key: "parent",
      header: "상위 업무",
      width: "1fr",
      render: (t) => {
        const parent = parentOf(t);
        return parent ? (
          <Badge tone="grey">{parent.name}</Badge>
        ) : (
          <Badge tone="red">미연결</Badge>
        );
      },
    },
    {
      key: "type",
      header: "유형",
      width: ".9fr",
      render: (t) => <Badge tone={subWorkTypeTone(t.type)}>{t.type}</Badge>,
    },
    {
      key: "owner",
      header: "담당자",
      width: ".8fr",
      render: (t) => <span className="text-n400">{t.owner.split(" · ")[0]}</span>,
    },
    {
      key: "due",
      header: "마감",
      width: ".8fr",
      render: (t) => (
        <span className={t.flag === "지연" ? "text-danger" : undefined}>{t.due}</span>
      ),
    },
    {
      key: "status",
      header: "상태",
      width: ".9fr",
      render: (t) => {
        const s = subWorkStatus(t);
        return <Badge tone={s.tone}>{s.label}</Badge>;
      },
    },
    {
      key: "progress",
      header: "진행률",
      width: "120px",
      render: (t) => (
        <span className="flex items-center gap-2">
          <ProgressBar value={t.progress} danger={t.flag === "지연"} />
          <span className="w-[34px] text-right text-[13.5px] text-n500">
            {t.progress}%
          </span>
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="하위 업무" subtitle="실행 단위 · 승인 · 진행률" />
      <PageBody>
        <div className="mb-[14px] flex items-center gap-[7px]">
          {TABS.map((t) => (
            <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
              {t}
            </Chip>
          ))}
          <div className="flex-1" />
          <div className="text-[14px] text-n500">
            {filtered.length}건 · 전체 {tasks.length}건
          </div>
        </div>

        <Card className="px-5 pt-4 pb-[6px]">
          <GridTable
            columns={columns}
            rows={filtered}
            rowKey={(t) => t.id}
            onRowClick={(t) => router.push(ROUTES.taskDetail(t.id))}
            dense
            empty={<EmptyState message="조건에 맞는 하위 업무가 없습니다." />}
          />
        </Card>
      </PageBody>
    </>
  );
}
