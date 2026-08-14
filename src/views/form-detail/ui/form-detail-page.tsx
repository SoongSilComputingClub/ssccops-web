"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FORM_STTS_BADGE,
  formLblsOf,
  useFormStore,
  type FormPage,
  type Qitem,
} from "@/entities/form";
import { useMbrStore } from "@/entities/member";
import { useRspnsStore } from "@/entities/response";
import {
  isChoiceQitemType,
  QITEM_TYPE_NM,
  type RspnsSttsCd,
} from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";
import { formatDt, formatYmd } from "@/shared/lib/date";
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  KeyValueGrid,
  PageBody,
  PageHeader,
  Pill,
  SectionLabel,
  StatBox,
  flash,
} from "@/shared/ui";

function QitemPreview({
  qitem,
  sel,
  onPick,
  pages,
}: {
  qitem: Qitem;
  sel: string[];
  onPick: (option: string) => void;
  pages: FormPage[];
}) {
  const isChoice = isChoiceQitemType(qitem.qitemTypeCd);
  return (
    <div className="border-t border-black/5 py-3 first:border-t-0">
      <div className="text-[16px] font-medium">
        {qitem.qitemLblNm || "(제목 없음)"}
        {qitem.reqYn && <span className="ml-1 text-accent">*</span>}
      </div>
      <div className="mt-[2px] text-[12.5px] text-n500">
        {qitem.qitemId} · {QITEM_TYPE_NM[qitem.qitemTypeCd]}
      </div>
      {qitem.ptrnCn && (
        <div className="mt-1 font-mono text-[12px] text-n500">
          입력 형식 · {qitem.ptrnNm} · {qitem.ptrnCn}
        </div>
      )}
      {isChoice && qitem.maxSlctCnt && (
        <div className="mt-1 text-[12.5px] text-accent">
          최대 {qitem.maxSlctCnt}개
        </div>
      )}
      {isChoice ? (
        <div className="mt-2 flex flex-col gap-[6px]">
          {qitem.optionList.map((o) => {
            const picked = sel.includes(o);
            const branch = qitem.branchMap?.[o];
            return (
              <div
                key={o}
                onClick={() => onPick(o)}
                className="flex cursor-pointer items-center gap-2 text-[14.5px]"
              >
                <div
                  className={cn(
                    "size-[14px] flex-none border",
                    qitem.qitemTypeCd === "SINGLE_CHOICE"
                      ? "rounded-full"
                      : "rounded-[3px]",
                    picked ? "border-accent bg-accent" : "border-line-strong",
                  )}
                />
                <span>{o}</span>
                {branch !== undefined && (
                  <span className="text-[12.5px] text-accent">
                    → {branch + 1}. {pages[branch]?.pageTtl ?? ""}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className={cn(
            "mt-2 rounded-[10px] border border-line bg-[#f9fafb] px-3 py-2 text-[14px] text-n500",
            qitem.qitemTypeCd === "LONG_TEXT" && "min-h-[56px]",
          )}
        >
          답변 입력
        </div>
      )}
    </div>
  );
}

export function FormDetailPage({ formId }: { formId: number }) {
  const router = useRouter();
  const { forms, formLbls, formLblRels, updateForm, duplicateForm } = useFormStore();
  const formRspnsHstrys = useRspnsStore((s) => s.formRspnsHstrys);
  const mbrs = useMbrStore((s) => s.mbrs);
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Record<string, string[]>>({});

  const form = forms.find((f) => f.formId === formId);

  if (!form) {
    return (
      <>
        <PageHeader title="폼 상세" showBack />
        <PageBody>
          <EmptyState message="폼을 찾을 수 없습니다." />
        </PageBody>
      </>
    );
  }

  const badge = FORM_STTS_BADGE[form.formSttsCd];
  const { pages, qitems } = form.qitemCpstCn;
  const pageQitems = qitems.filter((q) => (q.pageSeq ?? 0) === page);
  const rspns = formRspnsHstrys.filter((r) => r.formId === form.formId);
  const lbls = formLblsOf(formLblRels, formLbls, form.formId);
  const creatrNm =
    mbrs.find((m) => m.mbrId === form.creatrMbrId)?.mbrNm ?? String(form.creatrMbrId);

  const pick = (qitem: Qitem, option: string) => {
    setSel((s) => {
      const cur = s[qitem.qitemId] ?? [];
      if (qitem.qitemTypeCd === "SINGLE_CHOICE")
        return { ...s, [qitem.qitemId]: [option] };
      if (cur.includes(option))
        return { ...s, [qitem.qitemId]: cur.filter((o) => o !== option) };
      if (qitem.maxSlctCnt && cur.length >= qitem.maxSlctCnt) return s;
      return { ...s, [qitem.qitemId]: [...cur, option] };
    });
  };

  const nextPage = () => {
    for (const q of pageQitems) {
      if (q.qitemTypeCd === "SINGLE_CHOICE" && q.branchMap) {
        const picked = sel[q.qitemId]?.[0];
        if (picked !== undefined && q.branchMap[picked] !== undefined) {
          return q.branchMap[picked];
        }
      }
    }
    return Math.min(pages.length - 1, page + 1);
  };

  const toggleFormStts = () => {
    if (form.formSttsCd === "OPEN") {
      updateForm(form.formId, { formSttsCd: "CLOSED" });
      flash("마감했습니다");
    } else {
      updateForm(form.formId, { formSttsCd: "OPEN" });
      flash("접수를 시작했습니다");
    }
  };

  const publicUrl = `https://form.sscc.kr${ROUTES.publicForm(form.formId)}`;
  const copyLink = () => {
    navigator.clipboard?.writeText(publicUrl);
    flash("링크를 복사했습니다");
  };

  const stat = (cd: RspnsSttsCd) => rspns.filter((r) => r.rspnsSttsCd === cd).length;

  return (
    <>
      <PageHeader
        title="폼 상세"
        subtitle={`폼 #${form.formId}`}
        showBack
        action={{
          label: "응답",
          onClick: () => router.push(ROUTES.responses(form.formId)),
        }}
      />
      <PageBody>
        <div className="grid grid-cols-2 items-start gap-4">
          <div className="flex flex-col gap-4">
            <Card>
              <div className="flex items-center gap-2">
                <Badge tone={badge.tone}>{badge.label}</Badge>
                <span className="font-mono text-[13px] text-n500">
                  폼 #{form.formId}
                </span>
              </div>
              <div className="mt-2 text-[23px] font-medium">{form.formTtlNm}</div>
              <KeyValueGrid
                className="mt-4"
                labelWidth={90}
                items={[
                  { k: "접수_시작_일시", v: formatDt(form.rcptBgngDt) || "미설정" },
                  { k: "접수_종료_일시", v: formatDt(form.rcptEndDt) || "미설정" },
                  { k: "생성자_회원", v: creatrNm },
                  { k: "생성_일시", v: formatYmd(form.crtDt) },
                  { k: "수정_일시", v: formatYmd(form.mdfcnDt) },
                ]}
              />
              {lbls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-[6px]">
                  {lbls.map((l) => (
                    <Pill key={l.formLblId} tone="blue">
                      {l.lblNm}
                    </Pill>
                  ))}
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => router.push(ROUTES.formEdit(form.formId))}
                >
                  수정
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    duplicateForm(form.formId);
                    flash("DRAFT 폼으로 복제했습니다");
                  }}
                >
                  복제
                </Button>
              </div>
              <div className="mt-3 flex items-center rounded-[12px] border border-line p-3">
                <div className="text-[14.5px]">접수 상태 변경</div>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={toggleFormStts}
                  className="cursor-pointer rounded-[10px] border border-line-strong bg-bg px-3 py-[6px] text-[14px] hover:border-accent hover:text-accent"
                >
                  {form.formSttsCd === "OPEN" ? "마감" : "접수 시작"}
                </button>
              </div>
            </Card>

            <Card>
              <SectionLabel className="mb-3">공개 링크</SectionLabel>
              <div className="rounded-[10px] bg-[#f9fafb] p-3 text-[14px] break-all text-accent">
                {publicUrl}
              </div>
              <div className="mt-3 flex gap-2">
                <Button onClick={() => router.push(ROUTES.publicForm(form.formId))}>
                  링크 열기
                </Button>
                <Button variant="ghost" onClick={copyLink}>
                  링크 복사
                </Button>
              </div>
              <div className="mt-2 text-[13px] text-n500">
                공개 링크는 폼_ID 기준으로 고정됩니다.
              </div>
            </Card>

            <Card>
              <SectionLabel className="mb-3">응답 요약</SectionLabel>
              <div className="grid grid-cols-4 gap-2">
                <StatBox label="전체" value={rspns.length} />
                <StatBox label="제출" value={stat("SUBMITTED")} />
                <StatBox label="승인" value={stat("ACCEPTED")} tone="accent" />
                <StatBox label="반려" value={stat("REJECTED")} tone="danger" />
              </div>
              <Button
                className="mt-3"
                onClick={() => router.push(ROUTES.responses(form.formId))}
              >
                응답 보기
              </Button>
            </Card>
          </div>

          <Card>
            <SectionLabel className="mb-3">문항 미리보기</SectionLabel>
            <div className="mb-3 flex flex-wrap gap-[6px]">
              {pages.map((p, i) => (
                <Chip key={i} active={page === i} onClick={() => setPage(i)}>
                  {i + 1}. {p.pageTtl}
                </Chip>
              ))}
            </div>
            <div className="rounded-[10px] bg-[#f9fafb] p-3">
              <div className="text-[12.5px] text-n500">
                {page + 1} / {pages.length} 페이지
              </div>
              <div className="mt-1 text-[18px] font-semibold">
                {pages[page]?.pageTtl}
              </div>
              {pages[page]?.pageDescCn && (
                <div className="mt-1 text-[13.5px] whitespace-pre-line text-n400">
                  {pages[page].pageDescCn}
                </div>
              )}
            </div>
            <div className="mt-2">
              {pageQitems.length === 0 ? (
                <div className="py-5 text-center text-[14.5px] text-n500">
                  이 페이지에는 문항이 없습니다.
                </div>
              ) : (
                pageQitems.map((q) => (
                  <QitemPreview
                    key={q.qitemId}
                    qitem={q}
                    sel={sel[q.qitemId] ?? []}
                    onPick={(o) => pick(q, o)}
                    pages={pages}
                  />
                ))
              )}
            </div>
            <div className="mt-4 flex max-w-[420px] gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                이전 페이지
              </Button>
              <Button
                variant="ghost"
                className="flex-1"
                disabled={page >= pages.length - 1}
                onClick={() => setPage(nextPage())}
              >
                다음 페이지
              </Button>
            </div>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
