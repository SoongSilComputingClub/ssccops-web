"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { type SubWorkListItem } from "@/entities/sub-work";
import { SUB_WORK_LIST_TABS, useSubWorkList, type SubWorkListTab } from "@/features/sub-work";
import { ROUTES } from "@/shared/config/routes";
import { formatMd } from "@/shared/lib/date";
import {
  Badge,
  type BadgeTone,
  Button,
  Card,
  Chip,
  EmptyState,
  GridTable,
  PageBody,
  PageHeader,
  ProgressBar,
  flash,
  type GridColumn,
} from "@/shared/ui";

/*
 * 운영 통합 › 하위 업무 (ssccops-server OPS-008 · GET /v1/sub-works · #28·#74·#41).
 *
 * 목 스토어(work·oper·sub-work-type·member 네 스토어를 화면에서 이어 붙이던 방식)를 서버
 * 응답 한 벌로 바꿨다 — 상위 업무 제목·유형명·담당자 이름·진행률·지연 여부를 모두 서버가
 * 내려주므로 더 이상 클라이언트에서 조인하지 않는다(업무 목록 #30이 밟은 경로와 같다).
 *
 * 마감임박·지연 판정도 클라이언트의 deadlineFlag/dly_yn 대신 서버 필터(dueBefore·isOverdue)로
 * 옮겼다 — dly_yn 컬럼은 갱신하는 주체가 없어 항상 false다(서버 #28 설계 결정 7).
 */

function statusBadge(sw: SubWorkListItem): { label: string; tone: BadgeTone } {
  if (sw.approvalStatus === "PENDING" || sw.approvalStatus === "REAPPROVAL_REQUIRED") {
    return { label: "승인 대기", tone: "amber" };
  }
  if (sw.workStatus === "DONE") return { label: "완료", tone: "grey" };
  return { label: "진행", tone: "blue" };
}

function SubWorkTableSkeleton() {
  return (
    <Card className="animate-pulse px-5 pt-4 pb-[6px]">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 border-t border-black/[.06] py-3 first:border-t-0">
          <div className="h-[16px] w-1/4 rounded bg-black/5" />
          <div className="h-[16px] w-1/6 rounded bg-black/5" />
          <div className="h-[16px] w-1/6 rounded bg-black/5" />
          <div className="h-[16px] w-1/6 rounded bg-black/5" />
          <div className="h-[16px] w-1/6 rounded bg-black/5" />
        </div>
      ))}
    </Card>
  );
}

export function SubWorkListPage() {
  const router = useRouter();
  const [tab, setTab] = useState<SubWorkListTab>("전체");
  const {
    subWorks,
    status,
    errorMessage,
    totalCount,
    overallCount,
    hasNext,
    loadingMore,
    loadMore,
    reload,
  } = useSubWorkList(tab);

  const runLoadMore = async () => {
    const message = await loadMore();
    if (message) flash(message);
  };

  const columns: GridColumn<SubWorkListItem>[] = [
    {
      key: "title",
      header: "하위 업무",
      width: "1.4fr",
      render: (sw) => <span className="font-semibold hover:text-accent">{sw.title}</span>,
    },
    {
      key: "work",
      header: "상위 업무",
      width: "1fr",
      render: (sw) =>
        sw.work ? (
          <Badge tone="grey">{sw.work.title}</Badge>
        ) : (
          <Badge tone="red">미연결</Badge>
        ),
    },
    {
      key: "subWorkTypeName",
      header: "유형",
      width: ".9fr",
      render: (sw) => <Badge tone="blue">{sw.subWorkTypeName}</Badge>,
    },
    {
      key: "owner",
      header: "담당자",
      width: ".8fr",
      render: (sw) => <span className="text-n400">{sw.owner?.name || "-"}</span>,
    },
    {
      key: "dueAt",
      header: "마감",
      width: ".8fr",
      render: (sw) => (
        <span className={sw.isDelayed ? "text-danger" : undefined}>
          {formatMd(sw.dueAt) || "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "상태",
      width: ".9fr",
      render: (sw) => {
        const badge = statusBadge(sw);
        return <Badge tone={badge.tone}>{badge.label}</Badge>;
      },
    },
    {
      key: "progressRate",
      header: "진행률",
      width: "120px",
      render: (sw) => {
        const rt = Math.round(sw.progressRate);
        return (
          <span className="flex items-center gap-2">
            <ProgressBar value={rt} danger={sw.isDelayed} />
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
          {SUB_WORK_LIST_TABS.map((t) => (
            <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
              {t}
            </Chip>
          ))}
          <div className="flex-1" />
          {status === "ready" && (
            <div className="text-[14px] text-n500">
              {totalCount}건 · 전체 {overallCount}건
            </div>
          )}
        </div>

        {status === "loading" && <SubWorkTableSkeleton />}

        {status === "error" && (
          <EmptyState
            message={errorMessage || "하위 업무 목록을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: reload }}
          />
        )}

        {status === "ready" && (
          <>
            <Card className="px-5 pt-4 pb-[6px]">
              <GridTable
                columns={columns}
                rows={subWorks}
                rowKey={(sw) => String(sw.subWorkId)}
                onRowClick={(sw) => router.push(ROUTES.subWorkDetail(sw.subWorkId))}
                dense
                empty={<EmptyState message="조건에 맞는 하위 업무가 없습니다." />}
              />
            </Card>

            {/*
              커서 페이징이라 한 번에 20건까지만 온다. 탭을 바꾸면 useSubWorkList가
              처음부터 다시 받으므로 여기서는 지금 탭의 다음 페이지만 신경 쓴다.
            */}
            {hasNext && (
              <div className="mt-3 flex items-center gap-3">
                <Button onClick={() => void runLoadMore()} disabled={loadingMore}>
                  {loadingMore ? "불러오는 중…" : "더 보기"}
                </Button>
                <div className="text-[13.5px] text-n500">
                  {subWorks.length} / {totalCount}건
                </div>
              </div>
            )}
          </>
        )}
      </PageBody>
    </>
  );
}
