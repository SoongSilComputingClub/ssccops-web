"use client";

import { useRouter } from "next/navigation";
import { CAPABILITY } from "@/entities/session";
import { workSttsTone, type WorkSubWorkSummary } from "@/entities/work";
import { useCan } from "@/features/auth";
import { useWorkDetail } from "@/features/work";
import {
  OPER_TYPE_NM,
  PRRTY_RNK_NM,
  WORK_STTS_NM,
  WORK_TYPE_NM,
} from "@/shared/config/codes";
import { FIELD_LABEL } from "@/shared/config/labels";
import { ROUTES } from "@/shared/config/routes";
import { formatDt } from "@/shared/lib/date";
import {
  Badge,
  Button,
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

/*
 * 업무 상세 (ssccops-server OPS-003 · GET /v1/works/{workId}).
 *
 * 좌측 상세 카드와 우측 하위 업무 목록을 **이 한 번의 호출로** 채운다(#30). 하위 업무의
 * 담당자·진행률도 서버가 함께 내려주므로 목 스토어를 조합하던 계산이 전부 사라졌다.
 *
 * '수정' 버튼을 헤더가 아니라 좌측 카드 안에 둔 것은 헤더의 action 슬롯이 하나뿐이고
 * '+ 하위 업무'가 이미 그 자리를 쓰기 때문이다 — 상세 카드가 보여주는 값을 고치는
 * 버튼이니 그 카드 안에 있는 편이 더 자연스럽기도 하다.
 */

/**
 * 하위 업무 상태 배지.
 *
 * 승인 대기를 업무 상태보다 앞세우는 것은 하위 업무 목록(entities/sub-work의
 * subWorkSttsBadge)과 같은 규칙이다 — 승인이 걸려 있으면 단계가 무엇이든 다음 행동이
 * '승인'이기 때문이다.
 */
function subWorkBadge(subWork: WorkSubWorkSummary) {
  if (subWork.approvalStatus === "PENDING") {
    return { label: "승인 대기", tone: "amber" as const };
  }
  return { label: WORK_STTS_NM[subWork.workStatus], tone: "outline" as const };
}

function DetailSkeleton() {
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_1.3fr]">
      <Card className="animate-pulse">
        <div className="h-[22px] w-[96px] rounded-full bg-black/5" />
        <div className="mt-3 h-[28px] w-3/5 rounded bg-black/5" />
        <div className="mt-4 h-[8px] w-full rounded bg-black/5" />
        <div className="mt-6 h-[180px] w-full rounded bg-black/5" />
      </Card>
      <Card className="animate-pulse">
        <div className="h-[18px] w-[80px] rounded bg-black/5" />
        <div className="mt-4 h-[220px] w-full rounded bg-black/5" />
      </Card>
    </div>
  );
}

export function WorkDetailPage({ workId }: { workId: number }) {
  const router = useRouter();
  const { work, status, errorMessage, reload } = useWorkDetail(workId);
  /* 하위 업무 등록도 WORK_MANAGE 다 (서버 SubWorkController 전체) */
  const canManage = useCan(CAPABILITY.WORK_MANAGE);

  if (status !== "ready" || !work) {
    return (
      <>
        <PageHeader title="업무 상세" showBack />
        <PageBody>
          {status === "loading" && <DetailSkeleton />}
          {status === "not-found" && (
            <EmptyState
              message="업무를 찾을 수 없습니다. 이미 삭제된 업무일 수 있습니다."
              action={{ label: "업무 목록", onClick: () => router.replace(ROUTES.works) }}
            />
          )}
          {status !== "loading" && status !== "not-found" && (
            <EmptyState
              message={errorMessage || "업무를 불러오지 못했습니다."}
              action={{ label: "다시 시도", onClick: reload }}
            />
          )}
        </PageBody>
      </>
    );
  }

  const prgrs = Math.round(work.progressRate);

  const columns: GridColumn<WorkSubWorkSummary>[] = [
    {
      key: "title",
      header: "하위 업무명",
      width: "2fr",
      render: (sw) => (
        <span className="font-semibold hover:text-accent">{sw.title}</span>
      ),
    },
    {
      key: "owner",
      header: "담당자",
      width: ".8fr",
      render: (sw) => <span className="text-n400">{sw.owner?.name || "-"}</span>,
    },
    {
      key: "workStatus",
      header: FIELD_LABEL.workStatus,
      width: ".8fr",
      render: (sw) => {
        const badge = subWorkBadge(sw);
        return <Badge tone={badge.tone}>{badge.label}</Badge>;
      },
    },
    {
      key: "progressRate",
      header: "진행률",
      width: "1.1fr",
      /*
       * 지연 표시(danger)는 넣지 않는다 — 서버 요약에 지연_여부가 없고, 마감_일시로
       * 되짚으면 목 데이터용 고정 기준일(TODAY)로 서버 데이터를 판정하게 된다.
       */
      render: (sw) => {
        const rt = Math.round(sw.progressRate);
        return (
          <span className="flex items-center gap-[10px]">
            <ProgressBar value={rt} />
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
          disabled: !canManage,
          title: canManage
            ? undefined
            : "하위 업무를 등록할 권한이 없습니다 — 운영진 권한이 필요합니다",
        }}
      />
      <PageBody>
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_1.3fr]">
          <Card>
            <div className="flex items-center gap-2">
              <Badge tone={workSttsTone(work.workStatus)}>
                {WORK_STTS_NM[work.workStatus]}
              </Badge>
              <div className="text-[14px] text-n400">{WORK_TYPE_NM[work.workType]}</div>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(ROUTES.workEdit(work.workId))}
                disabled={!canManage}
                title={
                  canManage ? undefined : "업무를 수정할 권한이 없습니다 — 운영진 권한이 필요합니다"
                }
              >
                수정
              </Button>
            </div>
            <div className="mt-2 text-[23px] font-medium">{work.title}</div>
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
                  k: FIELD_LABEL.operationId,
                  v: <span className="font-mono text-[13.5px]">{work.operationId}</span>,
                },
                { k: FIELD_LABEL.operationType, v: OPER_TYPE_NM[work.operationType] },
                { k: FIELD_LABEL.operationTitle, v: work.title },
                { k: FIELD_LABEL.priority, v: PRRTY_RNK_NM[work.priority] },
                { k: "담당자", v: work.owner?.name || "-" },
                // 이관 데이터는 등록자가 없다 — 서버가 null로 내린다
                { k: "등록자", v: work.registrant?.name || "-" },
                {
                  k: "기간",
                  v: `${formatDt(work.startAt) || "-"} ~ ${formatDt(work.endAt) || "-"}`,
                },
              ]}
            />

            <SectionLabel className="mt-4 mb-[10px]">확장 속성 · work</SectionLabel>
            <KeyValueGrid
              labelWidth={88}
              items={[
                {
                  k: FIELD_LABEL.workId,
                  v: <span className="font-mono text-[13.5px]">{work.workId}</span>,
                },
                { k: FIELD_LABEL.workType, v: WORK_TYPE_NM[work.workType] },
                { k: FIELD_LABEL.workStatus, v: WORK_STTS_NM[work.workStatus] },
                { k: FIELD_LABEL.progressRate, v: `${prgrs}%` },
                { k: FIELD_LABEL.generalReview, v: work.generalReview || "-" },
              ]}
            />
          </Card>

          <Card>
            <SectionLabel className="mb-3">하위 업무 {work.subWorkCount}건</SectionLabel>
            <GridTable
              columns={columns}
              rows={work.subWorks}
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
