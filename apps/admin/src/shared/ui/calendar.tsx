"use client";

import type { BadgeTone } from "./badge";
import { cn } from "@/shared/lib/cn";

/** 월요일 시작 (한국식). 두 보기가 같은 요일로 시작해야 같은 주가 같은 모양이 된다 */
const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

/** 막대 한 줄의 높이(px). 레인이 깊어질수록 주 줄이 이만큼씩 자란다 */
const LANE_H = 20;

/*
 * 항목 색. Badge의 톤 이름을 빌리되 배지를 그리지는 않는다 — 칸이 좁아 테두리·패딩이 들어간
 * 배지를 넣으면 제목이 한 글자도 안 남는다.
 */
const TONE: Record<string, string> = {
  blue: "bg-accent-soft text-accent-strong",
  amber: "bg-amber-50 text-amber-700",
  grey: "bg-black/5 text-n300",
  red: "bg-red-50 text-red-700",
};
const TONE_FALLBACK = "bg-accent-soft text-accent-strong";

interface Common {
  key: string;
  title: string;
  tone?: BadgeTone;
  /** 누르면 갈 곳. 항목 클릭은 칸 선택으로 번지지 않는다 */
  onClick?: () => void;
}

/**
 * 달력에 놓는 것 두 가지.
 *
 * **막대(span)와 점(point)을 나누는 기준은 "기간이 뜻을 갖는가"다.** 업무는 시작~종료가
 * 곧 그 업무의 수명이라 막대이고, 회의·하위 업무는 그날 하루의 사건이라 점이다. 회의도
 * `endAt`을 갖고 있지만 대개 하루라 한 칸짜리 막대가 점과 구별되지 않는다.
 */
export type CalendarItem =
  | (Common & {
      kind: "span";
      /** "YYYY-MM-DD" */
      start: string;
      /** 없으면 "언제 끝날지 미정" — 보이는 범위 끝까지 열린 막대로 그린다 */
      end: string | null;
    })
  | (Common & { kind: "point"; date: string });

export type CalendarMode = "week" | "month";

/* ── 날짜 셈 — 전부 "YYYY-MM-DD" 문자열로 다룬다 ──────────────────────
 *
 * Date 객체를 돌리지 않는 것은 시간대 때문이다. 서버가 Asia/Seoul 오프셋으로 내려주고
 * 화면도 문자열을 잘라 쓰므로(formatDt), 여기서만 로컬 Date로 바꾸면 자정 근처에서
 * 하루가 어긋난다. 날짜 산술이 필요한 자리에서만 UTC 기준으로 잠깐 바꾼다.
 */
const toUtc = (ymd: string) => Date.parse(`${ymd}T00:00:00Z`);
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const addDays = (ymd: string, n: number) => fromUtc(toUtc(ymd) + n * 86_400_000);
const diffDays = (a: string, b: string) => Math.round((toUtc(b) - toUtc(a)) / 86_400_000);

/** 월요일 시작 주의 첫날 */
function weekStart(ymd: string): string {
  const dow = new Date(toUtc(ymd)).getUTCDay(); // 0=일
  return addDays(ymd, dow === 0 ? -6 : 1 - dow);
}

/** 보고 있는 범위를 주 단위로 쪼갠다 — 월은 5~6줄, 주는 1줄 */
function weeksOf(mode: CalendarMode, anchor: string): string[] {
  if (mode === "week") return [weekStart(anchor)];
  const first = `${anchor.slice(0, 7)}-01`;
  const last = fromUtc(Date.UTC(Number(anchor.slice(0, 4)), Number(anchor.slice(5, 7)), 0));
  const out: string[] = [];
  for (let w = weekStart(first); w <= weekStart(last); w = addDays(w, 7)) out.push(w);
  return out;
}

/**
 * 화면에 실제로 보이는 날짜 범위 [처음, 끝].
 *
 * **부르는 쪽이 이 함수를 함께 쓴다.** 월 보기는 앞뒤 주의 다른 달 날짜까지 그리므로
 * (9월 그리드에 8/31이 있다) 범위를 "1일~말일"로 잡으면 그려지는 것과 세는 것이 갈린다 —
 * 그 칸에 항목이 있어도 안 그려지고, 눌러도 "없습니다"가 뜬다.
 */
export function visibleRange(mode: CalendarMode, anchor: string): [string, string] {
  const weeks = weeksOf(mode, anchor);
  return [weeks[0], addDays(weeks[weeks.length - 1], 6)];
}

/**
 * 한 주에 놓일 막대들에 세로 레인을 매긴다.
 *
 * 먼저 시작한 것을 위에 두고, 그 줄에서 겹치지 않는 다음 막대를 같은 레인에 이어 붙인다.
 * 레인을 나누지 않으면 막대가 서로를 가려 아래 것이 통째로 사라진다.
 */
function assignLanes(bars: { from: number; to: number }[]): number[] {
  const laneEnd: number[] = []; // 레인별 마지막 점유 칸
  return bars.map((b) => {
    let lane = laneEnd.findIndex((end) => end < b.from);
    if (lane === -1) lane = laneEnd.length;
    laneEnd[lane] = b.to;
    return lane;
  });
}

/**
 * 주·월 달력.
 *
 * **보고 있는 범위는 부르는 쪽이 쥔다**(mode + anchor). 이동 상태를 여기 두면 화면이
 * "지금 어디를 보고 있는가"를 모르게 되어 그 범위에 맞는 데이터를 골라 넘길 수가 없다.
 *
 * 한 주가 한 그리드다 — 행은 `날짜 숫자 / 막대 레인 × N / 점 더미`이고, 배경 칸은 전체 행에
 * 걸쳐 깔린다. 막대가 칸을 가로지르므로 칸(day) 단위로는 놓을 자리가 없어 이 모양이 됐다.
 */
export function Calendar({
  mode,
  anchor,
  items,
  today,
  selected,
  onSelect,
  maxPointsPerDay,
}: {
  mode: CalendarMode;
  /** 보고 있는 범위를 정하는 기준일 "YYYY-MM-DD" */
  anchor: string;
  items: CalendarItem[];
  today: string;
  selected: string | null;
  onSelect: (ymd: string) => void;
  /** 한 칸에 접지 않고 보여줄 점의 수. 주 보기는 칸이 높아 넉넉하다 */
  maxPointsPerDay?: number;
}) {
  const weeks = weeksOf(mode, anchor);
  const monthPrefix = anchor.slice(0, 7);
  const maxPoints = maxPointsPerDay ?? (mode === "week" ? 8 : 3);

  const spans = items.filter(
    (i): i is Extract<CalendarItem, { kind: "span" }> => i.kind === "span",
  );
  const points = items.filter(
    (i): i is Extract<CalendarItem, { kind: "point" }> => i.kind === "point",
  );

  return (
    <div className="flex flex-col overflow-hidden rounded-[12px] border border-line">
      <div className="grid grid-cols-7">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="border-b border-line bg-surface p-2 text-center text-[13.5px] text-n500"
          >
            {w}
          </div>
        ))}
      </div>

      {weeks.map((ws) => {
        const we = addDays(ws, 6);

        // 이 주와 겹치는 막대만 남기고 주 안의 칸 번호(0~6)로 자른다
        const bars = spans
          .filter((s) => s.start <= we && (s.end ?? we) >= ws)
          .map((s) => {
            const end = s.end ?? we; // 종료 미정 → 이 주 끝까지 열어 둔다
            return {
              item: s,
              from: Math.max(0, diffDays(ws, s.start)),
              to: Math.min(6, diffDays(ws, end)),
              openStart: s.start < ws,
              openEnd: s.end === null || s.end > we,
            };
          })
          .sort((a, b) => a.from - b.from || b.to - a.to);
        const lanes = assignLanes(bars);
        const laneCount = lanes.length ? Math.max(...lanes) + 1 : 0;

        return (
          <div
            key={ws}
            className="grid grid-cols-7 border-b border-line last:border-b-0"
            style={{
              gridTemplateRows: `auto ${`${LANE_H}px `.repeat(laneCount)}1fr`,
              minHeight: mode === "week" ? 220 : 96,
            }}
          >
            {/* 배경 · 클릭 — 전체 행에 걸쳐 깔고 그 위에 내용을 얹는다 */}
            {Array.from({ length: 7 }, (_, c) => {
              const ymd = addDays(ws, c);
              const outside = mode === "month" && !ymd.startsWith(monthPrefix);
              return (
                <div
                  key={`bg-${c}`}
                  onClick={() => onSelect(ymd)}
                  style={{ gridColumn: c + 1, gridRow: "1 / -1" }}
                  className={cn(
                    "cursor-pointer shadow-[0_0_0_.5px_rgba(0,0,0,.05)]",
                    outside && "bg-black/2",
                    ymd === selected && "bg-accent/5 shadow-[inset_0_0_0_1px_#3182f6]",
                  )}
                />
              );
            })}

            {/* 날짜 숫자 */}
            {Array.from({ length: 7 }, (_, c) => {
              const ymd = addDays(ws, c);
              const outside = mode === "month" && !ymd.startsWith(monthPrefix);
              return (
                <div
                  key={`d-${c}`}
                  style={{ gridColumn: c + 1, gridRow: 1 }}
                  className="pointer-events-none z-10 px-[6px] pt-[6px] pb-1"
                >
                  <span
                    className={cn(
                      "text-[13.5px] text-n400",
                      outside && "text-n500/50",
                      ymd === today &&
                        "inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-accent px-1 font-semibold text-white",
                    )}
                  >
                    {Number(ymd.slice(8, 10))}
                  </span>
                </div>
              );
            })}

            {/* 막대 — 칸을 가로지른다 */}
            {bars.map((b, i) => (
              <div
                key={b.item.key}
                title={b.item.title}
                onClick={
                  b.item.onClick
                    ? (ev) => {
                        // 번지면 상세로 가면서 날짜 선택까지 함께 바뀐다
                        ev.stopPropagation();
                        b.item.onClick?.();
                      }
                    : undefined
                }
                style={{
                  gridColumn: `${b.from + 1} / ${b.to + 2}`,
                  gridRow: lanes[i] + 2,
                }}
                className={cn(
                  "z-10 mx-[3px] flex items-center overflow-hidden px-[5px] text-[12px] whitespace-nowrap",
                  TONE[b.item.tone ?? ""] ?? TONE_FALLBACK,
                  // 잘린 쪽은 모서리를 각지게 둬 이어진다는 것을 보인다
                  b.openStart ? "rounded-l-none" : "rounded-l-[3px]",
                  b.openEnd ? "rounded-r-none" : "rounded-r-[3px]",
                  b.item.onClick && "cursor-pointer hover:brightness-95",
                )}
              >
                {b.openStart && <span className="mr-[3px] opacity-60">‹</span>}
                <span className="min-w-0 flex-1 truncate">{b.item.title}</span>
                {b.openEnd && <span className="ml-[3px] opacity-60">›</span>}
              </div>
            ))}

            {/* 점 — 날짜별로 쌓는다 */}
            {Array.from({ length: 7 }, (_, c) => {
              const ymd = addDays(ws, c);
              const mine = points.filter((p) => p.date === ymd);
              const shown = mine.slice(0, maxPoints);
              const hidden = mine.length - shown.length;
              return (
                <div
                  key={`p-${c}`}
                  style={{ gridColumn: c + 1, gridRow: laneCount + 2 }}
                  className="z-10 flex flex-col gap-[3px] px-[6px] pb-[6px]"
                >
                  {shown.map((p) => (
                    <div
                      key={p.key}
                      title={p.title}
                      onClick={
                        p.onClick
                          ? (ev) => {
                              ev.stopPropagation();
                              p.onClick?.();
                            }
                          : undefined
                      }
                      className={cn(
                        "overflow-hidden rounded-[3px] px-1 py-[2px] text-[12px] text-ellipsis whitespace-nowrap",
                        TONE[p.tone ?? ""] ?? TONE_FALLBACK,
                        p.onClick && "cursor-pointer hover:brightness-95",
                      )}
                    >
                      {p.title}
                    </div>
                  ))}
                  {hidden > 0 && (
                    /* 칸이 무한정 늘어나지 않게 접는다. 날짜를 누르면 아래에 전부 펼쳐진다 */
                    <div className="px-1 text-[12px] text-n500">+{hidden}건</div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
