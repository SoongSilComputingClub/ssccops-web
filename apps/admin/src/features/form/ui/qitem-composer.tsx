"use client";

import { useState } from "react";
import {
  SYSTEM_FORM_BADGE,
  SYSTEM_FORM_QITEM_LOCKED,
  SYSTEM_FORM_QUESTIONS_LOCKED,
  SYSTEM_FORM_QITEM_TEXT_OPEN,
  SYSTEM_FORM_QUESTIONS_OPEN_PARTS,
  type Qitem,
  type QitemCpstCn,
} from "@/entities/form";
import { matchesPatternPreset } from "@ssccops/form-renderer";
import { PATTERN_PRESETS } from "@/shared/config/constants";
import {
  isChoiceQitemType,
  isTextQitemType,
  QITEM_TYPE_CDS,
  QITEM_TYPE_NM,
  type QitemTypeCd,
} from "@/shared/config/codes";
import { FormDescription } from "@ssccops/form-renderer";
import { Badge, Button, Card, Chip, Field, SectionLabel, TextArea, TextField, Toggle, flash } from "@/shared/ui";
import { nextQitemId, parseMaxSlctCnt } from "../model/form-draft";

/*
 * 안내 문구가 응답자에게 어떻게 보일지 그대로 보여 준다 (ssccops#222).
 *
 * 편집기와 응답 화면이 **같은 `FormDescription`을 쓰므로** 여기 보이는 것이 곧 결과다 —
 * 렌더러를 앱마다 두면 "편집기에서는 목록이었는데 응답 화면에서는 별표가 그대로"가 된다.
 *
 * 토글을 두지 않고 늘 그리는 것은, 접어 두면 마크다운이 먹었는지 안 먹었는지를 확인하려고
 * 매번 펼쳐야 하기 때문이다. 비어 있으면 FormDescription이 아무것도 그리지 않아 자리도
 * 차지하지 않는다.
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

/*
 * 시스템 폼의 문항 잠금에서 문항 카드가 펼쳐질 때 그리는 본문 (#554 · #563).
 *
 * **질문 문구·문항 설명만 입력란이고 나머지는 값만 그린다.** 서버 잠금(server#505 · ssccops#421)이
 * 구조 속성(유형·필수·선택지·분기·형식 검증·최대 선택 수·순서)만 비교하므로 사람이 읽는 두 칸은
 * 여기서 고쳐도 저장이 통과한다 — 운영진이 학기마다 안내를 다듬는 자리다. 구조 속성에
 * `disabled` 입력란을 늘어놓지 않는 이유는 «고칠 수 있는데 왜 안 되지»가 되고 편집기 본문의
 * 분기가 그만큼 늘어 Sonar 인지 복잡도를 넘기기 때문이다 — 운영진이 알아야 하는 것은 «지금
 * 무엇으로 돼 있나»뿐이다.
 */
function LockedQitemBody({
  q,
  pages,
  onPatch,
}: Readonly<{
  q: Qitem;
  pages: QitemCpstCn["pages"];
  onPatch: (patch: Partial<Qitem>) => void;
}>) {
  const branches = Object.entries(q.branchMap ?? {});
  const pageTitle = (i: number) => `${i + 1}. ${pages[i]?.pageTtl ?? ""}`;
  return (
    <div className="border-t border-line p-3 text-[13.5px] leading-[1.7] text-n400">
      <TextField
        aria-label="질문 문구"
        value={q.qitemLblNm}
        onChange={(e) => onPatch({ qitemLblNm: e.target.value })}
        placeholder="질문 문구"
      />
      <TextArea
        aria-label="문항 설명"
        className="mt-2"
        value={q.qitemDescCn ?? ""}
        onChange={(e) => onPatch({ qitemDescCn: e.target.value })}
        rows={2}
        placeholder="문항 설명 (선택, 마크다운 가능)"
      />
      <DescriptionPreview value={q.qitemDescCn} />
      <div className="mt-2 text-[12.5px] text-n500">
        {SYSTEM_FORM_QITEM_TEXT_OPEN}
      </div>
      <div className="mt-2">
        {QITEM_TYPE_NM[q.qitemTypeCd]}
        {q.reqYn ? " · 필수 응답" : ""}
        {q.maxSlctCnt !== undefined ? ` · 최대 ${q.maxSlctCnt}개 선택` : ""}
      </div>
      {isChoiceQitemType(q.qitemTypeCd) && q.optionList.length > 0 && (
        <div className="mt-2">
          <div className="text-n500">선택지</div>
          <ul className="list-disc pl-5">
            {/* key=index — 선택지 글자는 겹칠 수 있다 (아래 편집 본문의 주석 · #658 S6479 오탐) */}
            {q.optionList.map((o, oi) => (
              <li key={oi}>{o}</li>
            ))}
          </ul>
        </div>
      )}
      {q.ptrnCn && (
        <div className="mt-2">
          <div className="text-n500">입력 형식 검증</div>
          <div>
            {q.ptrnNm ?? "정규식"} · <span className="font-mono">{q.ptrnCn}</span>
          </div>
          {q.ptrnMsgCn && <div>{q.ptrnMsgCn}</div>}
        </div>
      )}
      {branches.length > 0 && (
        <div className="mt-2">
          <div className="text-n500">선택지별 페이지 이동</div>
          {branches.map(([o, i]) => (
            <div key={o}>
              {o} → {pageTitle(i)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/*
 * 문항 구성 편집기 — 페이지와 문항을 고치는 화면 조각.
 *
 * ── 시스템 폼의 문항 잠금 (#554 · ssccops#416) ─────────────────
 * `questionsLocked`면 문항 추가·삭제·이동·구조 속성 편집과 페이지 추가·삭제·순서를 잠근다(질문
 * 문구·문항 설명은 열려 있다 — #563 · ssccops#421) —
 * 문항의 `pageSeq`가 페이지 index라 페이지 구조가 바뀌면 문항도 바뀐다. 페이지 제목·설명은
 * 서버가 비교하지 않는 값(`pages`)이라 열어 둔다. 잠긴 버튼은 감추지 않고 `title`로 사유를
 * 붙이며(AGENTS.md «이동은 감추고, 동작은 잠근다»), 펼친 문항 카드는 `LockedQitemBody`가
 * 읽기 전용으로 그린다. `systemRequiredQitemIds`의 부분 잠금(삭제만)은 이 전체 잠금이 덮는다 —
 * 그 코드 경로를 남겨 둔 것은 서버가 여전히 그 목록을 내리고, 카드의 «시스템» 배지가 코드가
 * 직접 읽는 문항을 가리키는 정보로 남기 때문이다.
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
  questionsLocked,
}: Readonly<{
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
  /**
   * 계약이 있는 시스템 폼의 문항 전체 잠금 (#554 · ssccops#416 · 서버 409 `SYSTEM_FORM_QUESTIONS_LOCKED`).
   * 폼 편집기가 훅의 `questionsLocked`(`sysYn` && 계약 문항 있음 — #588 · ADR-0044)를 넘긴다.
   * 신입회원 모집 지정 폼은 시스템 폼이지만 계약이 없어 잠기지 않는다. 템플릿은 시스템 폼이
   * 될 수 없어 넘기지 않는다.
   */
  questionsLocked?: boolean;
}>) {
  /* 셋 다 저장 대상이 아니다 — 화면에서 어디를 보고 있는지일 뿐이다 */
  const [page, setPage] = useState(0);
  const [openQ, setOpenQ] = useState<string | null>(null);
  const [advQ, setAdvQ] = useState<string | null>(null);

  const inUse = inUseQitemIds ?? [];
  const systemRequired = systemRequiredQitemIds ?? [];
  const locked = questionsLocked ?? false;
  /* 잠긴 버튼의 사유 — 배너와 같은 문장이어야 한다 */
  const lockedTitle = locked ? SYSTEM_FORM_QUESTIONS_LOCKED : undefined;
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
      flash("응답이 있는 문항은 지울 수 없습니다");
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
      {/*
        잠금 안내는 문항 편집기 안, 맨 위에 둔다 (#554). 잠긴 버튼의 title은 마우스를 올려야
        보이고, 왼쪽 상자의 시스템 폼 안내는 좁은 화면에서 이 카드와 멀어진다 — 잠긴 것과
        열린 것을 잠긴 자리에서 함께 말한다.
      */}
      {locked && (
        <div className="mb-3 rounded-[12px] border border-line bg-bg px-[14px] py-[10px] text-[13px] leading-[1.6] text-n400">
          {/* 잠기는 것은 계약이 있는 시스템 폼(기획안)뿐이라 배지는 «시스템 폼» 그대로다 (#588) */}
          <Badge tone={SYSTEM_FORM_BADGE.tone}>{SYSTEM_FORM_BADGE.label}</Badge>{" "}
          {SYSTEM_FORM_QUESTIONS_LOCKED}. {SYSTEM_FORM_QUESTIONS_OPEN_PARTS}.
        </div>
      )}
      <div className="mb-3 flex items-center">
        <SectionLabel>페이지</SectionLabel>
        <div className="flex-1" />
        <Button variant="link" onClick={addPage} disabled={locked} title={lockedTitle}>
          + 페이지 추가
        </Button>
      </div>
      <div className="mb-3 flex flex-wrap gap-[6px]">
        {/*
          페이지 칩의 key가 index인 것은 index가 곧 페이지의 식별자이기 때문이다 (#401 · S6479).
          저장 형식(qitem_cpst_cn)의 페이지에는 id가 없고 문항의 `pageSeq`·분기의 목적지가 전부
          이 index를 가리킨다 — 옮기고 지워도 "n번째 칸"이 같은 칸이다. Chip은 props만으로
          그리는 버튼이라 옮겨 붙을 로컬 상태도 없다. 아래 `문항 이동`·`선택지별 페이지 이동`의
          페이지 칩도 같다.
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
          {/* 화살표 글자 하나는 12×20 이라 빗나가고 이름도 없다 — 뜻을 aria-label 로, 히트는 24px (UI 감사 D5 · #473) */}
          <Button
            variant="link"
            aria-label="페이지 위로 이동"
            onClick={() => movePage(page, -1)}
            disabled={locked}
            title={lockedTitle}
            className="text-n500"
          >
            ↑
          </Button>
          <Button
            variant="link"
            aria-label="페이지 아래로 이동"
            onClick={() => movePage(page, 1)}
            disabled={locked}
            title={lockedTitle}
            className="text-n500"
          >
            ↓
          </Button>
          <button
            type="button"
            onClick={() => removePage(page)}
            disabled={locked}
            title={lockedTitle}
            aria-label="페이지 삭제"
            className="-my-1 min-h-6 cursor-pointer px-1 py-1 hover:text-danger disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:text-n500"
          >
            삭제
          </button>
        </div>
        <div className="mt-2 flex flex-col gap-2">
          <TextField
            aria-label="페이지 제목"
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
          <TextArea
            aria-label="페이지 설명"
            value={pages[page]?.pageDescCn ?? ""}
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
        <div className="text-[14.5px] font-medium">
          이 페이지의 문항 {pageQitems.length}개
        </div>
        <div className="flex-1" />
        <Button variant="link" onClick={addQitem} disabled={locked} title={lockedTitle}>
          + 문항 추가
        </Button>
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
                {/* 키보드 접근(#403) — 머리글 안에 버튼이 없어 <button>으로 */}
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

                {/* 잠긴 폼은 문구·설명만 고칠 수 있다 — 근거는 LockedQitemBody 주석 (#554 · #563) */}
                {open && locked && (
                  <LockedQitemBody
                    q={q}
                    pages={pages}
                    onPatch={(patch) => patchQ(q.qitemId, patch)}
                  />
                )}

                {open && !locked && (
                  <div className="border-t border-line p-3">
                    <TextField
                      aria-label="질문 문구"
                      value={q.qitemLblNm}
                      onChange={(e) => patchQ(q.qitemId, { qitemLblNm: e.target.value })}
                      placeholder="질문 문구"
                    />
                    <TextArea
                      aria-label="문항 설명"
                      className="mt-2"
                      value={q.qitemDescCn ?? ""}
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
                        onChange={(on) => patchQ(q.qitemId, { reqYn: on })}
                      />
                      <span className="text-[14px]">필수 응답</span>
                      <div className="flex-1" />
                      <Button
                        variant="link"
                        aria-label="문항 위로 이동"
                        onClick={() => moveQitem(q.qitemId, -1)}
                        className="text-n400"
                      >
                        ↑
                      </Button>
                      <Button
                        variant="link"
                        aria-label="문항 아래로 이동"
                        onClick={() => moveQitem(q.qitemId, 1)}
                        className="text-n400"
                      >
                        ↓
                      </Button>
                      {/*
                        시스템이 요구하는 문항의 삭제는 감추지 않고 잠근다 — 버튼이 사라지면
                        이 문항만 못 지우는 것인지 편집기에 삭제가 없는 것인지 알 수 없다.
                        시스템 폼은 `questionsLocked`로 이 본문에 오지 않으므로(#554) 이 부분
                        잠금은 전체 잠금이 덮는다 — 남겨 둔 것은 서버가 그 목록을 여전히 내리고
                        계약 문항이 무엇인지 알리는 자리이기 때문이다.
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
                          {/*
                            선택지 행의 key도 index다 (#401 · S6479). 선택지는 저장 형식에서
                            `string[]`이고 그 글자가 응답값이자 `branchMap`의 key라 id를 끼울
                            자리가 없으며, 글자는 겹칠 수 있어(`선택지 1`이 둘) key로 못 쓴다.
                            행은 controlled `TextField` + 삭제 버튼뿐이라 붙어 다닐 로컬 상태가
                            없고, 이 목록은 재정렬이 없다 — 지우면 뒤 행이 당겨지지만 값은
                            props가 다시 채운다.
                          */}
                          {q.optionList.map((o, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <TextField
                                aria-label={`선택지 ${oi + 1}`}
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

                    {/* 같은 파일 위쪽 문항 머리글에는 있던 것이 여기엔 없었다 (#692) */}
                    <button
                      type="button"
                      aria-expanded={advQ === q.qitemId}
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
                            {/* key=index — index가 곧 pageSeq다 (위 페이지 칩의 주석) */}
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
                          <Field label="최대 선택 개수">
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
                          </Field>
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
                                    matchesPatternPreset(p, q.ptrnCn)
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
                              aria-label="정규식"
                              value={q.ptrnCn ?? ""}
                              invalid={!isCompilableRegExp(q.ptrnCn)}
                              onChange={(e) => patchQ(q.qitemId, { ptrnCn: e.target.value })}
                              placeholder="정규식 (예: ^[0-9]{8}$)"
                              className="mt-2 font-mono text-[16px] lg:text-[13.5px]"
                            />
                            {/* 깨진 정규식은 공개 폼의 응답 검증을 통째로 무너뜨린다 */}
                            {!isCompilableRegExp(q.ptrnCn) && (
                              <div className="mt-[5px] text-[12.5px] text-danger">
                                정규식으로 해석되지 않습니다
                              </div>
                            )}
                            <TextField
                              aria-label="형식 오류 안내 문구"
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
                                    {/* key=index — branchMap의 값이 곧 이 index다 (위 페이지 칩의 주석) */}
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
