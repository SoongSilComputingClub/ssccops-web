"use client";

import { useRouter } from "next/navigation";
import { findOper, useOperStore } from "@/entities/oper";
import { useSubWorkStore } from "@/entities/sub-work";
import { useMbrStore } from "@/entities/member";
import { useWorkStore, workSttsTone, type Work } from "@/entities/work";
import { WORK_STTS_NM, WORK_TYPE_NM } from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import { formatYmd } from "@/shared/lib/date";
import { Badge, Card, PageBody, PageHeader, ProgressBar } from "@/shared/ui";

export function WorkListPage() {
  const router = useRouter();
  const works = useWorkStore((s) => s.works);
  const opers = useOperStore((s) => s.opers);
  const subWorks = useSubWorkStore((s) => s.subWorks);
  const mbrs = useMbrStore((s) => s.mbrs);

  const subCountOf = (w: Work) =>
    subWorks.filter((sw) => sw.workId === w.workId).length;
  const mbrNmOf = (mbrId: number | undefined) =>
    mbrs.find((m) => m.mbrId === mbrId)?.mbrNm ?? "-";

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
            const oper = findOper(opers, w.operId);
            const prgrs = Math.round(w.workPrgrsRt);
            return (
              <Card
                key={w.workId}
                onClick={() => router.push(ROUTES.workDetail(w.workId))}
              >
                <div className="flex items-center gap-2">
                  <Badge tone={workSttsTone(w.workSttsCd)}>
                    {WORK_STTS_NM[w.workSttsCd]}
                  </Badge>
                  <Badge tone="grey">{WORK_TYPE_NM[w.workTypeCd]}</Badge>
                  <div className="flex-1" />
                  <div className="text-[13.5px] text-n500">
                    하위 업무 {subCountOf(w)}건
                  </div>
                </div>
                <div className="mt-2 text-[18px] font-semibold">
                  {oper?.operTtl ?? "-"}
                </div>
                <div className="mt-1 text-[14px] text-n400">
                  담당 {mbrNmOf(oper?.picId)}
                </div>
                <div className="mt-[2px] text-[13.5px] text-n500">
                  {formatYmd(oper?.bgngDt ?? null)} ~ {formatYmd(oper?.endDt ?? null)}
                </div>
                <div className="mt-3 flex items-center gap-[10px]">
                  <ProgressBar value={prgrs} />
                  <div className="w-[38px] text-right text-[14px] text-n500">
                    {prgrs}%
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
