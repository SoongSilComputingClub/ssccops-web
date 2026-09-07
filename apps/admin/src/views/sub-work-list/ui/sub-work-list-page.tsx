"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { type SubWorkListItem } from "@/entities/sub-work";
import {
  SUB_WORK_LIST_TABS,
  SUB_WORK_LIST_TAB_HINTS,
  useSubWorkList,
  type SubWorkListTab,
} from "@/features/sub-work";
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

/*
 * 정체 배지 (ssccops#196). 상태 배지 옆에 붙어 "지금 누가 무엇을 눌러야 하는지"를 말한다 —
 * 상태만으로는 '진행'이 하는 중인지 다 했는데 안 눌렀는지 구별되지 않는다.
 *
 * 판정은 서버가 준 두 값만 본다. 진행률·체크리스트로 여기서 다시 세면 서버와 갈리고,
 * 그 어긋남은 목록에서만 보인다 (shared/lib/date.ts의 deadlineFlag 주석과 같은 규칙).
 * 한 건이 둘 다일 수는 없다 — 앞은 검토요청 전, 뒤는 검토 상태라 상태가 서로 배타적이다.
 */
function stallBadge(sw: SubWorkListItem): { label: string; title: string } | null {
  if (sw.isReadyForReview) {
    return {
      label: "요청 전",
      title: "완료 점검을 모두 마쳤습니다 — 완료 승인 요청을 하면 승인자에게 넘어갑니다",
    };
  }
  if (sw.isReviewStale) {
    return {
      label: "승인 정체",
      title: "완료 승인 요청 후 3일이 지났습니다 — 승인자의 승인·반려를 기다리고 있습니다",
    };
  }
  return null;
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
  /*
   * 내 업무 (ssccops#225) — 탭과 **배타가 아니라 함께 걸리는 축**이라 별도 상태다.
   * "내가 담당한 것 중 지연된 것"은 정상적인 조합이고, 탭 목록에 넣으면 그 조합이 사라진다.
   */
  const [mine, setMine] = useState(false);
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
  } = useSubWorkList(tab, "", mine);

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
      width: "1.1fr",
      render: (sw) => {
        const badge = statusBadge(sw);
        const stall = stallBadge(sw);
        return (
          <span className="flex flex-wrap items-center gap-1">
            <Badge tone={badge.tone}>{badge.label}</Badge>
            {stall && (
              <Badge tone="outline-red" title={stall.title}>
                {stall.label}
              </Badge>
            )}
          </span>
        );
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
            <Chip
              key={t}
              active={tab === t}
              onClick={() => setTab(t)}
              title={SUB_WORK_LIST_TAB_HINTS[t]}
            >
              {t}
            </Chip>
          ))}
          {/*
            구분선을 두어 축이 다르다는 것을 보인다 — 왼쪽은 하나만 켜지는 탭이고
            `내 업무`는 그 위에 겹쳐 걸리는 토글이다.
          */}
          <span className="mx-[3px] h-[18px] w-px flex-none bg-line" />
          <Chip
            active={mine}
            onClick={() => setMine((v) => !v)}
            title="담당자가 나인 하위 업무만 봅니다"
          >
            내 업무
          </Chip>
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
                empty={
                  <EmptyState
                    message={
                      mine
                        ? "담당하고 있는 하위 업무가 없습니다."
                        : "조건에 맞는 하위 업무가 없습니다."
                    }
                  />
                }
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
