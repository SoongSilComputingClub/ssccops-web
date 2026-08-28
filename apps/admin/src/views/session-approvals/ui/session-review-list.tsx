"use client";

import { sesnSttsTone } from "@/entities/academic-program";
import type { SessionCrossListItem } from "@/entities/academic-session";
import { SESN_STTS_NM } from "@/shared/config/codes";
import { formatYmd } from "@/shared/lib/date";
import { Badge, Button, Card, EmptyState } from "@/shared/ui";

/*
 * 좌측 승인 대기 목록 (#129).
 *
 * 활동 횡단이라 카드마다 활동명·유형을 함께 싣는다(활동 상세의 회차 목록과 다른 점). 서버가
 * SUBMITTED 만 내려주므로 상태 배지는 사실상 "제출" 하나지만, 전이 직후 목록을 다시 부르기
 * 전 짧은 순간을 위해 배지는 그대로 코드로 그린다.
 */

interface SessionReviewListProps {
  sessions: SessionCrossListItem[];
  status: "loading" | "ready" | "error";
  errorMessage: string;
  totalCount: number;
  hasNext: boolean;
  loadingMore: boolean;
  selectedSessionId: number | null;
  onSelect: (item: SessionCrossListItem) => void;
  onLoadMore: () => void;
  onReload: () => void;
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-[10px]">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} className="animate-pulse">
          <div className="h-[18px] w-2/5 rounded bg-black/5" />
          <div className="mt-2 h-[22px] w-3/5 rounded bg-black/5" />
          <div className="mt-3 h-[14px] w-1/2 rounded bg-black/5" />
        </Card>
      ))}
    </div>
  );
}

export function SessionReviewList({
  sessions,
  status,
  errorMessage,
  totalCount,
  hasNext,
  loadingMore,
  selectedSessionId,
  onSelect,
  onLoadMore,
  onReload,
}: SessionReviewListProps) {
  if (status === "loading") return <ListSkeleton />;

  if (status === "error") {
    return (
      <EmptyState
        message={errorMessage || "승인 대기 목록을 불러오지 못했습니다."}
        action={{ label: "다시 시도", onClick: onReload }}
      />
    );
  }

  if (sessions.length === 0) {
    return (
      <EmptyState
        message="승인 대기 중인 회차가 없습니다."
        padding="lg"
      />
    );
  }

  return (
    <div className="flex flex-col gap-[10px]">
      <div className="text-[13.5px] text-n500">
        {sessions.length} / {totalCount}건
      </div>

      {sessions.map((item) => {
        const active = item.sessionId === selectedSessionId;
        return (
          <Card
            key={item.sessionId}
            onClick={() => onSelect(item)}
            className={
              active ? "shadow-[0_0_0_2px_#1b64da]" : "cursor-pointer"
            }
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={sesnSttsTone(item.sesnSttsCd)}>
                {SESN_STTS_NM[item.sesnSttsCd]}
              </Badge>
              <Badge tone="grey">{item.typeCd}</Badge>
              <div className="flex-1" />
              {item.hasFileReference && (
                <span
                  title="출석 인증사진이 첨부돼 있습니다"
                  className="text-[13px] text-n400"
                >
                  사진 있음
                </span>
              )}
            </div>

            <div className="mt-2 text-[16px] font-semibold">
              {item.academicProgramTitle || "-"}
            </div>
            <div className="mt-[2px] text-[14px] text-n400">
              {item.seqno != null ? `${item.seqno}회차 · ` : ""}
              {item.curriculumTitle || "-"}
            </div>
            <div className="mt-[6px] flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-n500">
              <span>진행일 {formatYmd(item.actualYmd) || "-"}</span>
              <span>
                출석 {item.presentCount}/{item.totalCount}
              </span>
            </div>
          </Card>
        );
      })}

      {hasNext && (
        <Button
          variant="ghost"
          onClick={onLoadMore}
          disabled={loadingMore}
          className="mt-1"
        >
          {loadingMore ? "불러오는 중…" : "더 보기"}
        </Button>
      )}
    </div>
  );
}
