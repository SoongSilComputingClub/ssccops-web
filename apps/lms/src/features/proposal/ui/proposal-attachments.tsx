"use client";

import { useRef } from "react";
import { AttachmentList, formatFileSize } from "@ssccops/ui";
import type { ProposalAttachmentList } from "@/entities/response";
import { Card } from "@/shared/ui";
import { useProposalAttachments } from "../model/use-proposal-attachments";

/*
 * «첨부 자료» 카드 — 기획안 작성·재제출(올리기·지우기)과 상세(읽기 전용) (web#805 · ssccops#607).
 *
 * **첨부는 폼 문항이 아니다.** `QitemCard`·`@ssccops/form-renderer`를 건드리지 않고 화면마다 이
 * 절을 따로 둔다 — 문항 유형을 더하면 www 공개 폼·행사 신청까지 같은 렌더러가 흔들리고, 운영 중인
 * 기획안 폼은 문항 구조가 잠겨 있다(ssccops#607 «검토했으나 택하지 않은 길»).
 *
 * ── 공개 범위를 올리기 전에 말한다 ──────────────────────────
 * 승인되면 그 프로그램에 지원하는 회원 누구나 내려받는다. 첨부가 기획안 본문보다 공개 범위를
 * 넓힌다는 사실을 **올리기 버튼보다 먼저** 읽게 둔다.
 *
 * ── 숫자는 서버 값이다 ──────────────────────────────────────
 * 개수·합계 상한과 사용량은 목록 응답(`maxCount`·`maxTotalSize`·`totalSize`)에서 온다. 처음 연
 * 작성 화면처럼 초안 행이 아직 없으면 물을 곳이 없어 숫자 없이 형식만 말하고, 첫 자동 저장이나
 * 첫 올리기로 초안이 생기면 숫자가 선다. `accept`는 고르는 창의 편의일 뿐 검사가 아니다.
 */

const FILE_ACCEPT = ".pdf,.txt,.md";

const PRIVACY_NOTE =
  "승인되면 이 프로그램에 지원하는 회원 누구나 내려받을 수 있습니다. 연락처·학번 같은 개인정보는 넣지 마세요.";

function limitNote(list: ProposalAttachmentList | null): string {
  if (!list) return "pdf·txt·md 파일을 올릴 수 있습니다.";
  return `pdf·txt·md 파일을 ${list.maxCount}개까지, 합계 ${formatFileSize(list.maxTotalSize)}까지 올릴 수 있습니다.`;
}

export function ProposalAttachments({
  formId,
  formRspnsId,
  initial,
  editable,
  ensureTarget,
}: Readonly<{
  formId: number;
  /** 대상 응답 — 신규 작성에서 초안이 아직 없으면 null */
  formRspnsId: number | null;
  /** SSR 로더가 받아 온 첫 목록(상세 화면) */
  initial?: ProposalAttachmentList | null;
  /** 올리기·지우기를 여는가 — 작성 중·수정요청에서만(서버도 그때만 받는다) */
  editable: boolean;
  /** 초안 행을 확보한다 — 신규 작성만 */
  ensureTarget?: () => Promise<number>;
}>) {
  const a = useProposalAttachments({ formId, formRspnsId, initial, ensureTarget });
  const inputRef = useRef<HTMLInputElement>(null);
  const items = a.list?.attachments ?? [];

  return (
    <Card className="flex flex-col gap-[10px]">
      <div className="flex flex-wrap items-baseline gap-x-[8px] gap-y-[2px]">
        <h2 className="text-[13px] tracking-[.3px] text-n400">첨부 자료</h2>
        <div className="flex-1" />
        {editable && a.list && (
          <span className="text-[12.5px] text-n500">
            사용 {formatFileSize(a.list.totalSize)} / {formatFileSize(a.list.maxTotalSize)}
          </span>
        )}
      </div>

      {editable && (
        <div className="flex flex-col gap-[6px] text-[13px] leading-[1.7]">
          <p className="text-n500">{limitNote(a.list)}</p>
          <p className="rounded-[12px] bg-amber-soft px-[12px] py-[8px] text-amber">
            {PRIVACY_NOTE}
          </p>
        </div>
      )}

      {a.status === "loading" && <div className="h-[16px] w-2/5 animate-pulse rounded bg-line" />}

      {a.status === "error" && (
        <div className="flex flex-wrap items-center gap-x-[8px] text-[13px] text-danger">
          <span>{a.loadError}</span>
          <button
            type="button"
            onClick={a.reload}
            className="cursor-pointer underline underline-offset-2"
          >
            새로고침
          </button>
        </div>
      )}

      {a.status !== "loading" && a.status !== "error" && items.length === 0 && (
        <p className="text-[13.5px] text-n500">
          {editable ? "아직 올린 파일이 없습니다." : "첨부 자료 없음"}
        </p>
      )}

      {items.length > 0 && (
        <AttachmentList
          items={items}
          disabled={a.busy}
          onDownload={(fileId) => void a.download(fileId)}
          onRemove={editable ? (fileId) => void a.remove(fileId) : undefined}
        />
      )}

      {editable && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={FILE_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void a.upload(file);
            }}
          />
          <button
            type="button"
            disabled={a.busy}
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer rounded-[12px] border border-line-strong px-[14px] py-[8px] text-[14px] text-n300 transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {a.busy ? "처리 중…" : "+ 파일 올리기"}
          </button>
        </div>
      )}

      {a.actionError && <p className="text-[12.5px] text-danger">{a.actionError}</p>}
    </Card>
  );
}
