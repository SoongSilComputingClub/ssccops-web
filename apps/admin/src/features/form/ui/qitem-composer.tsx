"use client";

import { useState } from "react";
import {
  SYSTEM_FORM_BADGE,
  SYSTEM_FORM_QITEM_LOCKED,
  type Qitem,
  type QitemCpstCn,
} from "@/entities/form";
import { PATTERN_PRESETS } from "@/shared/config/constants";
import {
  isChoiceQitemType,
  isTextQitemType,
  QITEM_TYPE_CDS,
  QITEM_TYPE_NM,
  type QitemTypeCd,
} from "@/shared/config/codes";
import { Badge, Card, Chip, SectionLabel, TextField, Toggle, flash } from "@/shared/ui";
import { nextQitemId, parseMaxSlctCnt } from "../model/form-draft";

/*
 * 문항 구성 편집기 — 페이지와 문항을 고치는 화면 조각.
 *
 * ── 왜 화면이 아니라 features 에 있는가 (#134) ──────────────────
 * 폼 편집(views/form-edit)과 템플릿 편집(views/form-template-edit)이 **같은 편집기를 쓴다.**
 * 서버가 폼과 템플릿의 문항 구성을 같은 검증기(QuestionCompositionValidator)로 보기 때문에,
 * 편집기를 두 벌 만들면 규칙이 갈려 템플릿에서는 만들 수 있었던 구성이 그 템플릿으로 만든
 * 폼의 저장에서 거절된다. 화면에 두면 다른 화면이 가져다 쓸 수 없으므로 기능 레이어에 둔다.
 *
 * ── 무엇을 들고 있고 무엇을 들지 않는가 ────────────────────────
 * 지금 보고 있는 페이지·펼친 문항 카드·펼친 고급 설정은 **저장 대상이 아니다.** 화면에서
 * 어디를 보고 있는지일 뿐이라 여기 안에 둔다. 저장되는 값(pages·qitems)은 전부 호출부가 쥔다 —
 * 폼은 자동 저장이고 템플릿은 저장 버튼이라 "언제 서버로 나가는가"가 서로 다르기 때문이다.
 */

export function QitemComposer({
  cpst,
  onChange,
  issues,
  inUseQitemIds,
  systemRequiredQitemIds,
}: {
  cpst: QitemCpstCn;
  /** 문항 구성만 바꾼다 — 무엇이 언제 저장되는지는 호출부가 정한다 */
  onChange: (updater: (cpst: QitemCpstCn) => QitemCpstCn) => void;
  /** qitemId → 그 문항에 붙일 오류 문구들 (features/form 의 validateQitemCpst 결과) */
  issues: Record<string, string[]>;
  /**
   * 이미 응답이 달려 삭제하면 서버가 409로 막는 문항 ID들.
   * 템플릿에는 응답이 있을 수 없으므로 그쪽은 넘기지 않는다.
   */
  inUseQitemIds?: string[];
  /**
   * 시스템이 요구해 지울 수 없는 문항 ID들 (ssccops-server #155 · 폼 상세가 준 값 그대로).
   *
   * `inUseQitemIds`와 기준이 다르다 — 그쪽은 "이미 받은 답이 끊긴다"라 응답이 없으면 지울 수
   * 있지만, 이쪽은 응답이 한 건도 없어도 지울 수 없다. 템플릿에는 시스템 계약이 걸리지 않으므로
   * 그쪽 호출부는 넘기지 않는다.
   */
  systemRequiredQitemIds?: string[];
}) {
  /* 셋 다 저장 대상이 아니다 — 화면에서 어디를 보고 있는지일 뿐이다 */
  const [page, setPage] = useState(0);
  const [openQ, setOpenQ] = useState<string | null>(null);
  const [advQ, setAdvQ] = useState<string | null>(null);

  const inUse = inUseQitemIds ?? [];
  const systemRequired = systemRequiredQitemIds ?? [];
  const { pages, qitems } = cpst;
  const pageQitems = qitems.filter((q) => (q.pageSeq ?? 0) === page);

  const patchQ = (qitemId: string, patch: Partial<Qitem>) =>
    onChange((c) => ({
      ...c,
      qitems: c.qitems.map((q) => (q.qitemId === qitemId ? { ...q, ...patch } : q)),
    }));

  const addPage = () =>
    onChange((c) => ({
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
    const pageQitemIds = qitems
      .filter((q) => (q.pageSeq ?? 0) === index)
      .map((q) => q.qitemId);

    const removed = pageQitemIds.filter((qitemId) => inUse.includes(qitemId));
    if (removed.length > 0) {
      flash(`이미 응답이 있는 문항이 포함돼 있습니다 (${removed.join(", ")})`);
      return;
    }

    /* 시스템이 요구하는 문항은 페이지째 지우는 경로로도 사라지면 안 된다 (#140) */
    const locked = pageQitemIds.filter((qitemId) => systemRequired.includes(qitemId));
    if (locked.length > 0) {
      flash(`시스템이 사용하는 문항이 포함돼 있습니다 (${locked.join(", ")})`);
      return;
    }

    onChange((c) => ({
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
    onChange((c) => {
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
    onChange((c) => ({
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
    onChange((c) => {
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
    if (inUse.includes(qitemId)) {
      flash("이미 응답이 있어 이 문항은 삭제할 수 없습니다");
      return;
    }
    /*
     * 시스템이 요구하는 문항 (#140). 버튼이 이미 잠겨 있어 여기까지 오는 일은 드물지만,
     * 잠금 판단이 화면 여러 곳에 흩어지지 않도록 지우는 자리에서도 한 번 더 본다.
     */
    if (systemRequired.includes(qitemId)) {
      flash(SYSTEM_FORM_QITEM_LOCKED);
      return;
    }
    onChange((c) => ({ ...c, qitems: c.qitems.filter((q) => q.qitemId !== qitemId) }));
  };

  const changeType = (q: Qitem, cd: QitemTypeCd) => {
    patchQ(q.qitemId, {
      qitemTypeCd: cd,
      optionList:
        isChoiceQitemType(cd) && q.optionList.length === 0
          ? ["선택지 1", "선택지 2"]
          : q.optionList,
      ...(isChoiceQitemType(cd) ? {} : { branchMap: undefined, maxSlctCnt: undefined }),
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
              onChange((c) => ({
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
              onChange((c) => ({
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
            const qIssues = issues[q.qitemId] ?? [];
            /* 서버가 상세 응답으로 선언한 잠금 — 첫 로드부터 걸린다 (#155) */
            const systemLocked = systemRequired.includes(q.qitemId);
            return (
              <div key={q.qitemId} className={cardBorder(qIssues.length > 0)}>
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
                  {/* 접힌 카드에서도 잠긴 문항인지 보여야 한다 — 폼이 아니라 문항이라 '시스템'까지만 */}
                  {systemLocked && (
                    <Badge tone={SYSTEM_FORM_BADGE.tone} className="flex-none">
                      시스템
                    </Badge>
                  )}
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
                      onChange={(e) => patchQ(q.qitemId, { qitemLblNm: e.target.value })}
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
                      {/*
                        시스템이 요구하는 문항의 삭제는 감추지 않고 잠근다 — 버튼이 사라지면
                        이 문항만 못 지우는 것인지 편집기에 삭제가 없는 것인지 알 수 없다.
                        문구 수정·유형 변경·순서 변경은 그대로 열려 있다.
                      */}
                      <button
                        type="button"
                        disabled={systemLocked}
                        title={systemLocked ? SYSTEM_FORM_QITEM_LOCKED : undefined}
                        onClick={() => removeQitem(q.qitemId)}
                        className="cursor-pointer text-[14px] text-n400 hover:text-danger disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-n400"
                      >
                        삭제
                      </button>
                    </div>

                    {isChoiceQitemType(q.qitemTypeCd) && (
                      <div className="mt-3">
                        <div className="mb-[6px] text-[13.5px] text-n400">선택지</div>
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
                          <div className="mb-[6px] text-[13.5px] text-n400">문항 이동</div>
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
                                    p.name === "자유 입력" ? !q.ptrnCn : q.ptrnNm === p.name
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
                            {/*
                              iOS Safari는 글자 크기가 16px 미만인 입력란에 포커스가 가면
                              페이지를 통째로 확대하고 되돌리지 않는다 (#87이 공개 폼에서
                              먼저 겪었다). 이 편집기에서 호출부가 입력란 글자 크기를
                              직접 낮춘 자리는 여기 하나뿐이라 모바일만 16px로 올리고
                              lg:에서 원래의 13.5px 고정폭을 되살린다.
                            */}
                            <TextField
                              value={q.ptrnCn ?? ""}
                              invalid={!isCompilableRegExp(q.ptrnCn)}
                              onChange={(e) => patchQ(q.qitemId, { ptrnCn: e.target.value })}
                              placeholder="정규식 (예: ^[0-9]{9}$)"
                              className="mt-2 font-mono text-[16px] lg:text-[13.5px]"
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
                                            branchMap: { ...(q.branchMap ?? {}), [o]: i },
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
