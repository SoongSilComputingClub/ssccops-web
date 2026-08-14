"use client";

import { useRouter } from "next/navigation";
import { useMbrStore } from "@/entities/member";
import { findOper, useOperStore } from "@/entities/oper";
import {
  chckPrgrsRt,
  ownerMbrId,
  subWorkSttsBadge,
  useSubWorkStore,
  type SubWork,
} from "@/entities/sub-work";
import { useWorkStore, workSttsTone } from "@/entities/work";
import {
  OPER_TYPE_NM,
  PRRTY_RNK_NM,
  WORK_STTS_NM,
  WORK_TYPE_NM,
} from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import { formatDt } from "@/shared/lib/date";
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

export function WorkDetailPage({ workId }: { workId: number }) {
  const router = useRouter();
  const work = useWorkStore((s) => s.works.find((w) => w.workId === workId));
  const opers = useOperStore((s) => s.opers);
  const { subWorks, subWorkChckLists, subWorkPicAltmnts } = useSubWorkStore();
  const mbrs = useMbrStore((s) => s.mbrs);

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

  const oper = findOper(opers, work.operId);
  const subs = subWorks.filter((sw) => sw.workId === work.workId);
  const prgrs = Math.round(work.workPrgrsRt);
  const mbrNmOf = (mbrId: number | undefined) =>
    mbrs.find((m) => m.mbrId === mbrId)?.mbrNm ?? "-";

  const columns: GridColumn<SubWork>[] = [
    {
      key: "subWorkTtl",
      header: "하위 업무명",
      width: "2fr",
      render: (sw) => (
        <span className="font-semibold hover:text-accent">{sw.subWorkTtl}</span>
      ),
    },
    {
      key: "pic",
      header: "담당자",
      width: ".8fr",
      render: (sw) => (
        <span className="text-n400">
          {mbrNmOf(ownerMbrId(subWorkPicAltmnts, sw.subWorkId))}
        </span>
      ),
    },
    {
      key: "workSttsCd",
      header: "업무_상태",
      width: ".8fr",
      render: (sw) => {
        const badge = subWorkSttsBadge(sw);
        return sw.aprvSttsCd === "PENDING" ? (
          <Badge tone={badge.tone}>{badge.label}</Badge>
        ) : (
          <Badge tone="outline">{WORK_STTS_NM[sw.workSttsCd]}</Badge>
        );
      },
    },
    {
      key: "prgrs",
      header: "진행률",
      width: "1.1fr",
      render: (sw) => {
        const rt = chckPrgrsRt(subWorkChckLists, sw.subWorkId);
        return (
          <span className="flex items-center gap-[10px]">
            <ProgressBar value={rt} danger={sw.dlyYn} />
            <span className="w-[38px] text-right text-[14px] text-n500">{rt}%</span>
          </span>
        );
      },
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
          onClick: () => router.push(`${ROUTES.operationNew}?workId=${work.workId}`),
        }}
      />
      <PageBody>
        <div className="grid grid-cols-[1fr_1.3fr] items-start gap-4">
          <Card>
            <div className="flex items-center gap-2">
              <Badge tone={workSttsTone(work.workSttsCd)}>
                {WORK_STTS_NM[work.workSttsCd]}
              </Badge>
              <div className="text-[14px] text-n400">
                {WORK_TYPE_NM[work.workTypeCd]}
              </div>
            </div>
            <div className="mt-2 text-[23px] font-medium">{oper?.operTtl ?? "-"}</div>
            <div className="mt-3 flex items-center gap-[10px]">
              <ProgressBar value={prgrs} height={6} />
              <div className="text-[14px] text-accent">{prgrs}%</div>
            </div>

            <SectionLabel className="mt-5">상위 속성 · oper</SectionLabel>
            <KeyValueGrid
              className="mt-[10px] border-b border-black/8 pb-[14px]"
              labelWidth={88}
              items={[
                {
                  k: "운영_ID",
                  v: <span className="font-mono text-[13.5px]">{work.operId}</span>,
                },
                {
                  k: "운영_유형",
                  v: oper ? OPER_TYPE_NM[oper.operTypeCd] : "-",
                },
                { k: "운영_제목", v: oper?.operTtl ?? "-" },
                {
                  k: "우선_순위",
                  v: oper ? PRRTY_RNK_NM[oper.prrtyRnkCd] : "-",
                },
                { k: "담당자_ID", v: mbrNmOf(oper?.picId) },
                {
                  k: "기간",
                  v: `${formatDt(oper?.bgngDt ?? null)} ~ ${formatDt(oper?.endDt ?? null)}`,
                },
              ]}
            />

            <SectionLabel className="mt-4 mb-[10px]">확장 속성 · work</SectionLabel>
            <KeyValueGrid
              labelWidth={88}
              items={[
                {
                  k: "업무_ID",
                  v: <span className="font-mono text-[13.5px]">{work.workId}</span>,
                },
                { k: "업무_유형", v: WORK_TYPE_NM[work.workTypeCd] },
                { k: "업무_상태", v: WORK_STTS_NM[work.workSttsCd] },
                { k: "업무_진행_률", v: `${prgrs}%` },
                { k: "총평_내용", v: work.grvwCn || "-" },
              ]}
            />
          </Card>

          <Card>
            <SectionLabel className="mb-3">하위 업무</SectionLabel>
            <GridTable
              columns={columns}
              rows={subs}
              rowKey={(sw) => String(sw.subWorkId)}
              onRowClick={(sw) => router.push(ROUTES.subWorkDetail(sw.subWorkId))}
              dense
              empty={<EmptyState message="연결된 하위 업무가 없습니다." padding="sm" />}
            />
          </Card>
        </div>
      </PageBody>
    </>
  );
}
