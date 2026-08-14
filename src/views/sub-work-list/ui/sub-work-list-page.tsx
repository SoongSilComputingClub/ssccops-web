"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMbrStore } from "@/entities/member";
import { findOper, useOperStore } from "@/entities/oper";
import {
  chckPrgrsRt,
  isSubWorkDone,
  ownerMbrId,
  subWorkSttsBadge,
  useSubWorkStore,
  type SubWork,
} from "@/entities/sub-work";
import {
  findSubWorkType,
  subWorkTypeNm,
  subWorkTypeTone,
  useSubWorkTypeStore,
} from "@/entities/sub-work-type";
import { useWorkStore } from "@/entities/work";
import { ROUTES } from "@/shared/config/routes";
import { deadlineFlag, formatMd } from "@/shared/lib/date";
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
  const { subWorks, subWorkChckLists, subWorkPicAltmnts } = useSubWorkStore();
  const works = useWorkStore((s) => s.works);
  const opers = useOperStore((s) => s.opers);
  const mbrs = useMbrStore((s) => s.mbrs);
  const subWorkTypes = useSubWorkTypeStore((s) => s.subWorkTypes);
  const [tab, setTab] = useState<(typeof TABS)[number]>("전체");

  const filtered = subWorks.filter((sw) => {
    if (tab === "전체") return true;
    if (tab === "완료") return isSubWorkDone(sw);
    if (tab === "승인대기") return sw.aprvSttsCd === "PENDING";
    if (tab === "진행") return !isSubWorkDone(sw);
    return deadlineFlag(sw.ddlnDt, sw.dlyYn) === tab;
  });

  /** 상위 업무의 운영_제목 */
  const parentTtl = (sw: SubWork) => {
    const work = works.find((w) => w.workId === sw.workId);
    return work ? findOper(opers, work.operId)?.operTtl : undefined;
  };
  const mbrNmOf = (mbrId: number | undefined) =>
    mbrs.find((m) => m.mbrId === mbrId)?.mbrNm ?? "-";

  const columns: GridColumn<SubWork>[] = [
    {
      key: "subWorkTtl",
      header: "하위 업무",
      width: "1.4fr",
      render: (sw) => (
        <span className="font-semibold hover:text-accent">{sw.subWorkTtl}</span>
      ),
    },
    {
      key: "workId",
      header: "상위 업무",
      width: "1fr",
      render: (sw) => {
        const ttl = parentTtl(sw);
        return ttl ? <Badge tone="grey">{ttl}</Badge> : <Badge tone="red">미연결</Badge>;
      },
    },
    {
      key: "subWorkTypeId",
      header: "하위_업무_유형",
      width: ".9fr",
      render: (sw) => (
        <Badge tone={subWorkTypeTone(findSubWorkType(subWorkTypes, sw.subWorkTypeId))}>
          {subWorkTypeNm(subWorkTypes, sw.subWorkTypeId)}
        </Badge>
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
      key: "ddlnDt",
      header: "마감_일시",
      width: ".8fr",
      render: (sw) => (
        <span
          className={
            deadlineFlag(sw.ddlnDt, sw.dlyYn) === "지연" ? "text-danger" : undefined
          }
        >
          {formatMd(sw.ddlnDt) || "-"}
        </span>
      ),
    },
    {
      key: "stts",
      header: "상태",
      width: ".9fr",
      render: (sw) => {
        const badge = subWorkSttsBadge(sw);
        return <Badge tone={badge.tone}>{badge.label}</Badge>;
      },
    },
    {
      key: "prgrs",
      header: "진행률",
      width: "120px",
      render: (sw) => {
        const rt = chckPrgrsRt(subWorkChckLists, sw.subWorkId);
        return (
          <span className="flex items-center gap-2">
            <ProgressBar value={rt} danger={sw.dlyYn} />
            <span className="w-[34px] text-right text-[13.5px] text-n500">{rt}%</span>
          </span>
        );
      },
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
            {filtered.length}건 · 전체 {subWorks.length}건
          </div>
        </div>

        <Card className="px-5 pt-4 pb-[6px]">
          <GridTable
            columns={columns}
            rows={filtered}
            rowKey={(sw) => String(sw.subWorkId)}
            onRowClick={(sw) => router.push(ROUTES.subWorkDetail(sw.subWorkId))}
            dense
            empty={<EmptyState message="조건에 맞는 하위 업무가 없습니다." />}
          />
        </Card>
      </PageBody>
    </>
  );
}
