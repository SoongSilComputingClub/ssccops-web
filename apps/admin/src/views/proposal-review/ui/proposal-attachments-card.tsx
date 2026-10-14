"use client";

import { AttachmentList } from "@ssccops/ui";
import { useProposalAttachments } from "@/features/response";
import { Card, EmptyState, SectionLabel } from "@/shared/ui";

/**
 * «첨부 자료» 카드 — 기획안 내용 바로 아래 (web#805 · ssccops#607).
 *
 * 검토자가 승인·반려(`ResponseReviewPanel`)를 누르기 **전에** 보는 자리다 — 첨부는 승인되면 그
 * 프로그램에 지원하는 회원 누구나 내려받는 자료라, 학술국장의 검토가 공개 전의 유일한 관문이다
 * (서버는 내용·바이러스 검사를 하지 않는다). 이름 · 크기 · 올린 시각 · 내려받기만, 읽기 전용이다.
 */
export function ProposalAttachmentsCard({
  formId,
  formRspnsId,
}: Readonly<{
  formId: number;
  formRspnsId: number;
}>) {
  const a = useProposalAttachments(formId, formRspnsId);

  return (
    <Card>
      <SectionLabel className="mb-1">첨부 자료</SectionLabel>
      {a.status === "loading" && <div className="mt-2 h-[16px] w-2/5 animate-pulse rounded bg-fill" />}
      {a.status === "error" && (
        <EmptyState
          padding="sm"
          message={a.errorMessage}
          action={{ label: "다시 시도", onClick: a.reload }}
        />
      )}
      {a.status === "ready" && a.items.length === 0 && (
        <div className="mt-1 text-[14px] text-n500">첨부 자료 없음</div>
      )}
      {a.status === "ready" && a.items.length > 0 && (
        <AttachmentList
          items={a.items}
          disabled={a.busy}
          onDownload={(fileId) => void a.download(fileId)}
        />
      )}
      {a.actionError && <div className="mt-2 text-[12.5px] text-danger">{a.actionError}</div>}
    </Card>
  );
}
