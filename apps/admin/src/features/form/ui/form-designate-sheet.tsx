"use client";

import {
  FORM_RECEIPT_BADGE,
  RECRUIT_DESIGNATE_CONFIRM_TITLE,
  RECRUIT_DESIGNATE_HINT,
  RECRUIT_DESIGNATE_PREV_NOTE,
  type FormReceiptStatus,
} from "@/entities/form";
import { formatDt } from "@/shared/lib/date";
import { Badge, Sheet } from "@/shared/ui";

/*
 * 신입회원 모집 폼 지정 확인 시트 (#588 · ssccops#436 · ADR-0044).
 *
 * 지정 자체는 되돌릴 수 있다(다른 폼을 다시 지정하면 된다). 그래도 한 번 묻는 것은 **이전 지정
 * 폼의 지정이 풀린다**는 결과가 이 화면 밖(지난 학기 폼 · 홍보 사이트 모집 페이지)에서 일어나기
 * 때문이다 — 접수 마감 시트가 «작성 중인 응답자»를 이유로 묻는 것과 같은 저울이다.
 *
 * 접수 상태를 함께 보여주는 것은 지정 직후 홍보 사이트에 무엇이 보이는지가 그 값으로 갈리기
 * 때문이다 — 작성 중(DRAFT)이면 모집 페이지에 아무것도 뜨지 않고(익명 meta가 404), 접수 예정이면
 * «n월 n일부터», 접수 중이면 «지원하기»다. 지정하고 나서 «왜 안 뜨지»가 되지 않게 미리 보인다.
 */
export function FormDesignateSheet({
  open,
  formTtlNm,
  receiptStatus,
  rcptBgngDt,
  rcptEndDt,
  pending,
  onClose,
  onConfirm,
}: Readonly<{
  open: boolean;
  formTtlNm: string;
  receiptStatus: FormReceiptStatus;
  rcptBgngDt: string | null;
  rcptEndDt: string | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}>) {
  const badge = FORM_RECEIPT_BADGE[receiptStatus];
  return (
    <Sheet
      open={open}
      title={RECRUIT_DESIGNATE_CONFIRM_TITLE}
      hint={RECRUIT_DESIGNATE_HINT}
      onClose={onClose}
      // 연타로 두 번 나가는 것은 훅이 막지만, 진행 중에는 눌러도 아무 일이 없다는 것을 문구로 보인다
      onOk={() => {
        if (!pending) onConfirm();
      }}
      okLabel={pending ? "지정하는 중…" : "지정"}
    >
      <div className="rounded-[12px] border border-line p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={badge.tone}>{badge.label}</Badge>
          <div className="text-[15px] font-medium">{formTtlNm}</div>
        </div>
        <div className="mt-[6px] text-[13.5px] text-n500">
          접수 기간 · {rcptBgngDt ? `${formatDt(rcptBgngDt)} ~ ${formatDt(rcptEndDt)}` : "미설정"}
        </div>
      </div>
      <div className="mt-3 text-[13.5px] leading-[1.6] text-n400">{RECRUIT_DESIGNATE_PREV_NOTE}</div>
    </Sheet>
  );
}
