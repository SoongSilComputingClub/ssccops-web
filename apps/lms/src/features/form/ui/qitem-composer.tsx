"use client";

import { useState } from "react";
import {
  FormDescription,
  isChoiceQitemType,
  isTextQitemType,
  QITEM_TYPE_CDS,
  QITEM_TYPE_NM,
  type Qitem,
  type QitemCpstCn,
  type QitemTypeCd,
} from "@ssccops/form-renderer";
import { SectionLabel } from "@ssccops/ui";
import { Badge, Card, Chip, Field, TextArea, TextField, Toggle } from "@/shared/ui";
import {
  isCompilableRegExp,
  nextQitemId,
  parseMaxSlctCnt,
  PATTERN_PRESETS,
} from "../model/qitem-draft";

/*
 * 문항 구성 편집기 (#528) — 어드민 `features/form/ui/qitem-composer.tsx`에서 옮겨 왔다.
 *
 * ── 왜 복사인가 ────────────────────────────────────────────
 * 앱끼리 소스를 공유하지 않는다(AGENTS.md). `packages/`로 올리지 않은 것은 어드민 편집기가
 * 라벨·복제·삭제·접수 상태·자동 저장까지 한 덩어리인데 그중 대부분이 리더에게 필요 없기
 * 때문이다 — 지금 올리면 이 앱이 쓰지 않는 것까지 공유 계약이 된다. 둘이 실제로 같아지면
 * 그때 올린다(«둘 이상» 규칙 · `packages/ui/AGENTS.md`).
 *
 * ── 옮기면서 갈린 것 ───────────────────────────────────────
 *  - **`flash` 토스트 대신 `onWarn` 콜백.** 어드민의 토스트는 zustand 스토어와 루트
 *    레이아웃의 뷰포트가 짝인데, 이 앱에는 둘 다 없다. 경고 한 줄 때문에 의존을 들이지 않고
 *    호출부가 자기 자리에 그리게 한다 — 화면이 하나뿐이라 둘 자리가 분명하다.
 *  - **시스템 폼 배지·잠금 문구는 이 앱의 상수를 쓴다.** 모집 폼은 시스템 폼이 아니라 보통
 *    빈 배열이지만, 서버가 계약을 선언하면 그대로 잠근다(전제하지 않는다).
 *  - 문항 유형·판정(`isChoiceQitemType` 등)은 `@ssccops/form-renderer`에서 온다 — 어드민이
 *    `shared/config/codes`를 거쳐 같은 것을 재export 하는 것과 값이 같다(#152).
 *
 * ── 무엇을 들고 있고 무엇을 들지 않는가 ────────────────────────
 * 지금 보고 있는 페이지·펼친 문항 카드·펼친 고급 설정은 **저장 대상이 아니다.** 화면에서
 * 어디를 보고 있는지일 뿐이라 여기 안에 둔다. 저장되는 값(pages·qitems)은 호출부가 쥔다.
 */

/**
 * 안내 문구가 지원자에게 어떻게 보일지 그대로 보여 준다.
 *
 * 편집기와 응답 화면이 **같은 `FormDescription`을 쓰므로** 여기 보이는 것이 곧 결과다.
 * 비어 있으면 아무것도 그리지 않아 자리도 차지하지 않는다.
 */
function DescriptionPreview({ value }: Readonly<{ value?: string }>) {
  if (!value?.trim()) {
    return null;
  }
  return (
    <div className="mt-2 rounded-[10px] bg-bg px-[11px] py-[9px]">
      <div className="mb-[2px] text-[11.5px] text-n500">미리보기</div>
      <FormDescription className="text-[13.5px] leading-[1.7] text-n400">{value}</FormDescription>
    </div>
  );
}

/** 시스템이 요구하는 문항의 잠금 사유 — 배지·툴팁·경고가 같은 문장을 쓴다 */
const SYSTEM_QITEM_LOCKED = "시스템이 사용하는 문항은 지울 수 없습니다";

/*
 * 글자만 있는 «+ 페이지 추가»·«+ 문항 추가» 버튼 (#486).
 *
 * 글자 높이(20px)가 곧 히트 영역이라 손가락으로 빗나갔다. 어드민은 같은 자리에 `Button
 * variant="link"`을 쓰는데 이 앱에는 `Button`이 없어 그 `LINK_SHAPE`을 그대로 적는다 —
 * **패딩을 음수 마진으로 상쇄**하므로 보이는 자리·크기는 그대로고 히트 영역만 24px이 된다.
 */
const LINK_BUTTON =
  "-mx-1 -my-1 inline-flex min-h-6 min-w-6 cursor-pointer items-center justify-center rounded-[6px] px-1 py-1 text-[14px] text-accent focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none";

export function QitemComposer({
  cpst,
  onChange,
  issues,
  inUseQitemIds,
  systemRequiredQitemIds,
  readOnly,
  onWarn,
}: Readonly<{
  cpst: QitemCpstCn;
  /** 문항 구성만 바꾼다 — 무엇이 언제 저장되는지는 호출부가 정한다 */
  onChange: (updater: (cpst: QitemCpstCn) => QitemCpstCn) => void;
  /** qitemId → 그 문항에 붙일 오류 문구들 (`validateQitemCpst` 결과) */
  issues: Record<string, string[]>;
  /** 이미 응답이 달려 삭제하면 서버가 409로 막는 문항 ID들 */
  inUseQitemIds?: string[];
  /** 시스템이 요구해 지울 수 없는 문항 ID들 — 폼 상세가 준 서버의 계약 그대로다 */
  systemRequiredQitemIds?: string[];
  /**
   * 접수가 시작돼 고칠 수 없는 상태 (#528).
   *
   * **어드민 편집기에는 없던 축이다** — 그쪽은 편집 화면 자체가 권한으로 갈리지만, 이쪽은
   * 같은 화면이 «편집»과 «보기» 둘로 쓰인다(서버가 창이 닫혀도 200에 문항을 그대로 준다).
   * 판정은 서버 `isEditable`이고 화면이 다시 계산하지 않는다.
   */
  readOnly?: boolean;
  /** 막힌 조작을 알린다 — 어드민의 `flash` 토스트 자리 */
  onWarn?: (message: string) => void;
}>) {
  /* 셋 다 저장 대상이 아니다 — 화면에서 어디를 보고 있는지일 뿐이다 */
  const [page, setPage] = useState(0);
  const [openQ, setOpenQ] = useState<string | null>(null);
  const [advQ, setAdvQ] = useState<string | null>(null);

  const inUse = inUseQitemIds ?? [];
  const systemRequired = systemRequiredQitemIds ?? [];
  const { pages, qitems } = cpst;
  const pageQitems = qitems.filter((q) => (q.pageSeq ?? 0) === page);
  const warn = (message: string) => onWarn?.(message);

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
      warn("페이지는 최소 1개 필요합니다");
      return;
    }
    /*
     * 페이지를 지우면 그 페이지의 문항도 함께 사라진다. 응답이 달린 문항이 섞여 있으면
     * 서버가 409로 막을 요청이므로 여기서 먼저 알린다.
     */
    const pageQitemIds = qitems.filter((q) => (q.pageSeq ?? 0) === index).map((q) => q.qitemId);

    const removed = pageQitemIds.filter((qitemId) => inUse.includes(qitemId));
    if (removed.length > 0) {
      warn(`이미 응답이 있는 문항이 포함돼 있습니다 (${removed.join(", ")})`);
      return;
    }

    /* 시스템이 요구하는 문항은 페이지째 지우는 경로로도 사라지면 안 된다 */
    const locked = pageQitemIds.filter((qitemId) => systemRequired.includes(qitemId));
    if (locked.length > 0) {
      warn(`${SYSTEM_QITEM_LOCKED} (${locked.join(", ")})`);
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

  /* 새 문항 ID는 개수가 아니라 최대값+1이다 — 근거는 model/qitem-draft.ts */
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
     * qitemId는 응답 내용(`rspns_cn`)의 key다. 응답이 하나라도 있는 폼에서 문항을 지우면 그
     * 응답을 다시 읽을 수 없으므로 서버가 409로 막는다 — 지운 뒤 저장이 막히는 것을 보고
     * 되돌리게 하지 말고, 누르는 순간 막는다.
     */
    if (inUse.includes(qitemId)) {
      warn("응답이 있는 문항은 지울 수 없습니다");
      return;
    }
    if (systemRequired.includes(qitemId)) {
      warn(SYSTEM_QITEM_LOCKED);
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
      ...(isTextQitemType(cd) ? {} : { ptrnCn: undefined, ptrnNm: undefined, ptrnMsgCn: undefined }),
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
        {!readOnly && (
          <button type="button" onClick={addPage} className={LINK_BUTTON}>
            + 페이지 추가
          </button>
        )}
      </div>
      <div className="mb-3 flex flex-wrap gap-[6px]">
        {/*
          페이지 칩의 key가 index인 것은 index가 곧 페이지의 식별자이기 때문이다(S6479).
          저장 형식의 페이지에는 id가 없고 문항의 `pageSeq`·분기의 목적지가 전부 이 index를
          가리킨다 — 옮기고 지워도 «n번째 칸»이 같은 칸이다. 아래 «문항 이동»·«선택지별 페이지
          이동»의 페이지 칩도 같다.
        */}
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
          {!readOnly && (
            <>
              {/* 화살표 글자 하나는 좁고 이름도 없다 — 뜻을 aria-label로, 히트는 24px */}
              <button
                type="button"
                aria-label="페이지 위로 이동"
                onClick={() => movePage(page, -1)}
                className="-my-1 min-h-6 cursor-pointer px-1 py-1 text-n500"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="페이지 아래로 이동"
                onClick={() => movePage(page, 1)}
                className="-my-1 min-h-6 cursor-pointer px-1 py-1 text-n500"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removePage(page)}
                aria-label="페이지 삭제"
                className="-my-1 min-h-6 cursor-pointer px-1 py-1 hover:text-danger"
              >
                삭제
              </button>
            </>
          )}
        </div>
        {/*
          편집기 안쪽 칸들은 라벨을 세우지 않는다 (#486) — 문항 카드가 이미 여러 층이라 칸마다
          라벨을 얹으면 편집기가 두 배로 길어진다. placeholder에 보이는 이름을 `aria-label`로
          붙인다. 어드민 `features/form/ui/qitem-composer.tsx`와 같은 자리·같은 이름이다.
        */}
        <div className="mt-2 flex flex-col gap-2">
          <TextField
            aria-label="페이지 제목"
            value={pages[page]?.pageTtl ?? ""}
            disabled={readOnly}
            onChange={(e) =>
              onChange((c) => ({
                ...c,
                pages: c.pages.map((p, i) => (i === page ? { ...p, pageTtl: e.target.value } : p)),
              }))
            }
            placeholder="페이지 제목"
          />
          <TextArea
            aria-label="페이지 설명"
            value={pages[page]?.pageDescCn ?? ""}
            disabled={readOnly}
            onChange={(e) =>
              onChange((c) => ({
                ...c,
                pages: c.pages.map((p, i) =>
                  i === page ? { ...p, pageDescCn: e.target.value } : p,
                ),
              }))
            }
            rows={2}
            placeholder="페이지 설명 (선택, 마크다운 가능)"
          />
          <DescriptionPreview value={pages[page]?.pageDescCn} />
        </div>
      </div>

      <div className="mt-4 mb-2 flex items-center">
        <div className="text-[14.5px] font-medium">이 페이지의 문항 {pageQitems.length}개</div>
        <div className="flex-1" />
        {!readOnly && (
          <button type="button" onClick={addQitem} className={LINK_BUTTON}>
            + 문항 추가
          </button>
        )}
      </div>

      {pageQitems.length === 0 ? (
        <div className="py-4 text-center text-[14px] text-n500">
          {readOnly ? "문항이 없습니다." : "문항이 없습니다. 위에서 문항을 추가하세요."}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {pageQitems.map((q, qi) => {
            const open = openQ === q.qitemId;
            /*
             * 서버와 같은 규칙으로 미리 잡은 오류. 400을 받고 나서 알려 주면 어느 문항이
             * 문제인지 서버 응답만으로는 알 수 없다.
             */
            const qIssues = issues[q.qitemId] ?? [];
            /* 서버가 상세 응답으로 선언한 잠금 — 첫 로드부터 걸린다 */
            const systemLocked = systemRequired.includes(q.qitemId);
            return (
              <div key={q.qitemId} className={cardBorder(qIssues.length > 0)}>
                {/* 머리글 안에 버튼이 없어 <button>으로 — 키보드로 펼칠 수 있어야 한다 */}
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenQ(open ? null : q.qitemId)}
                  className="flex w-full cursor-pointer items-center gap-2 p-3 text-left"
                >
                  <div className="text-[14.5px] font-semibold">
                    {qi + 1}. {q.qitemLblNm || "(제목 없음)"}
                  </div>
                  <div className="min-w-0 flex-1 truncate text-[12.5px] text-n500">
                    {qSummary(q)}
                  </div>
                  {/* 접힌 카드에서도 잠긴 문항인지 보여야 한다 — 폼이 아니라 문항이라 «시스템»까지만 */}
                  {systemLocked && (
                    <Badge tone="outline" className="flex-none">
                      시스템
                    </Badge>
                  )}
                  {qIssues.length > 0 && (
                    <div className="flex-none text-[12px] text-danger">
                      확인 필요 {qIssues.length}
                    </div>
                  )}
                  <div className="text-[11px] text-n500">{open ? "▲" : "▼"}</div>
                </button>

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
                      aria-label="질문 문구"
                      value={q.qitemLblNm}
                      disabled={readOnly}
                      onChange={(e) => patchQ(q.qitemId, { qitemLblNm: e.target.value })}
                      placeholder="질문 문구"
                    />
                    <TextArea
                      aria-label="문항 설명"
                      className="mt-2"
                      value={q.qitemDescCn ?? ""}
                      disabled={readOnly}
                      onChange={(e) => patchQ(q.qitemId, { qitemDescCn: e.target.value })}
                      rows={2}
                      placeholder="문항 설명 (선택, 마크다운 가능)"
                    />
                    <DescriptionPreview value={q.qitemDescCn} />
                    <div className="mt-2 flex flex-wrap gap-[6px]">
                      {QITEM_TYPE_CDS.map((cd) => (
                        <Chip
                          key={cd}
                          active={q.qitemTypeCd === cd}
                          disabled={readOnly}
                          onClick={() => changeType(q, cd)}
                        >
                          {QITEM_TYPE_NM[cd]}
                        </Chip>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Toggle
                        size="sm"
                        label={`${q.qitemLblNm || "(제목 없음)"} 필수 응답`}
                        on={q.reqYn}
                        disabled={readOnly}
                        onChange={(on) => patchQ(q.qitemId, { reqYn: on })}
                      />
                      <span className="text-[14px]">필수 응답</span>
                      <div className="flex-1" />
                      {!readOnly && (
                        <>
                          <button
                            type="button"
                            aria-label="문항 위로 이동"
                            onClick={() => moveQitem(q.qitemId, -1)}
                            className="-my-1 min-h-6 cursor-pointer px-1 py-1 text-n400"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            aria-label="문항 아래로 이동"
                            onClick={() => moveQitem(q.qitemId, 1)}
                            className="-my-1 min-h-6 cursor-pointer px-1 py-1 text-n400"
                          >
                            ↓
                          </button>
                          {/*
                            시스템이 요구하는 문항의 삭제는 감추지 않고 잠근다 — 버튼이 사라지면
                            이 문항만 못 지우는 것인지 편집기에 삭제가 없는 것인지 알 수 없다.
                          */}
                          <button
                            type="button"
                            disabled={systemLocked}
                            title={systemLocked ? SYSTEM_QITEM_LOCKED : undefined}
                            onClick={() => removeQitem(q.qitemId)}
                            className="cursor-pointer text-[14px] text-n400 hover:text-danger disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-n400"
                          >
                            삭제
                          </button>
                        </>
                      )}
                    </div>

                    {isChoiceQitemType(q.qitemTypeCd) && (
                      <div className="mt-3">
                        <div className="mb-[6px] text-[13.5px] text-n400">선택지</div>
                        <div className="flex flex-col gap-[6px]">
                          {/*
                            선택지 행의 key도 index다(S6479). 선택지는 저장 형식에서 `string[]`이고
                            그 글자가 응답값이자 `branchMap`의 key라 id를 끼울 자리가 없으며,
                            글자는 겹칠 수 있어 key로 못 쓴다.
                          */}
                          {q.optionList.map((o, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <TextField
                                aria-label={`선택지 ${oi + 1}`}
                                value={o}
                                disabled={readOnly}
                                onChange={(e) =>
                                  patchQ(q.qitemId, {
                                    optionList: q.optionList.map((x, xi) =>
                                      xi === oi ? e.target.value : x,
                                    ),
                                  })
                                }
                              />
                              {!readOnly && (
                                <button
                                  type="button"
                                  onClick={() => removeOption(q, o)}
                                  className="cursor-pointer text-[13.5px] whitespace-nowrap text-n400 hover:text-danger"
                                >
                                  삭제
                                </button>
                              )}
                            </div>
                          ))}
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() =>
                                patchQ(q.qitemId, {
                                  optionList: [...q.optionList, `선택지 ${q.optionList.length + 1}`],
                                })
                              }
                              className="cursor-pointer self-start text-[13.5px] text-accent"
                            >
                              + 선택지 추가
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* admin 사본과 같은 자리 — 위 문항 머리글에는 있는데 여기만 빠져 있었다 (#692) */}
                    <button
                      type="button"
                      aria-expanded={advQ === q.qitemId}
                      onClick={() => setAdvQ(advQ === q.qitemId ? null : q.qitemId)}
                      className="mt-3 cursor-pointer text-[13.5px] text-accent"
                    >
                      {advQ === q.qitemId ? "고급 설정 접기" : "고급 설정 (형식 검증 · 페이지 이동)"}
                    </button>

                    {advQ === q.qitemId && (
                      <div className="mt-3 flex flex-col gap-4 rounded-[10px] bg-bg p-3">
                        <div>
                          <div className="mb-[6px] text-[13.5px] text-n400">문항 이동</div>
                          <div className="flex flex-wrap gap-[6px]">
                            {/* key=index — index가 곧 pageSeq다(위 페이지 칩의 주석) */}
                            {pages.map((p, i) => (
                              <Chip
                                key={i}
                                active={(q.pageSeq ?? 0) === i}
                                disabled={readOnly}
                                onClick={() => patchQ(q.qitemId, { pageSeq: i })}
                              >
                                {i + 1}. {p.pageTtl}
                              </Chip>
                            ))}
                          </div>
                        </div>

                        {q.qitemTypeCd === "MULTI_CHOICE" && (
                          <Field label="최대 선택 개수">
                            {/*
                              빈 값만 «제한 없음»이다. 숫자가 아니면 초안을 바꾸지 않고 알린다 —
                              `Number(v) || undefined`는 "0"도 "abc"도 조용히 제한 없음으로 바꿔
                              입력이 사라진 줄도 모른다. 범위는 검증이 문항 카드에서 잡는다.
                            */}
                            <TextField
                              value={q.maxSlctCnt ?? ""}
                              inputMode="numeric"
                              disabled={readOnly}
                              onChange={(e) => {
                                const parsed = parseMaxSlctCnt(e.target.value);
                                if (parsed.kind === "invalid") {
                                  warn("최대 선택 개수는 정수로 입력하세요");
                                  return;
                                }
                                patchQ(q.qitemId, {
                                  maxSlctCnt: parsed.kind === "empty" ? undefined : parsed.value,
                                });
                              }}
                              placeholder="제한 없음"
                              className="w-[120px]"
                            />
                          </Field>
                        )}

                        {isTextQitemType(q.qitemTypeCd) && (
                          <div>
                            <div className="mb-[6px] text-[13.5px] text-n400">입력 형식 검증</div>
                            <div className="flex flex-wrap gap-[6px]">
                              {PATTERN_PRESETS.map((p) => (
                                <Chip
                                  key={p.name}
                                  active={p.name === "자유 입력" ? !q.ptrnCn : q.ptrnNm === p.name}
                                  disabled={readOnly}
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
                              iOS Safari는 글자 크기가 16px 미만인 입력란에 포커스가 가면 페이지를
                              통째로 확대하고 되돌리지 않는다 — 모바일만 16px로 두고 lg:에서
                              고정폭 13.5px을 되살린다.
                            */}
                            <TextField
                              aria-label="정규식"
                              value={q.ptrnCn ?? ""}
                              invalid={!isCompilableRegExp(q.ptrnCn)}
                              disabled={readOnly}
                              onChange={(e) => patchQ(q.qitemId, { ptrnCn: e.target.value })}
                              placeholder="정규식 (예: ^[0-9]{8}$)"
                              className="mt-2 font-mono text-[16px] lg:text-[13.5px]"
                            />
                            {/* 깨진 정규식은 지원자 화면의 응답 검증을 통째로 무너뜨린다 */}
                            {!isCompilableRegExp(q.ptrnCn) && (
                              <div className="mt-[5px] text-[12.5px] text-danger">
                                정규식으로 해석되지 않습니다
                              </div>
                            )}
                            <TextField
                              aria-label="형식 오류 안내 문구"
                              value={q.ptrnMsgCn ?? ""}
                              disabled={readOnly}
                              onChange={(e) => patchQ(q.qitemId, { ptrnMsgCn: e.target.value })}
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
                                      disabled={readOnly}
                                      onClick={() => {
                                        const branchMap = q.branchMap ? { ...q.branchMap } : {};
                                        delete branchMap[o];
                                        patchQ(q.qitemId, {
                                          branchMap:
                                            Object.keys(branchMap).length > 0 ? branchMap : undefined,
                                        });
                                      }}
                                    >
                                      다음 페이지
                                    </Chip>
                                    {/* key=index — branchMap의 값이 곧 이 index다 */}
                                    {pages.map((p, i) => (
                                      <Chip
                                        key={i}
                                        active={q.branchMap?.[o] === i}
                                        disabled={readOnly}
                                        onClick={() =>
                                          patchQ(q.qitemId, {
                                            // undefined 전개는 건너뛴다 (#660 · S7744)
                                            branchMap: { ...q.branchMap, [o]: i },
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
  return hasIssue ? "rounded-[12px] border border-danger/45" : "rounded-[12px] border border-line";
}
