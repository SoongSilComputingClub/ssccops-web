"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStore, type Form, type Qitem } from "@/entities/form";
import { useSessionStore } from "@/entities/session";
import { PATTERN_PRESETS, TODAY } from "@/shared/config/constants";
import {
  isChoiceQitemType,
  QITEM_TYPE_CDS,
  QITEM_TYPE_NM,
  type FormSttsCd,
  type QitemTypeCd,
} from "@/shared/config/codes";
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

const NOW = `${TODAY}T10:00:00`;

function emptyForm(creatrMbrId: number): Form {
  return {
    formId: 0,
    creatrMbrId,
    formTtlNm: "",
    formSttsCd: "DRAFT",
    rcptBgngDt: null,
    rcptEndDt: null,
    qitemCpstCn: {
      pages: [{ pageTtl: "페이지 1", pageDescCn: "" }],
      qitems: [
        {
          qitemId: "q1",
          qitemLblNm: "",
          qitemTypeCd: "SHORT_TEXT",
          reqYn: false,
          pageSeq: 0,
          optionList: [],
        },
      ],
    },
    crtDt: NOW,
    mdfcnDt: NOW,
  };
}

const isTextType = (cd: QitemTypeCd) => cd === "SHORT_TEXT" || cd === "LONG_TEXT";

export function FormEditPage({ formId }: { formId?: number }) {
  const router = useRouter();
  const { forms, formLbls, formLblRels, saveForm, setFormLbls } = useFormStore();
  const sessionMbrId = useSessionStore((s) => s.mbrId);
  const existing = formId ? forms.find((f) => f.formId === formId) : undefined;

  const [draft, setDraft] = useState<Form>(() =>
    existing
      ? {
          ...existing,
          qitemCpstCn: {
            pages: existing.qitemCpstCn.pages.map((p) => ({ ...p })),
            qitems: existing.qitemCpstCn.qitems.map((q) => ({ ...q })),
          },
        }
      : emptyForm(sessionMbrId || 1),
  );
  const [pickedLblIds, setPickedLblIds] = useState<number[]>(() =>
    formId
      ? formLblRels.filter((r) => r.formId === formId).map((r) => r.formLblId)
      : [],
  );
  const [page, setPage] = useState(0);
  const [openQ, setOpenQ] = useState<string | null>(null);
  const [advQ, setAdvQ] = useState<string | null>(null);

  if (formId && !existing) {
    return (
      <>
        <PageHeader title="폼 편집" showBack />
        <PageBody>
          <EmptyState message="폼을 찾을 수 없습니다." />
        </PageBody>
      </>
    );
  }

  const { pages, qitems } = draft.qitemCpstCn;
  const pageQitems = qitems.filter((q) => (q.pageSeq ?? 0) === page);

  const setCpst = (
    fn: (cpst: Form["qitemCpstCn"]) => Form["qitemCpstCn"],
  ) => setDraft((d) => ({ ...d, qitemCpstCn: fn(d.qitemCpstCn) }));

  const patchQ = (qitemId: string, patch: Partial<Qitem>) =>
    setCpst((c) => ({
      ...c,
      qitems: c.qitems.map((q) => (q.qitemId === qitemId ? { ...q, ...patch } : q)),
    }));

  const addPage = () =>
    setCpst((c) => ({
      ...c,
      pages: [...c.pages, { pageTtl: `페이지 ${c.pages.length + 1}`, pageDescCn: "" }],
    }));

  const removePage = (index: number) => {
    if (pages.length <= 1) {
      flash("페이지는 최소 1개 필요합니다");
      return;
    }
    setCpst((c) => ({
      pages: c.pages.filter((_, i) => i !== index),
      qitems: c.qitems
        .filter((q) => (q.pageSeq ?? 0) !== index)
        .map((q) => ({
          ...q,
          pageSeq: (q.pageSeq ?? 0) > index ? (q.pageSeq ?? 0) - 1 : (q.pageSeq ?? 0),
        })),
    }));
    setPage((p) => Math.max(0, p - (index <= p ? 1 : 0)));
    flash("페이지를 삭제했습니다");
  };

  const movePage = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= pages.length) return;
    setCpst((c) => {
      const next = [...c.pages];
      [next[index], next[to]] = [next[to], next[index]];
      return {
        pages: next,
        qitems: c.qitems.map((q) => {
          const p = q.pageSeq ?? 0;
          if (p === index) return { ...q, pageSeq: to };
          if (p === to) return { ...q, pageSeq: index };
          return q;
        }),
      };
    });
    setPage(to);
  };

  const addQitem = () =>
    setCpst((c) => ({
      ...c,
      qitems: [
        ...c.qitems,
        {
          qitemId: `q${c.qitems.length + 1}`,
          qitemLblNm: "",
          qitemTypeCd: "SHORT_TEXT",
          reqYn: false,
          pageSeq: page,
          optionList: [],
        },
      ],
    }));

  const moveQitem = (qitemId: string, dir: -1 | 1) =>
    setCpst((c) => {
      const inPage = c.qitems.filter((q) => (q.pageSeq ?? 0) === page);
      const idx = inPage.findIndex((q) => q.qitemId === qitemId);
      const to = idx + dir;
      if (to < 0 || to >= inPage.length) return c;
      const a = c.qitems.indexOf(inPage[idx]);
      const b = c.qitems.indexOf(inPage[to]);
      const next = [...c.qitems];
      [next[a], next[b]] = [next[b], next[a]];
      return { ...c, qitems: next };
    });

  const removeQitem = (qitemId: string) =>
    setCpst((c) => ({ ...c, qitems: c.qitems.filter((q) => q.qitemId !== qitemId) }));

  const changeType = (q: Qitem, cd: QitemTypeCd) => {
    patchQ(q.qitemId, {
      qitemTypeCd: cd,
      optionList:
        isChoiceQitemType(cd) && q.optionList.length === 0
          ? ["선택지 1", "선택지 2"]
          : q.optionList,
      ...(isChoiceQitemType(cd)
        ? {}
        : { branchMap: undefined, maxSlctCnt: undefined }),
      ...(isTextType(cd)
        ? {}
        : { ptrnCn: undefined, ptrnNm: undefined, ptrnMsgCn: undefined }),
    });
  };

  const removeOption = (q: Qitem, option: string) => {
    const branchMap = q.branchMap ? { ...q.branchMap } : undefined;
    if (branchMap) delete branchMap[option];
    patchQ(q.qitemId, {
      optionList: q.optionList.filter((o) => o !== option),
      branchMap,
    });
  };

  const save = (formSttsCd: FormSttsCd) => {
    if (!draft.formTtlNm.trim()) {
      flash("폼_제목_명을 입력하세요");
      return;
    }
    const saved = saveForm(
      { ...draft, formTtlNm: draft.formTtlNm.trim() },
      formSttsCd,
    );
    setFormLbls(saved.formId, pickedLblIds);
    flash(formSttsCd === "OPEN" ? "접수를 시작했습니다" : "임시저장했습니다");
    router.replace(ROUTES.formDetail(saved.formId));
  };

  const qSummary = (q: Qitem) =>
    [
      QITEM_TYPE_NM[q.qitemTypeCd],
      q.reqYn ? "필수" : null,
      isChoiceQitemType(q.qitemTypeCd) ? `선택지 ${q.optionList.length}개` : null,
      q.ptrnCn ? "형식 검증" : null,
      q.branchMap && Object.keys(q.branchMap).length > 0
        ? `분기 ${Object.keys(q.branchMap).length}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <>
      <PageHeader title="폼 편집" subtitle={existing ? "수정" : "새 폼"} showBack />
      <PageBody>
        <div className="grid grid-cols-[1fr_1.15fr] items-start gap-4">
          <div className="flex flex-col gap-4">
            <Card>
              <SectionLabel className="mb-3">기본정보</SectionLabel>
              <div className="flex flex-col gap-[14px]">
                <Field label="폼_제목_명" required>
                  <TextField
                    value={draft.formTtlNm}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, formTtlNm: e.target.value }))
                    }
                    placeholder="예: 2026-1 신규 부원 모집"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-[14px]">
                  <Field label="접수_시작_일시">
                    <TextField
                      type="datetime-local"
                      value={toInput(draft.rcptBgngDt, true)}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          rcptBgngDt: fromInput(e.target.value, true) || null,
                        }))
                      }
                    />
                  </Field>
                  <Field label="접수_종료_일시">
                    <TextField
                      type="datetime-local"
                      value={toInput(draft.rcptEndDt, true)}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          rcptEndDt: fromInput(e.target.value, true) || null,
                        }))
                      }
                    />
                  </Field>
                </div>
              </div>
            </Card>

            <Card>
              <SectionLabel className="mb-3">폼_라벨</SectionLabel>
              <div className="flex flex-wrap gap-[7px]">
                {formLbls
                  .filter((l) => l.useYn)
                  .map((l) => (
                    <Chip
                      key={l.formLblId}
                      active={pickedLblIds.includes(l.formLblId)}
                      onClick={() =>
                        setPickedLblIds((ids) =>
                          ids.includes(l.formLblId)
                            ? ids.filter((x) => x !== l.formLblId)
                            : [...ids, l.formLblId],
                        )
                      }
                    >
                      {l.lblNm}
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
              {pages.map((p, i) => (
                <Chip key={i} active={page === i} onClick={() => setPage(i)}>
                  {i + 1}. {p.pageTtl || "(제목 없음)"} (
                  {qitems.filter((q) => (q.pageSeq ?? 0) === i).length})
                </Chip>
              ))}
            </div>

            <div className="rounded-[12px] border border-line p-3">
              <div className="flex items-center gap-2 text-[13.5px] text-n500">
                페이지 {page + 1} / {pages.length}
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => movePage(page, -1)}
                  className="cursor-pointer hover:text-accent"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => movePage(page, 1)}
                  className="cursor-pointer hover:text-accent"
                >
                  ↓
                </button>
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
                  value={pages[page]?.pageTtl ?? ""}
                  onChange={(e) =>
                    setCpst((c) => ({
                      ...c,
                      pages: c.pages.map((p, i) =>
                        i === page ? { ...p, pageTtl: e.target.value } : p,
                      ),
                    }))
                  }
                  placeholder="페이지 제목"
                />
                <TextField
                  value={pages[page]?.pageDescCn ?? ""}
                  onChange={(e) =>
                    setCpst((c) => ({
                      ...c,
                      pages: c.pages.map((p, i) =>
                        i === page ? { ...p, pageDescCn: e.target.value } : p,
                      ),
                    }))
                  }
                  placeholder="페이지 설명 (선택)"
                />
              </div>
            </div>

            <div className="mt-4 mb-2 flex items-center">
              <div className="text-[14.5px] font-medium">
                이 페이지의 문항 {pageQitems.length}개
              </div>
              <div className="flex-1" />
              <button
                type="button"
                onClick={addQitem}
                className="cursor-pointer text-[14px] text-accent"
              >
                + 문항 추가
              </button>
            </div>

            {pageQitems.length === 0 ? (
              <div className="py-4 text-center text-[14px] text-n500">
                문항이 없습니다. 위에서 문항을 추가하세요.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {pageQitems.map((q, qi) => {
                  const open = openQ === q.qitemId;
                  return (
                    <div key={q.qitemId} className="rounded-[12px] border border-line">
                      <div
                        onClick={() => setOpenQ(open ? null : q.qitemId)}
                        className="flex cursor-pointer items-center gap-2 p-3"
                      >
                        <div className="text-[14.5px] font-semibold">
                          {qi + 1}. {q.qitemLblNm || "(제목 없음)"}
                        </div>
                        <div className="min-w-0 flex-1 truncate text-[12.5px] text-n500">
                          {qSummary(q)}
                        </div>
                        <div className="text-[11px] text-n500">{open ? "▲" : "▼"}</div>
                      </div>

                      {open && (
                        <div className="border-t border-line p-3">
                          <TextField
                            value={q.qitemLblNm}
                            onChange={(e) =>
                              patchQ(q.qitemId, { qitemLblNm: e.target.value })
                            }
                            placeholder="질문 문구"
                          />
                          <div className="mt-2 flex flex-wrap gap-[6px]">
                            {QITEM_TYPE_CDS.map((cd) => (
                              <Chip
                                key={cd}
                                active={q.qitemTypeCd === cd}
                                onClick={() => changeType(q, cd)}
                              >
                                {QITEM_TYPE_NM[cd]}
                              </Chip>
                            ))}
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <Toggle
                              size="sm"
                              on={q.reqYn}
                              onChange={(on) => patchQ(q.qitemId, { reqYn: on })}
                            />
                            <span className="text-[14px]">필수 응답</span>
                            <div className="flex-1" />
                            <button
                              type="button"
                              onClick={() => moveQitem(q.qitemId, -1)}
                              className="cursor-pointer text-[14px] text-n400 hover:text-accent"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveQitem(q.qitemId, 1)}
                              className="cursor-pointer text-[14px] text-n400 hover:text-accent"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => removeQitem(q.qitemId)}
                              className="cursor-pointer text-[14px] text-n400 hover:text-danger"
                            >
                              삭제
                            </button>
                          </div>

                          {isChoiceQitemType(q.qitemTypeCd) && (
                            <div className="mt-3">
                              <div className="mb-[6px] text-[13.5px] text-n400">
                                선택지
                              </div>
                              <div className="flex flex-col gap-[6px]">
                                {q.optionList.map((o, oi) => (
                                  <div key={oi} className="flex items-center gap-2">
                                    <TextField
                                      value={o}
                                      onChange={(e) =>
                                        patchQ(q.qitemId, {
                                          optionList: q.optionList.map((x, xi) =>
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
                                    patchQ(q.qitemId, {
                                      optionList: [
                                        ...q.optionList,
                                        `선택지 ${q.optionList.length + 1}`,
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
                            onClick={() => setAdvQ(advQ === q.qitemId ? null : q.qitemId)}
                            className="mt-3 cursor-pointer text-[13.5px] text-accent"
                          >
                            {advQ === q.qitemId
                              ? "고급 설정 접기"
                              : "고급 설정 (형식 검증 · 페이지 이동)"}
                          </button>

                          {advQ === q.qitemId && (
                            <div className="mt-3 flex flex-col gap-4 rounded-[10px] bg-bg p-3">
                              <div>
                                <div className="mb-[6px] text-[13.5px] text-n400">
                                  문항 이동
                                </div>
                                <div className="flex flex-wrap gap-[6px]">
                                  {pages.map((p, i) => (
                                    <Chip
                                      key={i}
                                      active={(q.pageSeq ?? 0) === i}
                                      onClick={() => patchQ(q.qitemId, { pageSeq: i })}
                                    >
                                      {i + 1}. {p.pageTtl}
                                    </Chip>
                                  ))}
                                </div>
                              </div>

                              {q.qitemTypeCd === "MULTI_CHOICE" && (
                                <div>
                                  <div className="mb-[6px] text-[13.5px] text-n400">
                                    최대 선택 개수
                                  </div>
                                  <TextField
                                    value={q.maxSlctCnt ?? ""}
                                    onChange={(e) =>
                                      patchQ(q.qitemId, {
                                        maxSlctCnt: Number(e.target.value) || undefined,
                                      })
                                    }
                                    placeholder="제한 없음"
                                    className="w-[120px]"
                                  />
                                </div>
                              )}

                              {isTextType(q.qitemTypeCd) && (
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
                                            ? !q.ptrnCn
                                            : q.ptrnNm === p.name
                                        }
                                        onClick={() =>
                                          patchQ(
                                            q.qitemId,
                                            p.pattern
                                              ? {
                                                  ptrnCn: p.pattern,
                                                  ptrnNm: p.name,
                                                  ptrnMsgCn: `${p.name} 형식으로 입력해주세요`,
                                                }
                                              : {
                                                  ptrnCn: undefined,
                                                  ptrnNm: undefined,
                                                  ptrnMsgCn: undefined,
                                                },
                                          )
                                        }
                                      >
                                        {p.name}
                                      </Chip>
                                    ))}
                                  </div>
                                  <TextField
                                    value={q.ptrnCn ?? ""}
                                    onChange={(e) =>
                                      patchQ(q.qitemId, { ptrnCn: e.target.value })
                                    }
                                    placeholder="정규식 (예: ^[0-9]{9}$)"
                                    className="mt-2 font-mono text-[13.5px]"
                                  />
                                  <TextField
                                    value={q.ptrnMsgCn ?? ""}
                                    onChange={(e) =>
                                      patchQ(q.qitemId, { ptrnMsgCn: e.target.value })
                                    }
                                    placeholder="형식 오류 안내 문구"
                                    className="mt-2"
                                  />
                                </div>
                              )}

                              {q.qitemTypeCd === "SINGLE_CHOICE" && (
                                <div>
                                  <div className="mb-[6px] text-[13.5px] text-n400">
                                    선택지별 페이지 이동
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    {q.optionList.map((o) => (
                                      <div key={o}>
                                        <div className="mb-1 text-[13px]">{o}</div>
                                        <div className="flex flex-wrap gap-[6px]">
                                          <Chip
                                            active={q.branchMap?.[o] === undefined}
                                            onClick={() => {
                                              const branchMap = q.branchMap
                                                ? { ...q.branchMap }
                                                : {};
                                              delete branchMap[o];
                                              patchQ(q.qitemId, {
                                                branchMap:
                                                  Object.keys(branchMap).length > 0
                                                    ? branchMap
                                                    : undefined,
                                              });
                                            }}
                                          >
                                            다음 페이지
                                          </Chip>
                                          {pages.map((p, i) => (
                                            <Chip
                                              key={i}
                                              active={q.branchMap?.[o] === i}
                                              onClick={() =>
                                                patchQ(q.qitemId, {
                                                  branchMap: {
                                                    ...(q.branchMap ?? {}),
                                                    [o]: i,
                                                  },
                                                })
                                              }
                                            >
                                              {i + 1}. {p.pageTtl}
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
