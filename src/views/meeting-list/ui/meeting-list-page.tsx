"use client";

import { useRouter } from "next/navigation";
import { useMbrStore } from "@/entities/member";
import { mtgDtlsOf, mtgSttsTone, useMtgStore } from "@/entities/meeting";
import { findOper, useOperStore } from "@/entities/oper";
import { ATND_TRGT_NM, MTG_SE_NM, MTG_STTS_NM } from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import { formatDt } from "@/shared/lib/date";
import { Badge, Card, PageBody, PageHeader } from "@/shared/ui";

export function MeetingListPage() {
  const router = useRouter();
  const { mtgs, mtgDtls } = useMtgStore();
  const opers = useOperStore((s) => s.opers);
  const mbrs = useMbrStore((s) => s.mbrs);

  const mbrNmOf = (mbrId: number) =>
    mbrs.find((m) => m.mbrId === mbrId)?.mbrNm ?? "-";

  return (
    <>
      <PageHeader title="회의" subtitle="정례 · 주제 회의" />
      <PageBody>
        <div className="grid grid-cols-2 gap-[14px]">
          {mtgs.map((m) => {
            const oper = findOper(opers, m.operId);
            return (
              <Card
                key={m.mtgId}
                onClick={() => router.push(ROUTES.meetingDetail(m.mtgId))}
              >
                <div className="flex items-center gap-2">
                  <Badge tone={mtgSttsTone(m.mtgSttsCd)}>
                    {m.mtgSttsCd ? MTG_STTS_NM[m.mtgSttsCd] : "-"}
                  </Badge>
                  <Badge tone="grey">{m.mtgSeCd ? MTG_SE_NM[m.mtgSeCd] : "-"}</Badge>
                  <span className="font-mono text-[12.5px] text-n500">
                    회의 #{m.mtgId}
                  </span>
                  <div className="flex-1" />
                  <div className="text-[13.5px] text-n500">
                    안건 {mtgDtlsOf(mtgDtls, m.mtgId).length}건
                  </div>
                </div>
                <div className="mt-2 text-[18px] font-semibold">
                  {oper?.operTtl ?? "-"}
                </div>
                <div className="mt-1 text-[14px] text-n400">
                  {formatDt(oper?.bgngDt ?? null)} · {m.mtgPlcNm ?? "-"}
                </div>
                <div className="mt-[2px] text-[13.5px] text-n500">
                  책임자 {mbrNmOf(m.mtgRbprsnId)} · 참석 대상{" "}
                  {m.atndTrgtCd ? ATND_TRGT_NM[m.atndTrgtCd] : "-"}
                </div>
              </Card>
            );
          })}
        </div>
      </PageBody>
    </>
  );
}
