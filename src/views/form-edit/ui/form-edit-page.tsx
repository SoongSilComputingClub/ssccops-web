"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStore, type Form, type Question } from "@/entities/form";
import {
  PATTERN_PRESETS,
  QTYPES,
  TODAY,
  isChoiceType,
} from "@/shared/config/constants";
import { fromInput, toInput } from "@/shared/lib/date";
import { ROUTES } from "@/shared/config/routes";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  PageBody,
  PageHeader,
  SectionLabel,
  TextField,
  Toggle,
  flash,
} from "@/shared/ui";

const EMPTY_FORM: Form = {
  id: "(자동 채번)",
  key: "",
  title: "",
  slug: "",
  status: "DRAFT",
  labels: [],
  start: "",
  end: "",
  dup: false,
  by: "김도현",
  created: TODAY,
  updated: TODAY,
  pages: [{ title: "페이지 1", desc: "" }],
  questions: [
    { qid: "문항_1", label: "", type: "단답형", required: false, page: 0, options: [] },
  ],
};

export function FormEditPage({ formKey }: { formKey?: string }) {
  const router = useRouter();
  const { forms, labels, saveForm } = useFormStore();
  const existing = formKey ? forms.find((f) => f.key === formKey) : undefined;

  const [draft, setDraft] = useState<Form>(() =>
    existing
      ? {
          ...existing,
          pages: existing.pages.map((p) => ({ ...p })),
          questions: existing.questions.map((q) => ({ ...q })),
        }
      : EMPTY_FORM,
  );
  const [page, setPage] = useState(0);
  const [openQ, setOpenQ] = useState<string | null>(null);
  const [advQ, setAdvQ] = useState<string | null>(null);

  if (formKey && !existing) {
    return (
      <>
        <PageHeader title="폼 편집" showBack />
        <PageBody>
          <EmptyState message="폼을 찾을 수 없습니다." />
        </PageBody>
      </>
    );
  }

  const pageQuestions = draft.questions.filter((q) => (q.page ?? 0) === page);

  const patchQ = (qid: string, patch: Partial<Question>) =>
    setDraft((d) => ({
      ...d,
      questions: d.questions.map((q) => (q.qid === qid ? { ...q, ...patch } : q)),
    }));

  const addPage = () =>
    setDraft((d) => ({
      ...d,
      pages: [...d.pages, { title: `페이지 ${d.pages.length + 1}`, desc: "" }],
    }));

  const removePage = (index: number) => {
    if (draft.pages.length <= 1) {
      flash("페이지는 최소 1개 필요합니다");
      return;
    }
    setDraft((d) => ({
      ...d,
      pages: d.pages.filter((_, i) => i !== index),
      questions: d.questions
        .filter((q) => (q.page ?? 0) !== index)
        .map((q) => ({
          ...q,
          page: (q.page ?? 0) > index ? (q.page ?? 0) - 1 : (q.page ?? 0),
        })),
    }));
    setPage((p) => Math.max(0, p - (index <= p ? 1 : 0)));
    flash("페이지를 삭제했습니다");
  };

  const movePage = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= draft.pages.length) return;
    setDraft((d) => {
      const pages = [...d.pages];
      [pages[index], pages[to]] = [pages[to], pages[index]];
      return {
        ...d,
        pages,
        questions: d.questions.map((q) => {
          const p = q.page ?? 0;
          if (p === index) return { ...q, page: to };
          if (p === to) return { ...q, page: index };
          return q;
        }),
      };
    });
    setPage(to);
  };

  const addQuestion = () =>
    setDraft((d) => ({
      ...d,
      questions: [
        ...d.questions,
        {
          qid: `문항_${d.questions.length + 1}`,
          label: "",
          type: "단답형",
          required: false,
          page,
          options: [],
        },
      ],
    }));

  const moveQuestion = (qid: string, dir: -1 | 1) => {
    setDraft((d) => {
      const inPage = d.questions.filter((q) => (q.page ?? 0) === page);
      const idx = inPage.findIndex((q) => q.qid === qid);
      const to = idx + dir;
      if (to < 0 || to >= inPage.length) return d;
      const a = d.questions.indexOf(inPage[idx]);
      const b = d.questions.indexOf(inPage[to]);
      const questions = [...d.questions];
      [questions[a], questions[b]] = [questions[b], questions[a]];
      return { ...d, questions };
    });
  };

  const removeQuestion = (qid: string) =>
    setDraft((d) => ({ ...d, questions: d.questions.filter((q) => q.qid !== qid) }));

  const changeType = (q: Question, type: string) => {
    patchQ(q.qid, {
      type,
      options:
        isChoiceType(type) && q.options.length === 0
          ? ["선택지 1", "선택지 2"]
          : q.options,
      ...(isChoiceType(type) ? {} : { branch: undefined, maxSelect: undefined }),
      ...(type === "단답형" || type === "장문형"
        ? {}
        : { pattern: undefined, patternName: undefined, patternMsg: undefined }),
    });
  };

  const removeOption = (q: Question, option: string) => {
    const branch = q.branch ? { ...q.branch } : undefined;
    if (branch) delete branch[option];
    patchQ(q.qid, { options: q.options.filter((o) => o !== option), branch });
  };

  const save = (status: "DRAFT" | "OPEN") => {
    if (!draft.title.trim()) {
      flash("폼 제목을 입력하세요");
      return;
    }
    const saved = saveForm({ ...draft, title: draft.title.trim() }, status);
    flash(status === "OPEN" ? "접수를 시작했습니다" : "임시저장했습니다");
    router.replace(ROUTES.formDetail(saved.key));
  };

  const qSummary = (q: Question) =>
    [
      q.type,
      q.required ? "필수" : null,
      isChoiceType(q.type) ? `선택지 ${q.options.length}개` : null,
      q.pattern ? "형식 검증" : null,
      q.branch && Object.keys(q.branch).length > 0
        ? `분기 ${Object.keys(q.branch).length}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <>
      <PageHeader
        title="폼 편집"
        subtitle={existing ? "수정" : "새 폼"}
        showBack
      />
      <PageBody>
        <div className="grid grid-cols-[1fr_1.15fr] items-start gap-4">
          <div className="flex flex-col gap-4">
            <Card>
              <SectionLabel className="mb-3">기본정보</SectionLabel>
              <div className="flex flex-col gap-[14px]">
                <Field label="폼 제목" required>
                  <TextField
                    value={draft.title}
                    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    placeholder="예: 2026-1 신규 부원 모집"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-[14px]">
                  <Field label="접수 시작">
                    <TextField
                      type="datetime-local"
                      value={toInput(draft.start, true)}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, start: fromInput(e.target.value) }))
                      }
                    />
                  </Field>
                  <Field label="접수 종료">
                    <TextField
                      type="datetime-local"
                      value={toInput(draft.end, true)}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, end: fromInput(e.target.value) }))
                      }
                    />
                  </Field>
                </div>
              </div>
            </Card>

            <Card>
              <SectionLabel className="mb-3">라벨</SectionLabel>
              <div className="flex flex-wrap gap-[7px]">
                {labels
                  .filter((l) => l.on)
                  .map((l) => (
                    <Chip
                      key={l.name}
                      active={draft.labels.includes(l.name)}
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          labels: d.labels.includes(l.name) ? [] : [l.name],
                        }))
                      }
                    >
                      {l.name}
                    </Chip>
                  ))}
              </div>
            </Card>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1 py-[13px]"
                onClick={() => save("DRAFT")}
              >
                임시저장
              </Button>
              <Button className="flex-1 py-[13px]" onClick={() => save("OPEN")}>
                바로 접수 시작
              </Button>
            </div>
          </div>

          <Card>
            <div className="mb-3 flex items-center">
              <SectionLabel>페이지</SectionLabel>
              <div className="flex-1" />
              <button
                type="button"
                onClick={addPage}
                className="cursor-pointer text-[14px] text-accent"
              >
                + 페이지 추가
              </button>
            </div>
            <div className="mb-3 flex flex-wrap gap-[6px]">
              {draft.pages.map((p, i) => (
                <Chip key={i} active={page === i} onClick={() => setPage(i)}>
                  {i + 1}. {p.title || "(제목 없음)"} (
                  {draft.questions.filter((q) => (q.page ?? 0) === i).length})
                </Chip>
              ))}
            </div>

            <div className="rounded-[12px] border border-line p-3">
              <div className="flex items-center gap-2 text-[13.5px] text-n500">
                페이지 {page + 1} / {draft.pages.length}
                <div className="flex-1" />
                <button type="button" onClick={() => movePage(page, -1)} className="cursor-pointer hover:text-accent">↑</button>
                <button type="button" onClick={() => movePage(page, 1)} className="cursor-pointer hover:text-accent">↓</button>
                <button
                  type="button"
                  onClick={() => removePage(page)}
                  className="cursor-pointer hover:text-danger"
                >
                  삭제
                </button>
              </div>
              <div className="mt-2 flex flex-col gap-2">
                <TextField
                  value={draft.pages[page]?.title ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      pages: d.pages.map((p, i) =>
                        i === page ? { ...p, title: e.target.value } : p,
                      ),
                    }))
                  }
                  placeholder="페이지 제목"
                />
                <TextField
                  value={draft.pages[page]?.desc ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      pages: d.pages.map((p, i) =>
                        i === page ? { ...p, desc: e.target.value } : p,
                      ),
                    }))
                  }
                  placeholder="페이지 설명 (선택)"
                />
              </div>
            </div>

            <div className="mt-4 mb-2 flex items-center">
              <div className="text-[14.5px] font-medium">
                이 페이지의 문항 {pageQuestions.length}개
              </div>
              <div className="flex-1" />
              <button
                type="button"
                onClick={addQuestion}
                className="cursor-pointer text-[14px] text-accent"
              >
                + 문항 추가
              </button>
            </div>

            {pageQuestions.length === 0 ? (
              <div className="py-4 text-center text-[14px] text-n500">
                문항이 없습니다. 위에서 문항을 추가하세요.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {pageQuestions.map((q, qi) => {
                  const open = openQ === q.qid;
                  const isText = q.type === "단답형" || q.type === "장문형";
                  return (
                    <div key={q.qid} className="rounded-[12px] border border-line">
                      <div
                        onClick={() => setOpenQ(open ? null : q.qid)}
                        className="flex cursor-pointer items-center gap-2 p-3"
                      >
                        <div className="text-[14.5px] font-semibold">
                          {qi + 1}. {q.label || "(제목 없음)"}
                        </div>
                        <div className="min-w-0 flex-1 truncate text-[12.5px] text-n500">
                          {qSummary(q)}
                        </div>
                        <div className="text-[11px] text-n500">{open ? "▲" : "▼"}</div>
                      </div>

                      {open && (
                        <div className="border-t border-line p-3">
                          <TextField
                            value={q.label}
                            onChange={(e) => patchQ(q.qid, { label: e.target.value })}
                            placeholder="질문 문구"
                          />
                          <div className="mt-2 flex flex-wrap gap-[6px]">
                            {QTYPES.map((t) => (
                              <Chip
                                key={t}
                                active={q.type === t}
                                onClick={() => changeType(q, t)}
                              >
                                {t}
                              </Chip>
                            ))}
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <Toggle
                              size="sm"
                              on={q.required}
                              onChange={(on) => patchQ(q.qid, { required: on })}
                            />
                            <span className="text-[14px]">필수 응답</span>
                            <div className="flex-1" />
                            <button type="button" onClick={() => moveQuestion(q.qid, -1)} className="cursor-pointer text-[14px] text-n400 hover:text-accent">↑</button>
                            <button type="button" onClick={() => moveQuestion(q.qid, 1)} className="cursor-pointer text-[14px] text-n400 hover:text-accent">↓</button>
                            <button
                              type="button"
                              onClick={() => removeQuestion(q.qid)}
                              className="cursor-pointer text-[14px] text-n400 hover:text-danger"
                            >
                              삭제
                            </button>
                          </div>

                          {isChoiceType(q.type) && (
                            <div className="mt-3">
                              <div className="mb-[6px] text-[13.5px] text-n400">선택지</div>
                              <div className="flex flex-col gap-[6px]">
                                {q.options.map((o, oi) => (
                                  <div key={oi} className="flex items-center gap-2">
                                    <TextField
                                      value={o}
                                      onChange={(e) =>
                                        patchQ(q.qid, {
                                          options: q.options.map((x, xi) =>
                                            xi === oi ? e.target.value : x,
                                          ),
                                        })
                                      }
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeOption(q, o)}
                                      className="cursor-pointer text-[13.5px] whitespace-nowrap text-n400 hover:text-danger"
                                    >
                                      삭제
                                    </button>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() =>
                                    patchQ(q.qid, {
                                      options: [
                                        ...q.options,
                                        `선택지 ${q.options.length + 1}`,
                                      ],
                                    })
                                  }
                                  className="cursor-pointer self-start text-[13.5px] text-accent"
                                >
                                  + 선택지 추가
                                </button>
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => setAdvQ(advQ === q.qid ? null : q.qid)}
                            className="mt-3 cursor-pointer text-[13.5px] text-accent"
                          >
                            {advQ === q.qid
                              ? "고급 설정 접기"
                              : "고급 설정 (형식 검증 · 페이지 이동)"}
                          </button>

                          {advQ === q.qid && (
                            <div className="mt-3 flex flex-col gap-4 rounded-[10px] bg-bg p-3">
                              <div>
                                <div className="mb-[6px] text-[13.5px] text-n400">문항 이동</div>
                                <div className="flex flex-wrap gap-[6px]">
                                  {draft.pages.map((p, i) => (
                                    <Chip
                                      key={i}
                                      active={(q.page ?? 0) === i}
                                      onClick={() => patchQ(q.qid, { page: i })}
                                    >
                                      {i + 1}. {p.title}
                                    </Chip>
                                  ))}
                                </div>
                              </div>

                              {q.type === "다중선택" && (
                                <div>
                                  <div className="mb-[6px] text-[13.5px] text-n400">
                                    최대 선택 개수
                                  </div>
                                  <TextField
                                    value={q.maxSelect ?? ""}
                                    onChange={(e) =>
                                      patchQ(q.qid, {
                                        maxSelect: Number(e.target.value) || undefined,
                                      })
                                    }
                                    placeholder="제한 없음"
                                    className="w-[120px]"
                                  />
                                </div>
                              )}

                              {isText && (
                                <div>
                                  <div className="mb-[6px] text-[13.5px] text-n400">
                                    입력 형식 검증
                                  </div>
                                  <div className="flex flex-wrap gap-[6px]">
                                    {PATTERN_PRESETS.map((p) => (
                                      <Chip
                                        key={p.name}
                                        active={
                                          p.name === "자유 입력"
                                            ? !q.pattern
                                            : q.patternName === p.name
                                        }
                                        onClick={() =>
                                          patchQ(
                                            q.qid,
                                            p.pattern
                                              ? {
                                                  pattern: p.pattern,
                                                  patternName: p.name,
                                                  patternMsg: `${p.name} 형식으로 입력해주세요`,
                                                }
                                              : {
                                                  pattern: undefined,
                                                  patternName: undefined,
                                                  patternMsg: undefined,
                                                },
                                          )
                                        }
                                      >
                                        {p.name}
                                      </Chip>
                                    ))}
                                  </div>
                                  <TextField
                                    value={q.pattern ?? ""}
                                    onChange={(e) =>
                                      patchQ(q.qid, { pattern: e.target.value })
                                    }
                                    placeholder="정규식 (예: ^[0-9]{9}$)"
                                    className="mt-2 font-mono text-[13.5px]"
                                  />
                                  <TextField
                                    value={q.patternMsg ?? ""}
                                    onChange={(e) =>
                                      patchQ(q.qid, { patternMsg: e.target.value })
                                    }
                                    placeholder="형식 오류 안내 문구"
                                    className="mt-2"
                                  />
                                </div>
                              )}

                              {q.type === "단일선택" && (
                                <div>
                                  <div className="mb-[6px] text-[13.5px] text-n400">
                                    선택지별 페이지 이동
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    {q.options.map((o) => (
                                      <div key={o}>
                                        <div className="mb-1 text-[13px]">{o}</div>
                                        <div className="flex flex-wrap gap-[6px]">
                                          <Chip
                                            active={q.branch?.[o] === undefined}
                                            onClick={() => {
                                              const branch = q.branch
                                                ? { ...q.branch }
                                                : {};
                                              delete branch[o];
                                              patchQ(q.qid, {
                                                branch:
                                                  Object.keys(branch).length > 0
                                                    ? branch
                                                    : undefined,
                                              });
                                            }}
                                          >
                                            다음 페이지
                                          </Chip>
                                          {draft.pages.map((p, i) => (
                                            <Chip
                                              key={i}
                                              active={q.branch?.[o] === i}
                                              onClick={() =>
                                                patchQ(q.qid, {
                                                  branch: { ...(q.branch ?? {}), [o]: i },
                                                })
                                              }
                                            >
                                              {i + 1}. {p.title}
                                            </Chip>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </PageBody>
    </>
  );
}
