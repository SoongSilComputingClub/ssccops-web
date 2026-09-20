"use client";

import { useState } from "react";
import type { SubWorkChecklistChangeType } from "@/entities/sub-work";
import { useSubWorkChecklistHistory } from "@/features/sub-work";
import { formatDt } from "@/shared/lib/date";
import { Badge, Button, Card, EmptyState, SectionLabel } from "@/shared/ui";

/*
 * 점검 목록 변경 이력 절 (#543 · ssccops#407).
 *
 * 항목 편집이 열린 대가가 이 이력이다(서버 #307 · ssccops#255 «무엇이 지워졌는지 아무 데도 남지
 * 않으면 안 된다»). 접힌 채로 시작하고 펼칠 때 부른다 — 대부분의 방문은 이력을 읽지 않는다.
 * 전/후 문구를 그대로 나란히 보인다. «무엇이 바뀌었나»를 화면이 계산하지 않는다(콘텐츠 이력과 같다).
 */

const CHANGE_BADGE: Record<SubWorkChecklistChangeType, { label: string; tone: "blue" | "grey" | "red" }> = {
  ADDED: { label: "추가", tone: "blue" },
  MODIFIED: { label: "수정", tone: "grey" },
  REMOVED: { label: "삭제", tone: "red" },
};

export function ChecklistHistory({
  subWorkId,
  version,
}: Readonly<{
  subWorkId: number;
  /** 항목 편집이 성공할 때마다 오르는 값 — 펼쳐 둔 이력을 다시 읽는다 */
  version: number;
}>) {
  const [open, setOpen] = useState(false);
  const { items, status, errorMessage, reload } = useSubWorkChecklistHistory(subWorkId, open, version);

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <SectionLabel>점검 목록 변경 이력</SectionLabel>
        <Button variant="ghost" onClick={() => setOpen((v) => !v)}>
          {open ? "접기" : "보기"}
        </Button>
      </div>
      {!open && (
        <div className="mt-1 text-[13.5px] text-n500">항목을 추가·수정·삭제한 기록입니다.</div>
      )}
      {open && status === "loading" && (
        <div className="mt-3 h-[16px] w-2/5 animate-pulse rounded bg-fill" />
      )}
      {open && status === "error" && (
        <EmptyState message={errorMessage} action={{ label: "다시 시도", onClick: reload }} />
      )}
      {open && status === "ready" && items.length === 0 && (
        <div className="mt-2 text-[13.5px] text-n500">아직 변경한 기록이 없습니다.</div>
      )}
      {open && status === "ready" && items.length > 0 && (
        <ul className="mt-3 flex flex-col divide-y divide-hairline">
          {items.map((row) => {
            const badge = CHANGE_BADGE[row.changeType];
            return (
              <li key={row.historyId} className="py-[10px] text-[14px]">
                <div className="flex flex-wrap items-center gap-2 text-[13px] text-n500">
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                  <span>{row.performer?.name || "-"}</span>
                  <span>·</span>
                  <span>{formatDt(row.changedAt) || "-"}</span>
                </div>
                <div className="mt-[4px] grid grid-cols-1 gap-[2px] lg:grid-cols-2 lg:gap-3">
                  {row.changeType !== "ADDED" && (
                    <div className="truncate text-n400">
                      <span className="mr-1 text-[12.5px] text-n500">전</span>
                      <span className={row.changeType === "REMOVED" ? "line-through" : ""}>
                        {row.previousArticle || "-"}
                      </span>
                    </div>
                  )}
                  {row.changeType !== "REMOVED" && (
                    <div className="truncate">
                      <span className="mr-1 text-[12.5px] text-n500">후</span>
                      {row.nextArticle || "-"}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
