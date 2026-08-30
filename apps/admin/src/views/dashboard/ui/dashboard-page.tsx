"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApprovalInboxItem } from "@/entities/approval";
import { CAPABILITY } from "@/entities/session";
import type { SubWorkListItem } from "@/entities/sub-work";
import { useCan } from "@/features/auth";
import { useDashboard } from "@/features/dashboard";
import { FIELD_LABEL } from "@/shared/config/labels";
import { WORK_STTS_NM } from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import { ddayText, deadlineFlag, formatMd, todayInSeoul } from "@/shared/lib/date";
import {
  Badge,
  Card,
  CardTitle,
  Chip,
  EmptyState,
  GridTable,
  PageBody,
  PageHeader,
  ProgressBar,
  type GridColumn,
} from "@/shared/ui";

/*
 * 운영 대시보드 (ssccops-server OPS-038 · GET /v1/dashboard · ssccops-web#60).
 *
 * 목 스토어(subWorks·subWorkAprvs를 화면에서 이어 붙이던 방식)를 서버 응답 한 벌로 바꿨다 —
 * 승인 대기 미리보기 · 다가오는 마감(±5일) · 내 업무 목록(담당자 본인 전량)을 모두 서버가
 * 계산해 내려주므로 더 이상 클라이언트가 여러 스토어를 조인하지 않는다(승인함 #45·하위 업무
 * 목록 #41이 밟은 경로와 같다).
 *
 * 승인 대기 카드는 이슈 설명의 UI 변경 계획을 반영해 반려·승인 버튼을 두지 않는다 — 행을
 * 클릭하면 승인함(ROUTES.approvals)으로 이동하고, 그 화면이 `subWorkId` 쿼리로 해당 카드에
 * 스크롤·강조한다(승인함 쪽 구현은 features/approval의 useApprovalHighlight).
 */

const MY_FILTERS = ["전체", "마감임박", "지연"] as const;

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.7fr_1fr]">
      {[0, 1].map((i) => (
        <Card key={i} className="animate-pulse">
          <div className="h-[20px] w-2/5 rounded bg-black/5" />
          <div className="mt-3 h-[80px] w-full rounded bg-black/5" />
        </Card>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const router = useRouter();
  const { data, status, errorMessage, reload } = useDashboard();
  /* 헤더의 '+ 등록'은 운영 등록 화면으로 간다 — 그 화면의 업무·하위 업무 등록과 같은 권한이다 */
  const canManageWork = useCan(CAPABILITY.WORK_MANAGE);

  const [myFilter, setMyFilter] = useState<(typeof MY_FILTERS)[number]>("전체");
  // 서버가 Asia/Seoul 오프셋으로 내려주는 마감_일시와 같은 시간대로 D-day를 센다 (withServiceOffset과 같은 판단)
  const today = todayInSeoul();

  const goToSubWorkApproval = (subWorkId: number) =>
    router.push(`${ROUTES.approvals}?subWorkId=${subWorkId}`);

  /*
   * 배지 판정은 이 한 줄을 거쳐서만 한다 — 이 화면의 세 자리(내 업무 필터·내 업무 표의
   * 마감 열·다가오는 마감 카드)가 같은 규칙을 타게 하려는 것이다. 완료 여부는 서버가 주는
   * workStatus로 가르고, 지연 판정은 서버의 isDelayed 하나만 본다(deadlineFlag 주석 · #199).
   */
  const flagOf = (sw: SubWorkListItem) =>
    deadlineFlag(sw.dueAt, sw.isDelayed, sw.workStatus === "DONE", today);

  const myTasks = data.myTasks.filter(
    (sw) => myFilter === "전체" || flagOf(sw) === myFilter,
  );

  const approvalColumns: GridColumn<ApprovalInboxItem>[] = [
    {
      key: "title",
      header: "하위 업무명",
      width: "2fr",
      render: (item) => (
        <span
          onClick={() => goToSubWorkApproval(item.subWorkId)}
          className="cursor-pointer font-semibold hover:text-accent"
        >
          {item.title}
        </span>
      ),
    },
    {
      key: "registrantName",
      header: "요청자",
      width: ".8fr",
      render: (item) => <span className="text-n400">{item.registrantName ?? "-"}</span>,
    },
    {
      key: "dueAt",
      header: FIELD_LABEL.dueAt,
      width: ".8fr",
      render: (item) => <span className="text-n400">{formatMd(item.dueAt) || "-"}</span>,
    },
    {
      key: "subWorkTypeName",
      header: FIELD_LABEL.subWorkType,
      width: ".9fr",
      render: (item) => <Badge tone="grey">{item.subWorkTypeName || "-"}</Badge>,
    },
  ];

  const taskColumns: GridColumn<SubWorkListItem>[] = [
    {
      key: "title",
      header: "하위 업무명",
      width: "2fr",
      render: (sw) => (
        <span
          onClick={() => router.push(ROUTES.subWorkDetail(sw.subWorkId))}
          className="cursor-pointer font-semibold hover:text-accent"
        >
          {sw.title}
        </span>
      ),
    },
    {
      key: "workStatus",
      header: FIELD_LABEL.workStatus,
      width: ".7fr",
      render: (sw) => (
        <Badge tone={sw.workStatus === "DONE" ? "outline-accent" : "outline"}>
          {WORK_STTS_NM[sw.workStatus]}
        </Badge>
      ),
    },
    {
      key: "dueAt",
      header: FIELD_LABEL.dueAt,
      width: ".9fr",
      render: (sw) => {
        const flag = flagOf(sw);
        return (
          <span className="flex items-center gap-2">
            <span className={flag === "지연" ? "text-danger" : undefined}>
              {formatMd(sw.dueAt) || "-"}
            </span>
            {flag && (
              <Badge tone={flag === "지연" ? "red" : "outline-accent"}>{flag}</Badge>
            )}
          </span>
        );
      },
    },
    {
      key: "progressRate",
      header: "진행률",
      width: "1.2fr",
      render: (sw) => (
        <span className="flex items-center gap-[10px]">
          <ProgressBar value={sw.progressRate} danger={sw.isDelayed} />
          <span className="w-[38px] text-right text-[14px] text-n500">
            {sw.progressRate}%
          </span>
        </span>
      ),
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
            : "업무를 등록할 권한이 없습니다 — 업무 관리(WORK_MANAGE) 권한이 필요합니다",
        }}
      />
      <PageBody>
        {status === "loading" && <DashboardSkeleton />}

        {status === "error" && (
          <EmptyState
            message={errorMessage || "운영 대시보드를 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: reload }}
          />
        )}

        {status === "ready" && (
          <>
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.7fr_1fr]">
              <Card>
                <CardTitle
                  right={
                    <span
                      onClick={() => router.push(ROUTES.approvals)}
                      className="cursor-pointer text-[14px] text-accent hover:underline"
                    >
                      전체보기
                    </span>
                  }
                >
                  승인 대기 목록
                </CardTitle>
                {canManageWork ? (
                  <GridTable
                    columns={approvalColumns}
                    rows={data.pendingApproval}
                    rowKey={(item) => String(item.subWorkId)}
                    dense
                    empty={
                      <div className="py-6 text-center text-[15px] text-n500">
                        승인 대기 중인 하위 업무가 없습니다.
                      </div>
                    }
                  />
                ) : (
                  // 서버가 WORK_MANAGE 없는 조회자에게는 pendingApproval을 항상 빈 배열로
                  // 준다(#71) — "0건"으로 보이면 실제로는 대기 건이 있는데 볼 권한만 없는
                  // 경우와 구분이 안 되므로, 권한이 없다는 것 자체를 다른 문구로 알린다
                  <div className="py-6 text-center text-[15px] text-n500">
                    승인함(WORK_MANAGE) 권한이 없어 승인 대기 목록을 볼 수 없습니다 —
                    운영진에게 문의해주세요
                  </div>
                )}
              </Card>

              <Card>
                <CardTitle>다가오는 마감</CardTitle>
                <div className="flex flex-col gap-[13px]">
                  {data.upcomingDeadlines.length === 0 ? (
                    <div className="text-[14.5px] text-n500">예정된 마감이 없습니다.</div>
                  ) : (
                    data.upcomingDeadlines.map((sw) => {
                      const flag = flagOf(sw);
                      return (
                        <div
                          key={sw.subWorkId}
                          onClick={() => router.push(ROUTES.subWorkDetail(sw.subWorkId))}
                          className="flex cursor-pointer items-start gap-3 hover:opacity-80"
                        >
                          <div className="w-[64px] flex-none pt-[2px] text-[14px] text-n500">
                            {formatMd(sw.dueAt)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <Badge
                              tone={
                                flag === "지연"
                                  ? "outline-red"
                                  : flag === "마감임박"
                                    ? "outline-accent"
                                    : "outline"
                              }
                            >
                              {ddayText(sw.dueAt, today)}
                            </Badge>
                            <div className="mt-[6px] text-[15.5px]">{sw.title}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>

            <Card className="mt-4">
              {/*
                좁은 화면에서는 제목 · 필터 칩 · 건수가 한 줄에 다 들어가지 않는다.
                줄바꿈을 열어 두지 않으면 flex 항목끼리 밀어내다 제목이 38px까지 찌그러져
                "내 업 무 목 록"처럼 글자마다 줄이 바뀐다(#103). 칩을 마지막 순서로 내려
                제목과 건수가 첫 줄에 온전히 남게 하고, lg에서는 기존 한 줄 배치로 되돌린다.
              */}
              <div className="mb-[14px] flex flex-wrap items-center gap-3 lg:flex-nowrap">
                <div className="shrink-0 text-[18px] font-medium">내 업무 목록</div>
                <div className="order-last flex gap-[7px] lg:order-none">
                  {MY_FILTERS.map((f) => (
                    <Chip key={f} active={myFilter === f} onClick={() => setMyFilter(f)}>
                      {f}
                    </Chip>
                  ))}
                </div>
                <div className="flex-1" />
                <div className="shrink-0 text-[14px] text-n500">{myTasks.length}건</div>
              </div>
              <GridTable
                columns={taskColumns}
                rows={myTasks}
                rowKey={(sw) => String(sw.subWorkId)}
                dense
              />
            </Card>
          </>
        )}
      </PageBody>
    </>
  );
}
