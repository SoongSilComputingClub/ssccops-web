"use client";

import { useEffect, useState } from "react";
import {
  pubSttsBadge,
  type ContentPageHistory,
  type ContentPostHistory,
} from "@/entities/content";
import { formatDt } from "@/shared/lib/date";
import { Badge, Button, Card, ContentMarkdoc, EmptyState } from "@/shared/ui";
import type { HistoryStatus } from "../model/use-content-actions";

/*
 * 스냅샷 이력 (#521) — 페이지·포스트 편집 화면의 «이력» 탭.
 *
 * 한 줄에 제목·게시 상태·누가·언제. 본문은 접어 두고 «본문 보기»로 그 스냅샷만 편다 — 스냅샷마다
 * 본문 전체가 실려 있어 다 펴면 화면이 n배로 길어진다. 차이(diff)는 그리지 않는다 — 서버가 «무엇이
 * 바뀌었는지»를 싣지 않고, 이 화면의 첫 목적은 «누가 언제 손댔나»다. 되돌리기도 없다(서버에 없다).
 *
 * `load`는 탭이 열릴 때 부른다 — 편집 화면 첫 조회에 얹지 않는 근거는 useContentHistory 주석.
 */

type HistoryItem = ContentPageHistory | ContentPostHistory;

function historyKey(item: HistoryItem): number {
  return "pageHstryId" in item ? item.pageHstryId : item.postHstryId;
}

function HistoryRow({ item }: Readonly<{ item: HistoryItem }>) {
  const [open, setOpen] = useState(false);
  const stts = pubSttsBadge(item.pubSttsCd);

  return (
    <div className="border-t border-hairline py-3 first:border-t-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={stts.tone}>{stts.label}</Badge>
        <div className="min-w-0 flex-1 truncate text-[15px] font-medium">{item.ttl}</div>
        <div className="text-[13px] text-n500">
          {item.chgMbrNm ?? "-"} · {formatDt(item.chgDt)}
        </div>
        {/* aria-expanded — 눌러도 «펼쳐졌다»가 안 들리던 자리다 (#692) */}
        <Button variant="link" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? "본문 접기" : "본문 보기"}
        </Button>
      </div>
      {"actvYmd" in item && (
        <div className="mt-1 text-[13px] text-n500">
          활동일 {item.actvYmd}
          {item.smry && ` · ${item.smry}`}
        </div>
      )}
      {open && (
        <div className="mt-2 rounded-[12px] border border-line bg-bg px-[16px] py-[6px]">
          {item.mtxt.trim() ? (
            <ContentMarkdoc>{item.mtxt}</ContentMarkdoc>
          ) : (
            <div className="py-6 text-center text-[13.5px] text-n500">본문이 비어 있습니다.</div>
          )}
        </div>
      )}
    </div>
  );
}

export function ContentHistoryList({
  id,
  status,
  items,
  errorMessage,
  load,
}: Readonly<{
  id: number;
  status: HistoryStatus;
  items: HistoryItem[];
  errorMessage: string;
  load: (id: number) => Promise<void>;
}>) {
  /* 탭이 마운트될 때 한 번 — 다시 열면 다시 부른다(그 사이 저장·게시로 줄이 늘었을 수 있다) */
  useEffect(() => {
    void load(id);
  }, [id, load]);

  if (status === "loading" || status === "idle") {
    return (
      <Card className="animate-pulse">
        <div className="h-[18px] w-3/5 rounded bg-fill" />
        <div className="mt-3 h-[18px] w-2/5 rounded bg-fill" />
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card>
        <EmptyState
          padding="sm"
          message={errorMessage}
          action={{ label: "다시 시도", onClick: () => void load(id) }}
        />
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-2 text-[13px] text-n500">
        저장·게시·게시 취소마다 한 줄이 남습니다. 최신이 위입니다.
      </div>
      {items.length === 0 ? (
        <EmptyState padding="sm" message="아직 이력이 없습니다." />
      ) : (
        items.map((item) => <HistoryRow key={historyKey(item)} item={item} />)
      )}
    </Card>
  );
}
