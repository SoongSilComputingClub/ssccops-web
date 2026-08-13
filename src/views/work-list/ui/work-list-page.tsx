"use client";

import { useRouter } from "next/navigation";
import { useSubWorkStore } from "@/entities/sub-work";
import { useWorkStore, workStatusTone, type Work } from "@/entities/work";
import { ROUTES } from "@/shared/config/routes";
import { Badge, Card, PageBody, PageHeader, ProgressBar } from "@/shared/ui";

export function WorkListPage() {
  const router = useRouter();
  const works = useWorkStore((s) => s.works);
  const tasks = useSubWorkStore((s) => s.tasks);

  const progressOf = (w: Work) => {
    const subs = tasks.filter((t) => w.subs.includes(t.id));
    if (subs.length === 0) return 0;
    return Math.round(subs.reduce((acc, t) => acc + t.progress, 0) / subs.length);
  };

  return (
    <>
      <PageHeader
        title="업무"
        subtitle="행사 · 상시 · 정례 운영"
        action={{ label: "+ 등록", onClick: () => router.push(ROUTES.operationNew) }}
      />
      <PageBody>
        <div className="grid grid-cols-2 gap-[14px]">
          {works.map((w) => {
            const progress = progressOf(w);
            return (
              <Card key={w.id} onClick={() => router.push(ROUTES.workDetail(w.id))}>
                <div className="flex items-center gap-2">
                  <Badge tone={workStatusTone(w.status)}>{w.status}</Badge>
                  <Badge tone="grey">{w.type}</Badge>
                  <div className="flex-1" />
                  <div className="text-[13.5px] text-n500">
                    하위 업무 {w.subs.length}건
                  </div>
                </div>
                <div className="mt-2 text-[18px] font-semibold">{w.name}</div>
                <div className="mt-1 text-[14px] text-n400">
                  {w.owner} · {w.term}
                </div>
                <div className="mt-[2px] text-[13.5px] text-n500">
                  {w.start} ~ {w.end}
                </div>
                <div className="mt-3 flex items-center gap-[10px]">
                  <ProgressBar value={progress} />
                  <div className="w-[38px] text-right text-[14px] text-n500">
                    {progress}%
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </PageBody>
    </>
  );
}
