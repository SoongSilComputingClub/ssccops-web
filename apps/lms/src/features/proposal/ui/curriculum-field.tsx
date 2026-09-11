"use client";

import { FormDescription } from "@ssccops/form-renderer";
import type { Qitem } from "@ssccops/form-renderer";
import {
  emptyCurriculumRow,
  maskYmd,
  toCurriculumText,
  type CurriculumRow,
} from "../model/curriculum-rows";

/*
 * 커리큘럼 문항 입력 보조 — 회차·주제·날짜 3칸 표 (#342).
 *
 * ── 왜 `QitemCard`가 아니라 여기 있는가 ─────────────────────
 * `@ssccops/form-renderer`는 **어느 폼이든** 그리는 패키지이고 www의 신청 폼 세 화면도 같은
 * `QitemCard`를 쓴다. 커리큘럼은 기획안 폼 하나의 문항이고 그 형식은 학술 도메인의 이관
 * 계약(ssccops-server#150)이라, 패키지에 넣으면 범용 렌더러가 특정 폼의 계약을 알게 된다.
 * 그래서 lms에 두고 **그 문항 하나만** 갈아 끼운다.
 *
 * ── 왜 뷰가 아니라 피처인가 ─────────────────────────────────
 * 신규 작성(`views/proposal-new`)과 재제출(`views/proposal-detail`)이 **같은 것**을 써야 한다 —
 * 두 화면이 각자 표를 그리면 만들어 내는 문자열이 갈리고, 갈린 쪽으로 낸 기획안만 승인에서
 * 막힌다. 뷰 하나에 두고 다른 뷰가 가져다 쓰면 같은 레이어끼리 참조하는 것이라(AGENTS.md)
 * 두 화면이 함께 쓰는 것은 `features`에 둔다.
 *
 * ── 저장되는 것은 지금과 똑같은 문자열이다 ───────────────────
 * 표는 입력 보조일 뿐이고 답은 여전히 `LONG_TEXT` 한 칸이다. 조립·해체는 전부
 * `curriculum-rows.ts`가 하고 이 컴포넌트는 칸을 그릴 뿐이다 — 화면이 줄을 직접 만들면
 * 서버 파서와 맞물리는 지점이 둘이 되어, 한쪽만 고쳐지는 순간 승인이 막힌다.
 *
 * ── 형식 안내를 다시 적지 않는다 ────────────────────────────
 * 문항 문구(`qitemLblNm`)는 서버 시드가 형식까지 적어 둔 문장이고 화면은 그것을 그대로
 * 보여 준다(`proposal-error.ts`의 결정). 칸 이름(`회차`·`주제`·`계획일`)은 그 형식을 다시
 * 진술한 것이 아니라 입력칸의 이름이다.
 *
 * 입력란 글자는 좁은 화면에서 16px 아래로 내리지 않는다(AGENTS.md #105) — iOS Safari가
 * 포커스에서 화면을 자동 확대하고 그 확대가 스스로 돌아오지 않는다.
 */
export function CurriculumField({
  qitem,
  rows,
  error,
  onChange,
}: {
  qitem: Qitem;
  rows: CurriculumRow[];
  error?: string;
  onChange: (rows: CurriculumRow[], text: string) => void;
}) {
  // 표는 늘 한 줄은 보여 준다 — 빈 표에 '행 추가'만 있으면 무엇을 적는 자리인지 알 수 없다
  const shown = rows.length > 0 ? rows : [emptyCurriculumRow()];

  const commit = (next: CurriculumRow[]) => onChange(next, toCurriculumText(next));

  const setRow = (index: number, patch: Partial<CurriculumRow>) => {
    commit(shown.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  return (
    <div
      className={
        error
          ? "rounded-2xl bg-surface px-[18px] py-4 shadow-[0_0_0_1px_var(--color-danger)]"
          : "rounded-2xl bg-surface px-[18px] py-4 shadow-[0_0_0_1px_var(--color-line)]"
      }
    >
      <div className="text-[16px] font-semibold">
        {qitem.qitemLblNm}
        {qitem.reqYn && <span className="ml-1 text-danger">*</span>}
      </div>
      <FormDescription className="mt-[3px] text-[13.5px] leading-[1.7] text-n400">
        {qitem.qitemDescCn}
      </FormDescription>

      <div className="mt-3 flex flex-col gap-[8px]">
        {/*
          key=index로 둔다 (#401 · S6479). 회차는 곧 행의 위치라(아래 `{index + 1}회차`) index가
          이 목록의 식별자이고, 행은 재정렬이 없다. 지우면 뒤 행이 한 회차씩 당겨지는 것이
          의도한 동작이며 칸은 전부 controlled라 값은 props가 다시 채운다. 저장 형식은 문자열
          한 칸(`toCurriculumText`)이라 행에 id를 두어도 남지 않는다.
        */}
        {shown.map((row, index) => (
          <div key={index} className="flex items-center gap-[6px]">
            {/*
             * 회차 번호는 읽기 전용이다 — 행 순서에서 매기므로 사람이 셀 이유가 없고,
             * 고칠 수 있게 두면 화면에 보이는 번호와 저장되는 번호가 갈린다.
             */}
            <div className="w-[52px] flex-none text-center text-[14px] text-n400">
              {index + 1}회차
            </div>
            <input
              type="text"
              value={row.title}
              onChange={(e) => setRow(index, { title: e.target.value })}
              placeholder="주제"
              aria-label={`${index + 1}회차 주제`}
              className="min-w-0 flex-1 rounded-[12px] border border-line px-[11px] py-[9px] text-[16px] outline-none placeholder:text-n500 focus:border-accent lg:text-[15.5px]"
            />
            {/*
             * 날짜는 마스킹 입력이다(`type="date"`가 아니다 · #342). 숫자만 쳐도 `-`가 들어가고,
             * `inputMode="numeric"`이라 모바일에서 숫자 키보드가 바로 뜬다.
             */}
            <input
              type="text"
              inputMode="numeric"
              value={row.planYmd}
              onChange={(e) => setRow(index, { planYmd: maskYmd(e.target.value) })}
              placeholder="2026-03-05"
              aria-label={`${index + 1}회차 계획일`}
              className="w-[124px] flex-none rounded-[12px] border border-line px-[11px] py-[9px] text-[16px] outline-none placeholder:text-n500 focus:border-accent lg:w-[132px] lg:text-[15.5px]"
            />
            <button
              type="button"
              onClick={() => commit(shown.filter((_, i) => i !== index))}
              disabled={shown.length === 1}
              aria-label={`${index + 1}회차 삭제`}
              title={shown.length === 1 ? "마지막 회차는 지울 수 없습니다" : "이 회차를 지웁니다"}
              className="size-[34px] flex-none cursor-pointer rounded-[10px] border border-line text-[15px] text-n400 hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-n400"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => commit([...shown, emptyCurriculumRow()])}
        className="mt-[10px] w-full cursor-pointer rounded-[12px] border border-dashed border-line-strong py-[10px] text-[14px] text-n300 hover:border-accent hover:text-accent"
      >
        + 회차 추가
      </button>

      {/*
       * 날짜는 생략할 수 있다는 것만 밝힌다. 서버 안내에 이미 적혀 있지만(`(날짜는 생략할 수
       * 있습니다)`) 그 문장은 "한 줄에 한 회차씩" 적던 시절의 문장이라, 칸을 비워 두어도
       * 되는지는 표를 보는 사람에게 다시 보이지 않는다.
       */}
      <div className="mt-[8px] text-[12.5px] text-n500">계획일은 비워 둘 수 있습니다</div>

      {error && <div className="mt-2 text-[13.5px] text-danger">{error}</div>}
    </div>
  );
}

/*
 * 이 문항을 표로 열 것인가 — 못 열면 지금의 자유 입력 그대로 둔다.
 *
 * **문항 라벨 문자열로 맞히지 않는다.** 라벨은 운영진이 화면에서 고칠 수 있는 표시 데이터라
 * (`ProposalFormSeed` 주석: "이 클래스는 '지금의 폼'이 아니라 '초기값'이다") 문구가 바뀌면
 * 표가 조용히 풀린다. 대신 `qitemId`를 본다 — 응답 본문의 key이고, 기획안이 한 건이라도
 * 접수된 뒤로는 **바꿀 수 없는 계약**이다(`MIGRATION_REQUIRED_QITEM_IDS`가 삭제까지 막는다).
 *
 * 유형도 함께 본다. 운영진이 이 문항을 다른 유형으로 바꿨다면 표가 만드는 문자열은 더 이상
 * 그 문항의 답이 아니다 — 그때는 `QitemCard`가 그 유형대로 그리게 둔다.
 */

/** 커리큘럼 문항의 `qitemId` — 서버 `ProposalFormSeed.QITEM_CURRICULUM`과 같은 값이다 */
export const CURRICULUM_QITEM_ID = "curriculum";

export function isCurriculumQitem(qitem: Qitem): boolean {
  return qitem.qitemId === CURRICULUM_QITEM_ID && qitem.qitemTypeCd === "LONG_TEXT";
}
