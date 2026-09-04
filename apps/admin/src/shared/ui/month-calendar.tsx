"use client";

import type { BadgeTone } from "./badge";
import { cn } from "@/shared/lib/cn";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 한 칸에 접지 않고 보여줄 최대 건수 — 넘으면 "+N건"으로 접는다 */
const DEFAULT_MAX_PER_DAY = 3;

/*
 * 칸 안의 항목 색. Badge의 톤 이름을 그대로 받되 배지를 그리지는 않는다 — 칸이 좁아
 * 테두리·패딩이 들어간 배지를 넣으면 제목이 한 글자도 안 남는다. 색만 빌려 쓴다.
 */
const EVENT_TONE: Record<string, string> = {
  blue: "bg-accent-soft text-accent-strong",
  amber: "bg-amber-50 text-amber-700",
  grey: "bg-black/5 text-n300",
  red: "bg-red-50 text-red-700",
};
const EVENT_TONE_FALLBACK = "bg-accent-soft text-accent-strong";

export interface MonthCalendarEvent {
  /** 이 달의 며칠 칸에 놓을지 (1-based) */
  day: number;
  title: string;
  /** 없으면 기본 색. 종류를 구별해야 할 때만 준다 */
  tone?: BadgeTone;
  /** 누르면 갈 곳. 없으면 항목은 눌리지 않고 칸 선택만 걸린다 */
  onClick?: () => void;
}

/**
 * 월간 캘린더 그리드.
 *
 * **연·월은 부르는 쪽이 쥔다.** 달 이동 상태를 여기 두면 화면이 "지금 몇 월을 보고 있는가"를
 * 모르게 되어, 그 달에 맞는 데이터를 골라 넘길 수가 없다.
 *
 * 항목 클릭과 칸 클릭은 갈린다 — 항목은 자기 상세로 가고(`onClick`), 빈 곳을 누르면 그 날을
 * 고른다(`onSelectDay`). 항목에서 전파를 끊지 않으면 상세로 가면서 날짜도 함께 바뀐다.
 */
export function MonthCalendar({
  year,
  month, // 0-based
  events,
  selectedDay,
  onSelectDay,
  todayDay = null,
  maxPerDay = DEFAULT_MAX_PER_DAY,
}: {
  year: number;
  month: number;
  events: MonthCalendarEvent[];
  selectedDay: number | null;
  onSelectDay: (day: number) => void;
  /** 이 달에 '오늘'이 있으면 그 일자. 다른 달을 보고 있으면 null */
  todayDay?: number | null;
  maxPerDay?: number;
}) {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // 날짜별로 미리 묶는다 — 칸마다 filter를 돌리면 항목 수 × 칸 수가 된다
  const byDay = new Map<number, MonthCalendarEvent[]>();
  for (const e of events) {
    const bucket = byDay.get(e.day);
    if (bucket) bucket.push(e);
    else byDay.set(e.day, [e]);
  }

  return (
    <div className="grid grid-cols-7 overflow-hidden rounded-[12px] border border-line">
      {WEEKDAYS.map((w) => (
        <div
          key={w}
          className="border-b border-line bg-surface p-2 text-center text-[13.5px] text-n500"
        >
          {w}
        </div>
      ))}
      {cells.map((day, i) => {
        const dayEvents = day ? (byDay.get(day) ?? []) : [];
        const shown = dayEvents.slice(0, maxPerDay);
        const hidden = dayEvents.length - shown.length;
        const selected = day !== null && day === selectedDay;
        const isToday = day !== null && day === todayDay;
        return (
          <div
            key={i}
            onClick={day ? () => onSelectDay(day) : undefined}
            className={cn(
              "min-h-[84px] p-[6px] shadow-[0_0_0_.5px_rgba(0,0,0,.05)]",
              day === null && "bg-black/2",
              day !== null && "cursor-pointer",
              selected && "bg-accent/5 shadow-[inset_0_0_0_1px_#3182f6]",
            )}
          >
            {day !== null && (
              <>
                <div
                  className={cn(
                    "mb-1 text-[13.5px] text-n400",
                    isToday &&
                      "inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-accent px-1 font-semibold text-white",
                  )}
                >
                  {day}
                </div>
                <div className="flex flex-col gap-[3px]">
                  {shown.map((e, j) => (
                    <div
                      key={j}
                      title={e.title}
                      onClick={
                        e.onClick
                          ? (ev) => {
                              // 칸 선택으로 번지면 상세로 가면서 날짜까지 바뀐다
                              ev.stopPropagation();
                              e.onClick?.();
                            }
                          : undefined
                      }
                      className={cn(
                        "overflow-hidden rounded-[3px] px-1 py-[2px] text-[12px] text-ellipsis whitespace-nowrap",
                        EVENT_TONE[e.tone ?? ""] ?? EVENT_TONE_FALLBACK,
                        e.onClick && "cursor-pointer hover:brightness-95",
                      )}
                    >
                      {e.title}
                    </div>
                  ))}
                  {hidden > 0 && (
                    /* 칸이 무한정 늘어나지 않게 접는다. 누르면 그 날이 선택돼 아래 목록에 전부 뜬다 */
                    <div className="px-1 text-[12px] text-n500">+{hidden}건</div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
