"use client";

import type { ReactNode, SelectHTMLAttributes } from "react";
import { FormDescription } from "@ssccops/form-renderer";
import type { Qitem } from "@ssccops/form-renderer";
import { cn } from "@ssccops/ui";
import {
  HOURS,
  MINUTES,
  MONTH_DAYS,
  PERIOD_LABEL,
  WEEKDAYS,
  emptyScheduleParts,
  toScheduleText,
  type SchedulePeriod,
  type ScheduleParts,
} from "../model/schedule-text";

/*
 * 정기 일정 문항 입력 보조 — 주기·요일(날짜)·시각 드롭다운 (#349).
 *
 * 왜 `QitemCard`가 아니라 여기 있는지, 왜 뷰가 아니라 피처인지는 옆의 `curriculum-field.tsx`에
 * 적어 둔 것과 같다 — 범용 렌더러가 특정 폼의 문항을 알게 하지 않고, 신규 작성과 재제출이
 * **같은 것**을 써야 만들어 내는 문자열이 갈리지 않는다.
 *
 * ── 저장되는 것은 지금과 똑같은 문자열 한 칸이다 ─────────────
 * 조립·해체는 전부 `schedule-text.ts`가 하고 이 컴포넌트는 칸을 그릴 뿐이다.
 *
 * ── '직접 입력'을 남긴다 ────────────────────────────────────
 * 격주·요일 두 개·시험 기간 제외처럼 드롭다운으로 표현 못 하는 일정이 실제로 있다. 없애면
 * 그런 활동은 일정을 **아예 못 적는다** — 지금까지 적을 수 있던 것을 이번 변경이 빼앗는
 * 셈이라, 되돌아갈 길을 남긴다. 되돌아가면 그 뒤로는 자유 입력이고, 드롭다운으로 다시
 * 오려면 칸을 비운다(자유 입력으로 쓴 값을 드롭다운이 조용히 고쳐 쓰지 않게 하려는 것이다).
 *
 * 입력란 글자는 좁은 화면에서 16px 아래로 내리지 않는다(AGENTS.md #105) — iOS Safari가
 * 포커스에서 화면을 자동 확대하고 그 확대가 스스로 돌아오지 않는다.
 */
export function ScheduleField({
  qitem,
  parts,
  error,
  onChange,
  onFreeText,
}: {
  qitem: Qitem;
  parts: ScheduleParts;
  error?: string;
  onChange: (parts: ScheduleParts, text: string) => void;
  onFreeText: () => void;
}) {
  const commit = (next: ScheduleParts) => onChange(next, toScheduleText(next));

  const setPart = (patch: Partial<ScheduleParts>) => commit({ ...parts, ...patch });

  /*
   * 주기를 바꾸면 그 주기에 없는 칸은 비운다 — 매주로 골라 요일을 정해 둔 뒤 매월로 바꾸면
   * 요일은 저장 문자열에 쓰이지 않는데, 남겨 두면 다시 매주로 돌아왔을 때 고른 적 없는 값이
   * 살아 있는 것처럼 보인다.
   */
  const setPeriod = (period: SchedulePeriod | "") => {
    if (period === "") return commit(emptyScheduleParts());
    if (period === "weekly") return commit({ ...parts, period, day: "" });
    return commit({ ...parts, period, weekday: "" });
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

      <div className="mt-3 flex flex-wrap items-center gap-[6px]">
        <Select
          value={parts.period}
          onChange={(v) => setPeriod(v as SchedulePeriod | "")}
          aria-label="반복 주기"
          className="w-[92px]"
        >
          <option value="">주기</option>
          <option value="weekly">{PERIOD_LABEL.weekly}</option>
          <option value="monthly">{PERIOD_LABEL.monthly}</option>
        </Select>

        {/*
         * 주기를 고르기 전에는 뒤 칸을 그리지 않는다 — 요일과 날짜 중 무엇을 물을지가 주기에
         * 따라 갈리므로, 미리 둘 다 보여 주면 쓰지 않을 칸이 함께 서 있게 된다.
         */}
        {parts.period === "weekly" && (
          <Select
            value={parts.weekday}
            onChange={(v) => setPart({ weekday: v })}
            aria-label="요일"
            className="w-[92px]"
          >
            <option value="">요일</option>
            {WEEKDAYS.map((w) => (
              <option key={w} value={w}>
                {w}요일
              </option>
            ))}
          </Select>
        )}

        {parts.period === "monthly" && (
          <Select
            value={parts.day}
            onChange={(v) => setPart({ day: v })}
            aria-label="날짜"
            className="w-[92px]"
          >
            <option value="">날짜</option>
            {MONTH_DAYS.map((d) => (
              <option key={d} value={d}>
                {d}일
              </option>
            ))}
          </Select>
        )}

        {parts.period !== "" && (
          <>
            <Select
              value={parts.hour}
              onChange={(v) => setPart({ hour: v })}
              aria-label="시"
              className="w-[80px]"
            >
              <option value="">시</option>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h}시
                </option>
              ))}
            </Select>
            <Select
              value={parts.minute}
              onChange={(v) => setPart({ minute: v })}
              aria-label="분"
              className="w-[80px]"
            >
              <option value="">분</option>
              {/*
               * `0분`이 아니라 `00분`이다 — 옆 칸이 `19시`이고 저장될 문장도 `19:00`이라,
               * 한 자리로 두면 고른 값과 저장될 값이 다르게 읽힌다.
               */}
              {MINUTES.map((m) => (
                <option key={m} value={m}>
                  {m.padStart(2, "0")}분
                </option>
              ))}
            </Select>
          </>
        )}
      </div>

      {/*
       * 만들어질 문장을 그대로 보여 준다 — 이 값이 활동 상세의 '일정' 행에 그대로 실리므로,
       * 고른 사람이 저장될 문장을 미리 읽을 수 있어야 한다. 아직 덜 골랐으면 무엇이 남았는지
       * 대신 알린다(비어 있는 칸을 찾아 눈으로 훑게 하지 않는다).
       */}
      <div className="mt-[10px] text-[12.5px] text-n500">
        {toScheduleText(parts) === ""
          ? "주기 · 요일 · 시각을 모두 고르면 일정이 저장됩니다 — 비워 두어도 됩니다"
          : `저장될 일정: ${toScheduleText(parts)}`}
      </div>

      <button
        type="button"
        onClick={onFreeText}
        className="mt-[8px] cursor-pointer text-[12.5px] text-n400 underline underline-offset-2 hover:text-accent"
      >
        격주처럼 목록에 없는 일정은 직접 입력합니다
      </button>

      {error && <div className="mt-2 text-[13.5px] text-danger">{error}</div>}
    </div>
  );
}

/*
 * lms `shared/ui/field.tsx`에는 `SelectField`가 없다(admin에만 있다). 이 문항 하나가 쓰는
 * 것이라 앱 공용으로 올리지 않고 여기 둔다 — 다른 화면이 드롭다운을 쓰게 되면 그때 옮긴다.
 *
 * 글자 16px은 iOS 자동 확대 방지다(#105) — admin `SelectField`가 같은 이유로 같은 값을 쓴다.
 */
function Select({
  value,
  onChange,
  className,
  children,
  ...rest
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  children: ReactNode;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange" | "className">) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "cursor-pointer rounded-[12px] border border-line bg-surface px-[10px] py-[9px]",
        "text-[16px] text-ink outline-none focus:border-accent lg:text-[15.5px]",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

/** 정기 일정 문항의 `qitemId` — 서버 `ProposalFormSeed.QITEM_SCHEDULE_TEXT`와 같은 값이다 */
export const SCHEDULE_QITEM_ID = "scheduleText";

/*
 * 이 문항을 드롭다운으로 열 것인가 — 못 열면 지금의 자유 입력 그대로 둔다.
 *
 * **문항 라벨 문자열로 맞히지 않는다.** 라벨은 운영진이 화면에서 고칠 수 있는 표시 데이터라
 * 문구가 바뀌면 드롭다운이 조용히 풀린다. 대신 `qitemId`를 본다 — 응답 본문의 key다.
 *
 * 유형도 함께 본다. 운영진이 이 문항을 다른 유형으로 바꿨다면 드롭다운이 만드는 문자열은
 * 더 이상 그 문항의 답이 아니다 — 그때는 `QitemCard`가 그 유형대로 그리게 둔다.
 *
 * 커리큘럼(`MIGRATION_REQUIRED_QITEM_IDS`)과 달리 이 문항은 **서버가 삭제를 막지 않는다** —
 * 운영진이 지우면 문항 자체가 오지 않고, 그때는 이 판정이 불릴 일도 없다.
 */
export function isScheduleQitem(qitem: Qitem): boolean {
  return qitem.qitemId === SCHEDULE_QITEM_ID && qitem.qitemTypeCd === "SHORT_TEXT";
}
