"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Qitem } from "@/entities/form";
import {
  FormSaveStatusBar,
  isTextQitemType,
  nextQitemId,
  parseMaxSlctCnt,
  useFormEditor,
  useFormLabelOptions,
  type FormDraft,
  type FormEditor,
} from "@/features/form";
import { PATTERN_PRESETS } from "@/shared/config/constants";
import {
  isChoiceQitemType,
  QITEM_TYPE_CDS,
  QITEM_TYPE_NM,
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

/*
 * 폼 편집기.
 *
 * 편집 상태와 자동 저장은 features/form(useFormEditor)이 전담한다. 이 파일은 초안을 그리고
 * 조작을 초안 변경으로 옮기는 일만 한다 — 어떤 값이 언제 서버로 나가는지는 여기서 알 필요가
 * 없고, 알게 두면 JSX 사이에 저장 규칙이 흩어진다.
 *
 * 저장 버튼은 남겼지만 의미가 달라졌다. 이제는 "이걸 눌러야 저장된다"가 아니라 **"지금
 * 저장됐다는 것을 확인하고 싶다 · 실패했을 때 직접 다시 시도한다"** 를 위한 수단이다.
 *
 * '바로 접수 시작'은 여기서 뺐다. 접수 시작·마감은 별도 API(ssccops-server #33 · 웹 #9)이고
 * 폼 상세 화면이 담당한다 — 편집 화면이 상태까지 바꾸면 자동 저장이 formSttsCd를 실어 나르는
 * 순간 "편집했더니 접수가 시작됐다"가 가능해진다.
 */

export function FormEditPage({ formId }: { formId?: number }) {
  const editor = useFormEditor(formId);

  if (editor.status === "ready") return <FormEditContent editor={editor} />;

  return (
    <>
      <PageHeader title="폼 편집" showBack />
      <PageBody>
        {editor.status === "loading" && <EmptyState message="불러오는 중…" />}
        {editor.status === "not-found" && <EmptyState message="폼을 찾을 수 없습니다." />}
        {editor.status === "error" && (
          <EmptyState
            message={editor.loadErrorMessage || "폼을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: editor.reload }}
          />
        )}
      </PageBody>
    </>
  );
}

function FormEditContent({ editor }: { editor: FormEditor }) {
  const router = useRouter();
  const { draft, labelIds, setDraft, setLabelIds, issues } = editor;
  const labelOptions = useFormLabelOptions();

  /* 아래 셋은 저장 대상이 아니다 — 화면에서 어디를 보고 있는지일 뿐이라 초안에 넣지 않는다 */
  const [page, setPage] = useState(0);
  const [openQ, setOpenQ] = useState<string | null>(null);
  const [advQ, setAdvQ] = useState<string | null>(null);

  const { pages, qitems } = draft.qitemCpstCn;
  const pageQitems = qitems.filter((q) => (q.pageSeq ?? 0) === page);

  const setCpst = (fn: (cpst: FormDraft["qitemCpstCn"]) => FormDraft["qitemCpstCn"]) =>
    setDraft((d) => ({ ...d, qitemCpstCn: fn(d.qitemCpstCn) }));

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
    /*
     * 페이지를 지우면 그 페이지의 문항도 함께 사라진다. 응답이 달린 문항이 섞여 있으면
     * 서버가 409로 막을 요청이므로 여기서 먼저 알린다.
     */
    const removed = qitems
      .filter((q) => (q.pageSeq ?? 0) === index)
      .map((q) => q.qitemId)
      .filter((qitemId) => editor.inUseQitemIds.includes(qitemId));
    if (removed.length > 0) {
      flash(`이미 응답이 있는 문항이 포함돼 있습니다 (${removed.join(", ")})`);
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

  /* 새 문항 ID는 개수가 아니라 최대값+1이다 — 근거는 features/form/model/form-draft.ts */
  const addQitem = () =>
    setCpst((c) => ({
      ...c,
      qitems: [
        ...c.qitems,
        {
          qitemId: nextQitemId(c.qitems),
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

  const removeQitem = (qitemId: string) => {
    /*
     * qitemId는 응답 내용(rspns_cn)의 key다. 응답이 하나라도 있는 폼에서 문항을 지우면 그
     * 응답을 다시 읽을 수 없으므로 서버가 409로 막는다 — 지운 뒤 저장이 보류되는 것을 보고
     * 되돌리게 하지 말고, 누르는 순간 막는다.
     */
    if (editor.inUseQitemIds.includes(qitemId)) {
      flash("이미 응답이 있어 이 문항은 삭제할 수 없습니다");
      return;
    }
    setCpst((c) => ({ ...c, qitems: c.qitems.filter((q) => q.qitemId !== qitemId) }));
  };

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
      ...(isTextQitemType(cd)
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

  /** 지금 저장 — 보류 중이면 사유를 알린다. 조용히 아무 일도 일어나지 않으면 안 된다 */
  const saveNow = async (): Promise<number | null> => {
    if (issues.blockingMessage) {
      flash(issues.blockingMessage);
      return null;
    }
    const savedFormId = await editor.saveNow();
    flash(savedFormId ? "저장했습니다" : "저장하지 못했습니다. 저장 상태를 확인해주세요");
    return savedFormId;
  };

  /* 상세로 넘어가기 전에 저장을 끝낸다 — 화면 내 이동은 beforeunload가 잡아 주지 않는다 */
  const goDetail = async () => {
    const savedFormId = await saveNow();
    if (savedFormId) router.push(ROUTES.formDetail(savedFormId));
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
      <PageHeader
        title="폼 편집"
        // 첫 자동 저장으로 폼_ID가 생기는 순간 "새 폼"에서 폼 번호로 바뀐다
        subtitle={editor.formId ? `폼 #${editor.formId}` : "새 폼"}
        showBack
      />
      <PageBody>
        <FormSaveStatusBar save={editor.save} onRetry={editor.retry} />

        <div className="mt-4 grid grid-cols-[1fr_1.15fr] items-start gap-4">
          <div className="flex flex-col gap-4">
            <Card>
              <SectionLabel className="mb-3">기본정보</SectionLabel>
              <div className="flex flex-col gap-[14px]">
                <Field label="폼_제목_명" required error={issues.formTtlNm || null}>
                  <TextField
                    value={draft.formTtlNm}
                    invalid={Boolean(issues.formTtlNm)}
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
                      invalid={Boolean(issues.rcptDt)}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          rcptBgngDt: fromInput(e.target.value, true) || null,
                        }))
                      }
                    />
                  </Field>
                  <Field label="접수_종료_일시" error={issues.rcptDt || null}>
                    <TextField
                      type="datetime-local"
                      value={toInput(draft.rcptEndDt, true)}
                      invalid={Boolean(issues.rcptDt)}
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
              {/*
                라벨 지정은 폼 저장 본문(labelIds)에 함께 실린다 — 별도 라벨 API를 같이 부르면
                자동 저장 화면에서 두 요청의 도착 순서에 따라 지정이 되살아난다 (#10 합의)
              */}
              {labelOptions.loading ? (
                <div className="text-[13.5px] text-n500">라벨을 불러오는 중…</div>
              ) : labelOptions.errorMessage ? (
                <div className="text-[13.5px] text-danger">{labelOptions.errorMessage}</div>
              ) : labelOptions.labels.length === 0 ? (
                <div className="text-[13.5px] text-n500">사용할 수 있는 라벨이 없습니다.</div>
              ) : (
                <div className="flex flex-wrap gap-[7px]">
                  {labelOptions.labels.map((l) => (
                    <Chip
                      key={l.formLblId}
                      active={labelIds.includes(l.formLblId)}
                      onClick={() =>
                        setLabelIds((ids) =>
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
              )}
            </Card>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1 py-[13px]"
                onClick={() => void saveNow()}
              >
                지금 저장
              </Button>
              <Button className="flex-1 py-[13px]" onClick={() => void goDetail()}>
                저장하고 상세로
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
                  /*
                   * 서버(#32)와 같은 규칙으로 미리 잡은 오류. 400을 받고 나서 알려 주면
                   * 어느 문항이 문제인지 서버 응답만으로는 알 수 없다.
                   */
                  const qIssues = issues.qitems[q.qitemId] ?? [];
                  return (
                    <div
                      key={q.qitemId}
                      className={cardBorder(qIssues.length > 0)}
                    >
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
                        {qIssues.length > 0 && (
                          <div className="flex-none text-[12px] text-danger">
                            확인 필요 {qIssues.length}
                          </div>
                        )}
                        <div className="text-[11px] text-n500">{open ? "▲" : "▼"}</div>
                      </div>

                      {qIssues.length > 0 && (
                        <div className="border-t border-danger/25 bg-danger/8 px-3 py-2">
                          {qIssues.map((message) => (
                            <div key={message} className="text-[12.5px] text-danger">
                              {message}
                            </div>
                          ))}
                        </div>
                      )}

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
                                  {/*
                                    빈 값만 '제한 없음'이다. 숫자가 아니면 초안을 바꾸지 않고
                                    알린다 — 예전의 `Number(v) || undefined`는 "0"도 "abc"도
                                    조용히 제한 없음으로 바꿔 입력이 사라진 줄도 몰랐다.
                                    범위(선택지 수 초과)는 검증이 문항 카드에서 잡는다.
                                  */}
                                  <TextField
                                    value={q.maxSlctCnt ?? ""}
                                    inputMode="numeric"
                                    onChange={(e) => {
                                      const parsed = parseMaxSlctCnt(e.target.value);
                                      if (parsed.kind === "invalid") {
                                        flash("최대 선택 개수는 정수로 입력하세요");
                                        return;
                                      }
                                      patchQ(q.qitemId, {
                                        maxSlctCnt:
                                          parsed.kind === "empty" ? undefined : parsed.value,
                                      });
                                    }}
                                    placeholder="제한 없음"
                                    className="w-[120px]"
                                  />
                                </div>
                              )}

                              {isTextQitemType(q.qitemTypeCd) && (
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
                                    invalid={!isCompilableRegExp(q.ptrnCn)}
                                    onChange={(e) =>
                                      patchQ(q.qitemId, { ptrnCn: e.target.value })
                                    }
                                    placeholder="정규식 (예: ^[0-9]{9}$)"
                                    className="mt-2 font-mono text-[13.5px]"
                                  />
                                  {/* 깨진 정규식은 공개 폼의 응답 검증을 통째로 무너뜨린다 */}
                                  {!isCompilableRegExp(q.ptrnCn) && (
                                    <div className="mt-[5px] text-[12.5px] text-danger">
                                      정규식으로 해석되지 않습니다
                                    </div>
                                  )}
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

/** 오류가 있는 문항 카드는 접혀 있어도 눈에 띄어야 한다 */
function cardBorder(hasIssue: boolean): string {
  return hasIssue
    ? "rounded-[12px] border border-danger/45"
    : "rounded-[12px] border border-line";
}

/** 정규식 입력란은 그 자리에서 컴파일해 본다 (빈 값은 검증 없음이므로 정상) */
function isCompilableRegExp(pattern: string | undefined): boolean {
  if (!pattern) return true;
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}
