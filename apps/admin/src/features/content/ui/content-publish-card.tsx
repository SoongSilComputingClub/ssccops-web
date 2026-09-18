"use client";

import { pubSttsBadge } from "@/entities/content";
import type { PubSttsCd } from "@/shared/config/codes";
import { formatDt } from "@/shared/lib/date";
import { Badge, Button, Card, SectionLabel } from "@/shared/ui";
import { NO_CONTENT_MANAGE } from "../model/content-error";

/*
 * 게시 상태 카드 (#521) — 페이지·포스트 편집 화면이 함께 쓴다.
 *
 * 버튼은 «지금 할 수 있는 전이» 하나만 그린다(AGENTS.md). 초안이면 «게시», 게시 중이면 «게시 취소».
 * 상태 카드를 저장 폼과 나누는 이유는 행사와 같다 — 저장은 게시 상태를 건드리지 않고(계약에
 * 상태 필드가 없다), 전이는 편집과 별개의 행위다.
 *
 * **«공개 화면에는 최대 5분 뒤 반영됩니다»** — 공개 API가 `Cache-Control: s-maxage=300`이라
 * (ADR-0038) 게시·취소 직후 공개 화면을 열면 그대로일 수 있다. 이 한 줄이 없으면 «게시가 안 됐다»는
 * 문의가 온다. 게시 취소 옆에만 두라는 것이 이슈의 요건이지만 게시에도 같은 지연이 있어 상태와
 * 무관하게 같은 자리에 둔다.
 */

export function ContentPublishCard({
  pubSttsCd,
  pubDt,
  busy,
  canManage,
  onTransition,
}: Readonly<{
  pubSttsCd: PubSttsCd;
  pubDt: string | null;
  busy: boolean;
  canManage: boolean;
  onTransition: (publish: boolean) => void;
}>) {
  const stts = pubSttsBadge(pubSttsCd);
  const published = pubSttsCd === "PUBLISHED";

  return (
    <Card className="mb-4">
      <SectionLabel className="mb-3">게시 상태</SectionLabel>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={stts.tone}>{stts.label}</Badge>
        <div className="text-[13.5px] text-n500">
          {published
            ? `공개 화면에 보이는 상태입니다.${pubDt ? ` 게시 ${formatDt(pubDt)}` : ""}`
            : "게시 전에는 공개 화면에 보이지 않습니다."}
        </div>
        <div className="flex-1" />
        <Button
          variant={published ? "ghost" : "primary"}
          size="sm"
          disabled={busy || !canManage}
          title={canManage ? undefined : NO_CONTENT_MANAGE}
          onClick={() => onTransition(!published)}
        >
          {published ? "게시 취소" : "게시"}
        </Button>
      </div>
      <div className="mt-2 text-[12.5px] text-n500">공개 화면에는 최대 5분 뒤 반영됩니다.</div>
    </Card>
  );
}
