"use client";

import { cn } from "@/shared/lib/cn";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export interface MonthCalendarEvent {
  day: number;
  title: string;
}

/** 월간 캘린더 그리드 — 이벤트 필, 날짜 선택 */
export function MonthCalendar({
  year,
  month, // 0-based
  events,
  selectedDay,
  onSelectDay,
}: {
  year: number;
  month: number;
  events: MonthCalendarEvent[];
  selectedDay: number | null;
  onSelectDay: (day: number) => void;
}) {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

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
        const dayEvents = day ? events.filter((e) => e.day === day) : [];
        const selected = day !== null && day === selectedDay;
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
                <div className="mb-1 text-[13.5px] text-n400">{day}</div>
                <div className="flex flex-col gap-[3px]">
                  {dayEvents.map((e, j) => (
                    <div
                      key={j}
                      className="overflow-hidden rounded-[3px] bg-accent-soft px-1 py-[2px] text-[12px] text-ellipsis whitespace-nowrap text-accent-strong"
                    >
                      {e.title}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
