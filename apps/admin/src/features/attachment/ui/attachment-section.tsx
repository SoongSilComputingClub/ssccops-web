"use client";

import { useRef } from "react";
import { formatDt } from "@/shared/lib/date";
import { Button, Card, EmptyState, SectionLabel } from "@/shared/ui";
import { useAttachments } from "../model/use-attachments";

/*
 * 첨부 절 — 업무·하위 업무·회의 상세가 같은 것을 그린다 (#546 · ssccops#410).
 *
 * 화면이 권한을 판정하지 않는다 — 부르는 화면이 그 건을 고칠 수 있는지(`canWrite`)와 그 사유를 넘기고,
 * 여기서는 잠근 채 사유를 붙인다(«이동은 감추고, 동작은 잠근다»). 내려받기는 조회 권한이면 되므로
 * 잠그지 않는다.
 *
 * 파일 형식은 고르는 창을 막지 않는다 — 허용 목록은 서버 한 곳이고 거절은 응답 코드로 안내한다.
 */

function formatSize(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function AttachmentSection({
  operationId,
  canWrite,
  lockedHint,
  className,
}: Readonly<{
  operationId: number;
  /** 올리기·지우기 — 그 건을 고칠 수 있는 사람인가(화면이 넘긴다) */
  canWrite: boolean;
  /** 잠겼을 때의 사유 — 버튼 title */
  lockedHint?: string;
  className?: string;
}>) {
  const a = useAttachments(operationId);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Card className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <SectionLabel>첨부</SectionLabel>
        <div className="flex-1" />
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void a.upload(file);
          }}
        />
        <Button
          size="sm"
          variant="ghost"
          disabled={!canWrite || a.busy}
          title={canWrite ? undefined : lockedHint}
          onClick={() => inputRef.current?.click()}
        >
          {a.busy ? "처리 중…" : "+ 파일 올리기"}
        </Button>
      </div>
      <div className="mt-1 text-[12.5px] text-n500">
        문서·표·발표·압축·이미지, 25MB까지. 결과물 링크는 위 외부 URL에 적습니다.
      </div>

      {a.status === "loading" && <div className="mt-3 h-[16px] w-2/5 animate-pulse rounded bg-fill" />}
      {a.status === "error" && (
        <EmptyState message={a.errorMessage} action={{ label: "다시 시도", onClick: a.reload }} />
      )}
      {a.status === "ready" && a.items.length === 0 && (
        <div className="mt-3 text-[13.5px] text-n500">아직 첨부한 파일이 없습니다.</div>
      )}
      {a.status === "ready" && a.items.length > 0 && (
        <ul className="mt-3 flex flex-col divide-y divide-hairline">
          {a.items.map((item) => (
            <li key={item.fileId} className="flex items-center gap-3 py-[9px] text-[14px]">
              <button
                type="button"
                onClick={() => void a.download(item.fileId)}
                disabled={a.busy}
                className="min-w-0 flex-1 cursor-pointer truncate text-left hover:text-accent"
                title="내려받기"
              >
                {item.fileName}
              </button>
              <span className="shrink-0 text-[12.5px] text-n500">
                {formatSize(item.fileSize)}
                {item.uploader ? ` · ${item.uploader.name}` : ""}
                {item.uploadedAt ? ` · ${formatDt(item.uploadedAt)}` : ""}
              </span>
              {canWrite && (
                <Button
                  size="sm"
                  variant="ghost-danger"
                  disabled={a.busy}
                  onClick={() => void a.remove(item.fileId)}
                >
                  지우기
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {a.lastError && <div className="mt-2 text-[12.5px] text-danger">{a.lastError}</div>}
    </Card>
  );
}
