"use client";

import { useRouter } from "next/navigation";
import { subWorkStatus, useSubWorkStore, type SubWork } from "@/entities/sub-work";
import { useWorkStore, workStatusTone } from "@/entities/work";
import { STAGES } from "@/shared/config/constants";
import { ROUTES } from "@/shared/config/routes";
import {
  Badge,
  Card,
  EmptyState,
  GridTable,
  KeyValueGrid,
  PageBody,
  PageHeader,
  ProgressBar,
  SectionLabel,
  type GridColumn,
} from "@/shared/ui";

export function WorkDetailPage({ workId }: { workId: string }) {
  const router = useRouter();
  const work = useWorkStore((s) => s.works.find((w) => w.id === workId));
  const tasks = useSubWorkStore((s) => s.tasks);

  if (!work) {
    return (
      <>
        <PageHeader title="업무 상세" showBack />
        <PageBody>
          <EmptyState message="업무를 찾을 수 없습니다." />
        </PageBody>
      </>
    );
  }

  const subs = tasks.filter((t) => work.subs.includes(t.id));
  const progress =
    subs.length === 0
      ? 0
      : Math.round(subs.reduce((acc, t) => acc + t.progress, 0) / subs.length);

  const columns: GridColumn<SubWork>[] = [
    {
      key: "title",
      header: "하위 업무명",
      width: "2fr",
      render: (t) => <span className="font-semibold hover:text-accent">{t.title}</span>,
    },
    { key: "owner", header: "담당자", width: ".8fr", render: (t) => <span className="text-n400">{t.owner.split(" · ")[0]}</span> },
    {
      key: "stage",
      header: "단계",
      width: ".8fr",
      render: (t) => {
        const s = subWorkStatus(t);
        return t.approval === "대기" ? (
          <Badge tone={s.tone}>{s.label}</Badge>
        ) : (
          <Badge tone="outline">{STAGES[t.stage - 1]}</Badge>
        );
      },
    },
    {
      key: "progress",
      header: "진행률",
      width: "1.1fr",
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
        title="업무 상세"
        subtitle="하위 업무 진행"
        showBack
        action={{
          label: "+ 하위 업무",
          onClick: () => router.push(`${ROUTES.operationNew}?parent=${work.id}`),
        }}
      />
      <PageBody>
        <div className="grid grid-cols-[1fr_1.3fr] items-start gap-4">
          <Card>
            <div className="flex items-center gap-2">
              <Badge tone={workStatusTone(work.status)}>{work.status}</Badge>
              <div className="text-[14px] text-n400">{work.type}</div>
            </div>
            <div className="mt-2 text-[23px] font-medium">{work.name}</div>
            <div className="mt-3 flex items-center gap-[10px]">
              <ProgressBar value={progress} height={6} />
              <div className="text-[14px] text-accent">{progress}%</div>
            </div>
            <SectionLabel className="mt-5">공통 속성 · operation</SectionLabel>
            <KeyValueGrid
              className="mt-[10px] border-b border-black/8 pb-[14px]"
              labelWidth={88}
              items={[
                { k: "운영_ID", v: <span className="font-mono text-[13.5px]">{work.id}</span> },
                { k: "운영유형", v: "업무 (work)" },
                { k: "제목", v: work.name },
                { k: "시작 일시", v: work.start },
                { k: "담당자", v: work.owner },
                { k: "기수", v: work.term },
              ]}
            />
            <SectionLabel className="mt-4 mb-[10px]">확장 속성 · work</SectionLabel>
            <KeyValueGrid
              labelWidth={88}
              items={[
                { k: "운영 유형", v: work.type },
                { k: "담당자", v: `${work.owner} · ${work.dept}` },
                { k: "기수", v: work.term },
                { k: "기간", v: `${work.start} ~ ${work.end}` },
                { k: "회고 내용", v: work.note || "-" },
              ]}
            />
          </Card>

          <Card>
            <SectionLabel className="mb-3">하위 업무</SectionLabel>
            <GridTable
              columns={columns}
              rows={subs}
              rowKey={(t) => t.id}
              onRowClick={(t) => router.push(ROUTES.taskDetail(t.id))}
              dense
              empty={<EmptyState message="연결된 하위 업무가 없습니다." padding="sm" />}
            />
          </Card>
        </div>
      </PageBody>
    </>
  );
}
