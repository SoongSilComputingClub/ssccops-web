"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FORM_STTS_BADGE, formLblsOf, useFormStore } from "@/entities/form";
import { useRspnsStore } from "@/entities/response";
import { FORM_STTS_CDS, type FormSttsCd } from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import { formatDt, formatYmd } from "@/shared/lib/date";
import { Badge, Card, Chip, PageBody, PageHeader, Pill, flash } from "@/shared/ui";

const ALL = "전체";

export function FormListPage() {
  const router = useRouter();
  const { forms, formLbls, formLblRels, duplicateForm } = useFormStore();
  const formRspnsHstrys = useRspnsStore((s) => s.formRspnsHstrys);
  const [formSttsCd, setFormSttsCd] = useState<string>(ALL);
  const [formLblId, setFormLblId] = useState<number | null>(null);

  const filtered = forms.filter((f) => {
    if (formSttsCd !== ALL && f.formSttsCd !== formSttsCd) return false;
    if (formLblId !== null) {
      return formLblRels.some(
        (r) => r.formId === f.formId && r.formLblId === formLblId,
      );
    }
    return true;
  });

  return (
    <>
      <PageHeader
        title="폼 관리"
        subtitle="라벨 중심 분류"
        action={{ label: "+ 새 폼", onClick: () => router.push(ROUTES.formNew) }}
      />
      <PageBody>
        <div className="mb-4 flex flex-wrap items-center gap-[7px]">
          <Chip active={formSttsCd === ALL} onClick={() => setFormSttsCd(ALL)}>
            {ALL}
          </Chip>
          {FORM_STTS_CDS.map((cd) => (
            <Chip
              key={cd}
              active={formSttsCd === cd}
              onClick={() => setFormSttsCd(cd)}
            >
              {FORM_STTS_BADGE[cd as FormSttsCd].label}
            </Chip>
          ))}
          <div className="mx-2 h-5 w-px bg-line" />
          <Chip active={formLblId === null} onClick={() => setFormLblId(null)}>
            {ALL}
          </Chip>
          {formLbls
            .filter((l) => l.useYn)
            .map((l) => (
              <Chip
                key={l.formLblId}
                active={formLblId === l.formLblId}
                onClick={() => setFormLblId(l.formLblId)}
              >
                {l.lblNm}
              </Chip>
            ))}
        </div>

        <div className="grid grid-cols-2 gap-[14px]">
          {filtered.map((f) => {
            const rspnsCnt = formRspnsHstrys.filter(
              (r) => r.formId === f.formId,
            ).length;
            const badge = FORM_STTS_BADGE[f.formSttsCd];
            const lbls = formLblsOf(formLblRels, formLbls, f.formId);
            return (
              <Card key={f.formId}>
                <div className="flex items-center gap-2">
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                  <div className="flex-1" />
                  <div className="text-[13.5px] text-n500">응답 {rspnsCnt}</div>
                </div>
                <div
                  onClick={() => router.push(ROUTES.formDetail(f.formId))}
                  className="mt-2 cursor-pointer text-[18px] leading-[1.35] font-semibold hover:text-accent"
                >
                  {f.formTtlNm}
                </div>
                <div className="mt-1 text-[13.5px] text-n500">
                  {f.rcptBgngDt
                    ? `${formatDt(f.rcptBgngDt)} ~ ${formatDt(f.rcptEndDt)}`
                    : "접수 기간 미설정"}
                </div>
                {lbls.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-[6px]">
                    {lbls.map((l) => (
                      <Pill key={l.formLblId} tone="blue">
                        {l.lblNm}
                      </Pill>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex items-center gap-3 border-t border-black/5 pt-3 text-[14px]">
                  <button
                    type="button"
                    onClick={() => {
                      duplicateForm(f.formId);
                      flash("DRAFT 폼으로 복제했습니다");
                    }}
                    className="cursor-pointer text-accent"
                  >
                    복제
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(ROUTES.formEdit(f.formId))}
                    className="cursor-pointer text-accent"
                  >
                    수정
                  </button>
                  <div className="flex-1" />
                  <div className="text-[13px] text-n500">
                    수정 {formatYmd(f.mdfcnDt)}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </PageBody>
    </>
  );
}
