"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FORM_STATUS,
  makeSlug,
  useFormStore,
  type Form,
  type Question,
} from "@/entities/form";
import { RESPONSE_STATUS, useResponseStore } from "@/entities/response";
import { isChoiceType, TODAY } from "@/shared/config/constants";
import { ROUTES } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";
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

function QuestionPreview({
  q,
  sel,
  onPick,
  pages,
}: {
  q: Question;
  sel: string[];
  onPick: (option: string) => void;
  pages: Form["pages"];
}) {
  return (
    <div className="border-t border-black/5 py-3 first:border-t-0">
      <div className="text-[16px] font-medium">
        {q.label || "(제목 없음)"}
        {q.required && <span className="ml-1 text-accent">*</span>}
      </div>
      <div className="mt-[2px] text-[12.5px] text-n500">
        {q.qid} · {q.type}
      </div>
      {q.pattern && (
        <div className="mt-1 font-mono text-[12px] text-n500">
          입력 형식 · {q.patternName} · {q.pattern}
        </div>
      )}
      {isChoiceType(q.type) && (
        <div className="mt-1 text-[12.5px] text-accent">
          {q.type}
          {q.maxSelect ? ` · 최대 ${q.maxSelect}개` : ""}
        </div>
      )}
      {isChoiceType(q.type) ? (
        <div className="mt-2 flex flex-col gap-[6px]">
          {q.options.map((o) => {
            const picked = sel.includes(o);
            const branch = q.branch?.[o];
            return (
              <div
                key={o}
                onClick={() => onPick(o)}
                className="flex cursor-pointer items-center gap-2 text-[14.5px]"
              >
                <div
                  className={cn(
                    "size-[14px] flex-none border",
                    q.type === "단일선택" ? "rounded-full" : "rounded-[3px]",
                    picked ? "border-accent bg-accent" : "border-line-strong",
                  )}
                />
                <span>{o}</span>
                {branch !== undefined && (
                  <span className="text-[12.5px] text-accent">
                    → {branch + 1}. {pages[branch]?.title ?? ""}
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
            q.type === "장문형" && "min-h-[56px]",
          )}
        >
          답변 입력
        </div>
      )}
    </div>
  );
}

export function FormDetailPage({ formKey }: { formKey: string }) {
  const router = useRouter();
  const form = useFormStore((s) => s.forms.find((f) => f.key === formKey));
  const { updateForm, duplicateForm } = useFormStore();
  const responses = useResponseStore((s) =>
    s.responses.filter((r) => r.form === formKey),
  );
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Record<string, string[]>>({});

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

  const fs = FORM_STATUS[form.status];
  const pageQuestions = form.questions.filter((q) => (q.page ?? 0) === page);

  const pick = (q: Question, option: string) => {
    setSel((s) => {
      const cur = s[q.qid] ?? [];
      if (q.type === "단일선택") return { ...s, [q.qid]: [option] };
      if (cur.includes(option))
        return { ...s, [q.qid]: cur.filter((o) => o !== option) };
      if (q.maxSelect && cur.length >= q.maxSelect) return s;
      return { ...s, [q.qid]: [...cur, option] };
    });
  };

  const nextPage = () => {
    for (const q of pageQuestions) {
      if (q.type === "단일선택" && q.branch) {
        const picked = sel[q.qid]?.[0];
        if (picked !== undefined && q.branch[picked] !== undefined) {
          return q.branch[picked];
        }
      }
    }
    return Math.min(form.pages.length - 1, page + 1);
  };

  const toggleStatus = () => {
    if (form.status === "OPEN") {
      updateForm(form.key, { status: "CLOSED", updated: TODAY });
      flash("마감했습니다");
    } else {
      updateForm(form.key, { status: "OPEN", updated: TODAY });
      flash("접수를 시작했습니다");
    }
  };

  const issueLink = () => {
    updateForm(form.key, { slug: makeSlug(form.title, form.key + form.updated) });
    flash("공개 링크를 생성했습니다");
  };

  const copyLink = () => {
    navigator.clipboard?.writeText(`https://form.sscc.kr/${form.slug}`);
    flash("링크를 복사했습니다");
  };

  const stat = (status: keyof typeof RESPONSE_STATUS) =>
    responses.filter((r) => r.status === status).length;

  return (
    <>
      <PageHeader
        title="폼 상세"
        subtitle={form.id}
        showBack
        action={{
          label: "응답",
          onClick: () => router.push(ROUTES.responses(form.key)),
        }}
      />
      <PageBody>
        <div className="grid grid-cols-2 items-start gap-4">
          <div className="flex flex-col gap-4">
            <Card>
              <div className="flex items-center gap-2">
                <Badge tone={fs.tone}>{fs.label}</Badge>
                <span className="font-mono text-[13px] text-n500">{form.id}</span>
              </div>
              <div className="mt-2 text-[23px] font-medium">{form.title}</div>
              <KeyValueGrid
                className="mt-4"
                labelWidth={90}
                items={[
                  { k: "접수 시작", v: form.start || "미설정" },
                  { k: "접수 종료", v: form.end || "미설정" },
                  { k: "중복 제출", v: form.dup ? "허용" : "불가" },
                  { k: "생성자", v: form.by },
                  { k: "생성일", v: form.created },
                ]}
              />
              {form.labels.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-[6px]">
                  {form.labels.map((l) => (
                    <Pill key={l} tone="blue">
                      {l}
                    </Pill>
                  ))}
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => router.push(ROUTES.formEdit(form.key))}
                >
                  수정
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    duplicateForm(form.key);
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
                  onClick={toggleStatus}
                  className="cursor-pointer rounded-[10px] border border-line-strong bg-bg px-3 py-[6px] text-[14px] hover:border-accent hover:text-accent"
                >
                  {form.status === "OPEN" ? "마감" : "접수 시작"}
                </button>
              </div>
            </Card>

            <Card>
              <SectionLabel className="mb-3">공개 링크</SectionLabel>
              {form.slug ? (
                <>
                  <div className="rounded-[10px] bg-[#f9fafb] p-3 text-[14px] break-all text-accent">
                    https://form.sscc.kr/{form.slug}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button onClick={() => router.push(ROUTES.publicForm(form.slug))}>
                      링크 열기
                    </Button>
                    <Button variant="ghost" onClick={copyLink}>
                      링크 복사
                    </Button>
                    <Button variant="ghost" onClick={issueLink}>
                      새 링크 발급
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[14.5px] text-n500">
                    아직 공개 링크가 없습니다.
                  </div>
                  <Button className="mt-3" onClick={issueLink}>
                    공개 링크 생성
                  </Button>
                </>
              )}
            </Card>

            <Card>
              <SectionLabel className="mb-3">응답 요약</SectionLabel>
              <div className="grid grid-cols-4 gap-2">
                <StatBox label="전체" value={responses.length} />
                <StatBox label="제출" value={stat("SUBMITTED")} />
                <StatBox label="승인" value={stat("ACCEPTED")} tone="accent" />
                <StatBox label="반려" value={stat("REJECTED")} tone="danger" />
              </div>
              <Button
                className="mt-3"
                onClick={() => router.push(ROUTES.responses(form.key))}
              >
                응답 보기
              </Button>
            </Card>
          </div>

          <Card>
            <SectionLabel className="mb-3">문항 미리보기</SectionLabel>
            <div className="mb-3 flex flex-wrap gap-[6px]">
              {form.pages.map((p, i) => (
                <Chip key={i} active={page === i} onClick={() => setPage(i)}>
                  {i + 1}. {p.title}
                </Chip>
              ))}
            </div>
            <div className="rounded-[10px] bg-[#f9fafb] p-3">
              <div className="text-[12.5px] text-n500">
                {page + 1} / {form.pages.length} 페이지
              </div>
              <div className="mt-1 text-[18px] font-semibold">
                {form.pages[page]?.title}
              </div>
              {form.pages[page]?.desc && (
                <div className="mt-1 text-[13.5px] whitespace-pre-line text-n400">
                  {form.pages[page].desc}
                </div>
              )}
            </div>
            <div className="mt-2">
              {pageQuestions.length === 0 ? (
                <div className="py-5 text-center text-[14.5px] text-n500">
                  이 페이지에는 문항이 없습니다.
                </div>
              ) : (
                pageQuestions.map((q) => (
                  <QuestionPreview
                    key={q.qid}
                    q={q}
                    sel={sel[q.qid] ?? []}
                    onPick={(o) => pick(q, o)}
                    pages={form.pages}
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
                disabled={page >= form.pages.length - 1}
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
