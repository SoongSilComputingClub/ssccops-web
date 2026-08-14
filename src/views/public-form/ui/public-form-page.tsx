"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStore, type Qitem } from "@/entities/form";
import type { RspnsCn } from "@/entities/response";
import { usePublicSubmit } from "@/features/form/model/use-public-submit";
import { isChoiceQitemType } from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";
import { formatDt } from "@/shared/lib/date";
import { EmptyState, flash } from "@/shared/ui";

export function PublicFormPage({ formId }: { formId: number }) {
  const router = useRouter();
  const form = useFormStore((s) => s.forms.find((f) => f.formId === formId));
  const submit = usePublicSubmit();

  const [page, setPage] = useState(0);
  const [rspnsCn, setRspnsCn] = useState<RspnsCn>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!form) {
    return (
      <div className="mx-auto max-w-[720px] px-6 py-10">
        <EmptyState message="존재하지 않는 폼입니다." />
      </div>
    );
  }

  const { pages, qitems } = form.qitemCpstCn;
  const pageQitems = qitems.filter((q) => (q.pageSeq ?? 0) === page);
  const isLast = page >= pages.length - 1;

  const setAnswer = (q: Qitem, value: string[] | string) => {
    setRspnsCn((a) => ({ ...a, [q.qitemId]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[q.qitemId];
      return next;
    });
  };

  const pickChoice = (q: Qitem, option: string) => {
    const cur = (rspnsCn[q.qitemId] as string[] | undefined) ?? [];
    if (q.qitemTypeCd === "SINGLE_CHOICE") {
      setAnswer(q, [option]);
      return;
    }
    if (cur.includes(option)) {
      setAnswer(
        q,
        cur.filter((o) => o !== option),
      );
      return;
    }
    if (q.maxSlctCnt && cur.length >= q.maxSlctCnt) return;
    setAnswer(q, [...cur, option]);
  };

  const validatePage = () => {
    const errs: Record<string, string> = {};
    for (const q of pageQitems) {
      const v = rspnsCn[q.qitemId];
      const text = Array.isArray(v) ? v.join(", ") : (v ?? "");
      if (q.reqYn && !text) {
        errs[q.qitemId] = "필수 항목입니다";
        continue;
      }
      if (q.ptrnCn && text && !new RegExp(q.ptrnCn).test(text)) {
        errs[q.qitemId] = q.ptrnMsgCn || `${q.ptrnNm || "형식"} 형식이 맞지 않습니다`;
      }
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      flash("입력을 확인해주세요");
      return false;
    }
    return true;
  };

  const nextTarget = () => {
    for (const q of pageQitems) {
      if (q.qitemTypeCd === "SINGLE_CHOICE" && q.branchMap) {
        const picked = (rspnsCn[q.qitemId] as string[] | undefined)?.[0];
        if (picked !== undefined && q.branchMap[picked] !== undefined)
          return q.branchMap[picked];
      }
    }
    return Math.min(pages.length - 1, page + 1);
  };

  const onNext = () => {
    if (!validatePage()) return;
    if (isLast) {
      submit(form, rspnsCn);
      router.push(ROUTES.publicFormDone(form.formId));
      return;
    }
    setPage(nextTarget());
    window.scrollTo(0, 0);
  };

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-3 px-6 pt-7 pb-10">
      <div className="rounded-2xl bg-surface px-6 py-[22px] shadow-[0_0_0_1px_#e5e8eb]">
        <div className="flex items-center gap-[10px]">
          <div className="flex size-[26px] items-center justify-center rounded-[7px] border border-accent text-[13px] text-accent">
            S
          </div>
          <div className="text-[15px] font-semibold">SSCC</div>
        </div>
        <div className="mt-3 text-[24px] leading-[1.3] font-bold">
          {form.formTtlNm}
        </div>
        <div className="mt-1 text-[13.5px] text-n500">
          {form.rcptBgngDt
            ? `접수 ${formatDt(form.rcptBgngDt)} ~ ${formatDt(form.rcptEndDt) || "미정"}`
            : "접수 기간 미정"}
        </div>
        <div className="mt-4 h-[5px] overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${Math.round(((page + 1) / pages.length) * 100)}%` }}
          />
        </div>
        <div className="mt-1 text-[12.5px] text-n500">
          {page + 1} / {pages.length} 페이지
        </div>
      </div>

      <div className="rounded-2xl bg-surface px-6 py-[22px] shadow-[0_0_0_1px_#e5e8eb]">
        <div className="text-[18px] font-semibold">
          {page + 1}. {pages[page]?.pageTtl}
        </div>
        {pages[page]?.pageDescCn && (
          <div className="mt-1 text-[14px] whitespace-pre-line text-n400">
            {pages[page].pageDescCn}
          </div>
        )}
      </div>

      {pageQitems.map((q) => {
        const error = errors[q.qitemId];
        const selected = (rspnsCn[q.qitemId] as string[] | undefined) ?? [];
        return (
          <div
            key={q.qitemId}
            className={cn(
              "rounded-2xl bg-surface px-[18px] py-4",
              error ? "shadow-[0_0_0_1px_#f04452]" : "shadow-[0_0_0_1px_#e5e8eb]",
            )}
          >
            <div className="text-[16px] font-semibold">
              {q.qitemLblNm}
              {q.reqYn && <span className="ml-1 text-danger">*</span>}
            </div>
            {isChoiceQitemType(q.qitemTypeCd) && (
              <div className="mt-[2px] text-[12.5px] text-n500">
                {q.qitemTypeCd === "SINGLE_CHOICE"
                  ? "하나만 선택"
                  : `여러 개 선택 가능${q.maxSlctCnt ? ` · 최대 ${q.maxSlctCnt}개` : ""}`}
              </div>
            )}
            {q.ptrnCn && (
              <div className="mt-[2px] text-[12.5px] text-n500">형식 · {q.ptrnNm}</div>
            )}

            {q.qitemTypeCd === "LONG_TEXT" ? (
              <textarea
                value={(rspnsCn[q.qitemId] as string) ?? ""}
                onChange={(e) => setAnswer(q, e.target.value)}
                placeholder="자유롭게 작성해주세요"
                className="mt-3 min-h-[104px] w-full resize-y rounded-[12px] border border-line px-[11px] py-[9px] text-[15.5px] outline-none placeholder:text-n500 focus:border-accent"
              />
            ) : q.qitemTypeCd === "SHORT_TEXT" || q.qitemTypeCd === "DATE" ? (
              <input
                type={q.qitemTypeCd === "DATE" ? "date" : "text"}
                value={(rspnsCn[q.qitemId] as string) ?? ""}
                onChange={(e) => setAnswer(q, e.target.value)}
                className="mt-3 w-full rounded-[12px] border border-line px-[11px] py-[9px] text-[15.5px] outline-none placeholder:text-n500 focus:border-accent"
              />
            ) : (
              <div className="mt-3 flex flex-col gap-1">
                {q.optionList.map((o) => {
                  const picked = selected.includes(o);
                  return (
                    <div
                      key={o}
                      onClick={() => pickChoice(q, o)}
                      className={cn(
                        "flex cursor-pointer items-center gap-[10px] rounded-[12px] px-[10px] py-[11px] text-[15px]",
                        picked ? "bg-accent/8" : "hover:bg-black/2",
                      )}
                    >
                      <div
                        className={cn(
                          "size-[18px] flex-none border",
                          q.qitemTypeCd === "SINGLE_CHOICE"
                            ? "rounded-full"
                            : "rounded-[5px]",
                          picked ? "border-accent bg-accent" : "border-line-strong",
                        )}
                      />
                      {o}
                    </div>
                  );
                })}
              </div>
            )}
            {error && <div className="mt-2 text-[13.5px] text-danger">{error}</div>}
          </div>
        );
      })}

      <div className="mt-1 flex gap-2">
        {page > 0 && (
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="flex-1 cursor-pointer rounded-[14px] border border-line-strong bg-surface py-[14px] text-[15.5px] text-n300 hover:border-accent hover:text-accent"
          >
            이전
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          className="flex-[2] cursor-pointer rounded-[14px] border border-accent bg-accent py-[14px] text-[15.5px] font-bold text-white hover:bg-accent-strong"
        >
          {isLast ? "제출하기" : "다음"}
        </button>
      </div>
      <button
        type="button"
        onClick={() => router.push(ROUTES.formDetail(form.formId))}
        className="cursor-pointer py-1 text-center text-[14px] text-n500 hover:text-accent"
      >
        관리자 화면으로 돌아가기
      </button>
    </div>
  );
}
