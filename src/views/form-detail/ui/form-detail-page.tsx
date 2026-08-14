"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FORM_STTS_BADGE,
  useFormStore,
  type FormDetail,
  type FormPage,
  type Qitem,
} from "@/entities/form";
import { useFormDetail } from "@/features/form";
import { isChoiceQitemType, QITEM_TYPE_NM } from "@/shared/config/codes";
import { publicFormUrl, ROUTES } from "@/shared/config/routes";
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

/**
 * 서버에서 받아 온 폼 한 건을 그린다.
 *
 * 조회 상태 분기와 분리한 것은 미리보기 상태(현재 페이지·선택지)가 **폼이 도착한 뒤에야
 * 의미가 있기** 때문이다. 한 컴포넌트에 두면 로딩 중에도 페이지 인덱스를 들고 있게 되고,
 * 폼이 바뀌었을 때 초기화를 따로 챙겨야 한다.
 */
function FormDetailContent({ form }: { form: FormDetail }) {
  const router = useRouter();
  /*
   * 접수 상태 변경·복제는 아직 목 스토어를 호출한다 — 서버 연동은 #9(접수 상태 전환·복제)의
   * 몫이라 이 이슈에서는 조회 경로만 서버로 옮긴다. 목록·상세가 서버에서 오므로 여기서 바꾼
   * 상태는 화면에 반영되지 않는다는 점을 #9에서 함께 정리한다.
   */
  const { updateForm, duplicateForm } = useFormStore();
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Record<string, string[]>>({});

  const badge = FORM_STTS_BADGE[form.formSttsCd];
  const { pages, qitems } = form.qitemCpstCn;
  const pageQitems = qitems.filter((q) => (q.pageSeq ?? 0) === page);
  const summary = form.responseSummary;

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

  /* 분기 이동은 이미 받아 온 문항 구성만 보면 되므로 서버 왕복 없이 화면에서 계산한다 */
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

  const publicUrl = publicFormUrl(form.formId);
  const copyLink = () => {
    navigator.clipboard?.writeText(publicUrl);
    flash("링크를 복사했습니다");
  };

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
                  // 서버가 mbr을 조인해 준 이름 — 회원 목록을 따로 뒤지지 않는다
                  { k: "생성자_회원", v: form.creatr.mbrNm },
                  { k: "생성_일시", v: formatYmd(form.crtDt) },
                  { k: "수정_일시", v: formatYmd(form.mdfcnDt) },
                ]}
              />
              {form.labels.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-[6px]">
                  {form.labels.map((l) => (
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
              {/* 서버 집계값 — 작성 중(DRAFT) 응답은 어느 칸에도 들어가지 않는다 */}
              <div className="grid grid-cols-4 gap-2">
                <StatBox label="전체" value={summary.total} />
                <StatBox label="제출" value={summary.submitted} />
                <StatBox label="승인" value={summary.accepted} tone="accent" />
                <StatBox label="반려" value={summary.rejected} tone="danger" />
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

/**
 * 폼 상세 — 목록을 거치지 않고 단건 API로 받는다.
 *
 * 예전에는 목 스토어의 전체 목록에서 find()로 골랐다. 목록 응답에는 문항 구성(qitemCpstCn)이
 * 실리지 않으므로 그 방식은 서버 연동에서 성립하지 않고, URL로 바로 들어온 경우 목록 자체가
 * 없어 "폼을 찾을 수 없습니다"가 떴다.
 */
export function FormDetailPage({ formId }: { formId: number }) {
  const { form, status, errorMessage, reload } = useFormDetail(formId);

  if (status === "ready" && form) return <FormDetailContent form={form} />;

  return (
    <>
      <PageHeader title="폼 상세" showBack />
      <PageBody>
        {status === "loading" && <EmptyState message="불러오는 중…" />}
        {status === "not-found" && <EmptyState message="폼을 찾을 수 없습니다." />}
        {status === "error" && (
          <EmptyState
            message={errorMessage || "폼을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: reload }}
          />
        )}
      </PageBody>
    </>
  );
}
