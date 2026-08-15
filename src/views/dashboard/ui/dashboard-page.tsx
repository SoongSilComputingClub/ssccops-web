"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { aprvOf, useAprvStore } from "@/entities/approval";
import { useMbrStore } from "@/entities/member";
import {
  chckPrgrsRt,
  ownerMbrId,
  useSubWorkStore,
  type SubWork,
} from "@/entities/sub-work";
import { CAPABILITY } from "@/entities/session";
import { subWorkTypeNm, useSubWorkTypeStore } from "@/entities/sub-work-type";
import { RejectSheet, useApprovalActions } from "@/features/approval";
import { useCan } from "@/features/auth";
import { WORK_STTS_NM } from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import { daysUntil, ddayText, deadlineFlag, formatMd } from "@/shared/lib/date";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  Chip,
  GridTable,
  PageBody,
  PageHeader,
  ProgressBar,
  type GridColumn,
} from "@/shared/ui";

const MY_FILTERS = ["전체", "마감임박", "지연"] as const;

export function DashboardPage() {
  const router = useRouter();
  const { subWorks, subWorkChckLists, subWorkPicAltmnts } = useSubWorkStore();
  const subWorkAprvs = useAprvStore((s) => s.subWorkAprvs);
  const subWorkTypes = useSubWorkTypeStore((s) => s.subWorkTypes);
  const mbrs = useMbrStore((s) => s.mbrs);
  const { decide } = useApprovalActions();
  /* 헤더의 '+ 등록'은 운영 등록 화면으로 간다 — 그 화면의 업무·하위 업무 등록과 같은 권한이다 */
  const canManageWork = useCan(CAPABILITY.WORK_MANAGE);

  const [myFilter, setMyFilter] = useState<(typeof MY_FILTERS)[number]>("전체");
  const [rejectTarget, setRejectTarget] = useState<SubWork | null>(null);

  const mbrNmOf = (mbrId: number | undefined) =>
    mbrs.find((m) => m.mbrId === mbrId)?.mbrNm ?? "-";

  const pending = subWorks.filter((sw) => sw.aprvSttsCd === "PENDING");
  const myTasks = subWorks.filter(
    (sw) => myFilter === "전체" || deadlineFlag(sw.ddlnDt, sw.dlyYn) === myFilter,
  );

  /** 다가오는 마감 — 캘린더 테이블이 없어 하위 업무의 마감_일시에서 파생 */
  const upcoming = [...subWorks]
    .filter((sw) => sw.ddlnDt && sw.workSttsCd !== "DONE")
    .sort((a, b) => (a.ddlnDt ?? "").localeCompare(b.ddlnDt ?? ""))
    .slice(0, 6);

  const approvalColumns: GridColumn<SubWork>[] = [
    {
      key: "subWorkTtl",
      header: "하위 업무명",
      width: "2fr",
      render: (sw) => (
        <span
          onClick={() => router.push(ROUTES.subWorkDetail(sw.subWorkId))}
          className="cursor-pointer font-semibold hover:text-accent"
        >
          {sw.subWorkTtl}
        </span>
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
      render: (sw) => <span className="text-n400">{formatMd(sw.ddlnDt) || "-"}</span>,
    },
    {
      key: "subWorkTypeId",
      header: "하위_업무_유형",
      width: ".9fr",
      render: (sw) => (
        <Badge tone="grey">{subWorkTypeNm(subWorkTypes, sw.subWorkTypeId)}</Badge>
      ),
    },
    {
      key: "actions",
      header: "조치",
      width: "150px",
      align: "right",
      render: (sw) => (
        <span className="flex justify-end gap-[7px]">
          <Button variant="ghost-danger" size="sm" onClick={() => setRejectTarget(sw)}>
            반려
          </Button>
          <Button
            size="sm"
            onClick={() => {
              const aprv = aprvOf(subWorkAprvs, sw.subWorkId);
              if (aprv) decide(aprv.subWorkAprvId, sw.subWorkId, true);
            }}
          >
            승인
          </Button>
        </span>
      ),
    },
  ];

  const taskColumns: GridColumn<SubWork>[] = [
    {
      key: "subWorkTtl",
      header: "하위 업무명",
      width: "2fr",
      render: (sw) => (
        <span
          onClick={() => router.push(ROUTES.subWorkDetail(sw.subWorkId))}
          className="cursor-pointer font-semibold hover:text-accent"
        >
          {sw.subWorkTtl}
        </span>
      ),
    },
    {
      key: "workSttsCd",
      header: "업무_상태",
      width: ".7fr",
      render: (sw) => (
        <Badge tone={sw.workSttsCd === "DONE" ? "outline-accent" : "outline"}>
          {WORK_STTS_NM[sw.workSttsCd]}
        </Badge>
      ),
    },
    {
      key: "ddlnDt",
      header: "마감_일시",
      width: ".9fr",
      render: (sw) => {
        const flag = deadlineFlag(sw.ddlnDt, sw.dlyYn);
        return (
          <span className="flex items-center gap-2">
            <span className={flag === "지연" ? "text-danger" : undefined}>
              {formatMd(sw.ddlnDt) || "-"}
            </span>
            {flag && (
              <Badge tone={flag === "지연" ? "red" : "outline-accent"}>{flag}</Badge>
            )}
          </span>
        );
      },
    },
    {
      key: "prgrs",
      header: "진행률",
      width: "1.2fr",
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
              rowKey={(sw) => String(sw.subWorkId)}
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
              {upcoming.length === 0 ? (
                <div className="text-[14.5px] text-n500">예정된 마감이 없습니다.</div>
              ) : (
                upcoming.map((sw) => {
                  const flag = deadlineFlag(sw.ddlnDt, sw.dlyYn);
                  const d = daysUntil(sw.ddlnDt);
                  return (
                    <div
                      key={sw.subWorkId}
                      onClick={() => router.push(ROUTES.subWorkDetail(sw.subWorkId))}
                      className="flex cursor-pointer items-start gap-3 hover:opacity-80"
                    >
                      <div className="w-[64px] flex-none pt-[2px] text-[14px] text-n500">
                        {formatMd(sw.ddlnDt)}
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
                          {ddayText(sw.ddlnDt)}
                        </Badge>
                        <div className="mt-[6px] text-[15.5px]">{sw.subWorkTtl}</div>
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

        <RejectSheet
          open={rejectTarget !== null}
          onClose={() => setRejectTarget(null)}
          onReject={(reason) => {
            if (!rejectTarget) return;
            const aprv = aprvOf(subWorkAprvs, rejectTarget.subWorkId);
            if (aprv) decide(aprv.subWorkAprvId, rejectTarget.subWorkId, false, reason);
          }}
        />
      </PageBody>
    </>
  );
}
