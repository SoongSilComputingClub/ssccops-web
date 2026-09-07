"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CAPABILITY } from "@/entities/session";
import { workSttsTone, type WorkListItem } from "@/entities/work";
import { useCan } from "@/features/auth";
import { useWorkList } from "@/features/work";
import { WORK_STTS_NM, WORK_TYPE_NM } from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import { formatYmd } from "@/shared/lib/date";
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  PageBody,
  PageHeader,
  ProgressBar,
  flash,
} from "@/shared/ui";

/*
 * 운영 통합 › 업무 (ssccops-server OPS-020 · GET /v1/works).
 *
 * 목 스토어를 조합해 그리던 화면을 서버 응답 한 벌로 바꿨다(#30). 예전에는 work·oper·
 * sub_work·mbr 네 스토어를 화면에서 이어 붙여 카드 한 장을 만들었는데, 하위 업무 건수와
 * 진행률의 분모가 화면 계산에 달려 있어 상세와 어긋날 여지가 있었다. 지금은 둘 다 서버가
 * 같은 집계(AGG-01·AGG-03)로 내려 준다.
 */

/** 잠긴 조작에 붙는 사유. 감추지 않고 잠그는 근거는 features/auth/model/use-can.ts */
const NO_WORK_MANAGE = "업무를 등록할 권한이 없습니다 — 업무 관리(WORK_MANAGE) 권한이 필요합니다";

/** 칩 이름만으로는 무엇을 거르는지 알기 어렵다 — 담당이지 등록이 아니라는 것을 말한다 */
const MINE_HINT = "담당자가 나인 업무만 봅니다 — 내가 등록했지만 남이 담당하는 건은 빠집니다";

function WorkCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="h-[22px] w-[96px] rounded-full bg-fill" />
      <div className="mt-3 h-[24px] w-3/5 rounded bg-fill" />
      <div className="mt-2 h-[16px] w-2/5 rounded bg-fill" />
      <div className="mt-2 h-[16px] w-1/2 rounded bg-fill" />
      <div className="mt-4 h-[8px] w-full rounded bg-fill" />
    </Card>
  );
}

function WorkCard({ work, onClick }: { work: WorkListItem; onClick: () => void }) {
  // 진행률은 서버가 계산한 값이다 — 화면은 반올림해 보여 주기만 한다
  const prgrs = Math.round(work.progressRate);

  return (
    <Card onClick={onClick}>
      <div className="flex items-center gap-2">
        <Badge tone={workSttsTone(work.workStatus)}>
          {WORK_STTS_NM[work.workStatus]}
        </Badge>
        <Badge tone="grey">{WORK_TYPE_NM[work.workType]}</Badge>
        <div className="flex-1" />
        <div className="text-[13.5px] text-n500">하위 업무 {work.subWorkCount}건</div>
      </div>
      <div className="mt-2 text-[18px] font-semibold">{work.title}</div>
      <div className="mt-1 text-[14px] text-n400">담당 {work.owner?.name || "-"}</div>
      <div className="mt-[2px] text-[13.5px] text-n500">
        {formatYmd(work.startAt) || "-"} ~ {formatYmd(work.endAt) || "-"}
      </div>
      <div className="mt-3 flex items-center gap-[10px]">
        <ProgressBar value={prgrs} />
        <div className="w-[38px] text-right text-[14px] text-n500">{prgrs}%</div>
      </div>
    </Card>
  );
}

export function WorkListPage() {
  const router = useRouter();
  /*
   * 이 화면의 첫 필터다 (ssccops#225). 지금까지 업무 목록에는 필터 UI가 없었고 상태·유형은
   * 카드 배지로만 보였다 — 축이 늘면 하위 업무 목록처럼 칩 줄이 자란다.
   */
  const [mine, setMine] = useState(false);
  const {
    works,
    status,
    errorMessage,
    totalCount,
    hasNext,
    loadingMore,
    loadMore,
    reload,
  } = useWorkList("", mine);

  /*
   * 조회(GET /v1/works)는 WORK_READ만 있어도 되지만(서버 #101), 등록은 여전히 WORK_MANAGE다 —
   * 그래서 목록 자체는 이동 가드(nav.ts)만으로 충분하고, 여기서는 '+ 등록' 버튼만 잠근다.
   * WORK_MANAGE 보유자는 이미 목록에 온 것이므로 대개 통과하지만, 잠금을 붙이는 것은 권한이
   * 방금 회수된 경우 때문이다 — 세션 재동기화가 끝나면 이 버튼이 스스로 잠긴다.
   */
  const canManage = useCan(CAPABILITY.WORK_MANAGE);
  const openCreate = () => router.push(ROUTES.operationNew);

  const runLoadMore = async () => {
    const message = await loadMore();
    if (message) flash(message);
  };

  return (
    <>
      <PageHeader
        title="업무"
        subtitle="행사 · 상시 · 정례 운영"
        action={{
          label: "+ 등록",
          onClick: openCreate,
          disabled: !canManage,
          title: canManage ? undefined : NO_WORK_MANAGE,
        }}
      />
      <PageBody>
        <div className="mb-[14px] flex items-center gap-[7px]">
          <Chip active={mine} onClick={() => setMine((on) => !on)} title={MINE_HINT}>
            내 업무
          </Chip>
          <div className="flex-1" />
          {status === "ready" && <div className="text-[14px] text-n500">{totalCount}건</div>}
        </div>

        {status === "loading" && (
          <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <WorkCardSkeleton key={i} />
            ))}
          </div>
        )}

        {status === "error" && (
          <EmptyState
            message={errorMessage || "업무 목록을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: reload }}
          />
        )}

        {status === "ready" &&
          (works.length === 0 ? (
            <EmptyState
              message={mine ? "담당하고 있는 업무가 없습니다." : "등록된 업무가 없습니다."}
              /*
                유도 버튼은 감춘다 — 권하면서 누르지 못하게 하는 모순이고, 사유는 헤더가 말한다.
                필터를 켠 상태에서도 감추는 것은 지금 없는 것이 '내 담당'이지 업무 자체가
                아니어서다 — 등록을 권하는 것이 답이 아니다.
              */
              action={canManage && !mine ? { label: "+ 등록", onClick: openCreate } : undefined}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
                {works.map((w) => (
                  <WorkCard
                    key={w.workId}
                    work={w}
                    onClick={() => router.push(ROUTES.workDetail(w.workId))}
                  />
                ))}
              </div>

              {/*
                커서 페이징이라 한 번에 20건까지만 온다. 받아 둔 건수와 전체 건수를 함께
                보여 주는 것은 '더 보기'가 몇 번 더 남았는지 짐작할 수 있게 하기 위해서다.
              */}
              {hasNext && (
                <div className="mt-5 flex items-center gap-3">
                  <Button onClick={() => void runLoadMore()} disabled={loadingMore}>
                    {loadingMore ? "불러오는 중…" : "더 보기"}
                  </Button>
                  <div className="text-[13.5px] text-n500">
                    {works.length} / {totalCount}건
                  </div>
                </div>
              )}
            </>
          ))}
      </PageBody>
    </>
  );
}
