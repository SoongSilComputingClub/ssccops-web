/*
 * 정기 일정 입력 보조의 직렬화·역직렬화 (#349).
 *
 * ── 커리큘럼(#342)과 갈리는 지점 ────────────────────────────
 * 옆 파일 `curriculum-rows.ts`와 모양이 닮았지만 **맞춰야 할 서버 형식이 없다.** 커리큘럼은
 * 승인 시점에 서버가 회차로 구조화하지만(`ProposalCurriculumParser`), 정기 일정은 활동으로
 * 옮겨질 때 `acdm_actv.schdl_cn`에 **문자열 그대로 복사되어 화면에 그대로 보일 뿐이다.**
 * 파싱하는 쪽이 없으므로 이 파일이 형식을 처음 정한다.
 *
 * 그래서 고른 형식이 `매주 화요일 19:00`이다 — 문항 라벨의 예시(`(예: 매주 화요일 19:00)`)와
 * 같은 모양이다. 이미 그렇게 적어 온 사람의 값과 새로 고른 값이 같아야 이번 변경이 표기를
 * 흔드는 것이 아니라 **모으는 것**이 된다.
 *
 * ── 저장 값은 사람이 읽는 문장이다 ──────────────────────────
 * 이 문자열은 활동 상세의 '일정' 행에 그대로 실린다(admin `academic-program-detail-page.tsx`).
 * 기계가 되읽을 값이 아니므로 `WEEKLY|TUE|19:00` 같은 코드 표기를 쓰지 않는다 — 그렇게 두면
 * 운영진 화면에 코드가 그대로 보인다.
 *
 * ── 선택 문항이다 ───────────────────────────────────────────
 * `scheduleText`는 `reqYn: false`이고 `MIGRATION_REQUIRED_QITEM_IDS`에도 없다 — 비어 있어도
 * 승인이 성립한다. 그래서 "아무것도 고르지 않음"이 유효한 상태이고, 그때 저장 값은 빈
 * 문자열이다. 드롭다운에 기본값을 미리 골라 두면 일정이 없는 활동에도 값이 들어간다.
 */

/** 주기 — 매주는 요일로, 매월은 날짜로 받는다 */
export type SchedulePeriod = "weekly" | "monthly";

/**
 * 드롭다운이 함께 만드는 한 벌의 값.
 *
 * 빈 문자열은 "고르지 않음"이다. `period`까지 비어 있으면 문항 전체가 빈 답이 된다.
 */
export interface ScheduleParts {
  period: SchedulePeriod | "";
  /** 매주일 때의 요일 — `요일` 접미사를 뺀 한 글자(`화`) */
  weekday: string;
  /** 매월일 때의 날짜 — `1`~`31` */
  day: string;
  /** 시 — `0`~`23` */
  hour: string;
  /** 분 — 5분 단위 `0`·`5`·…·`55` */
  minute: string;
}

export const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;

/** 분은 5분 단위로 끊는다 — 60개를 늘어놓으면 고르는 것이 손으로 치는 것보다 느리다 */
export const MINUTE_STEP = 5;

export const HOURS = Array.from({ length: 24 }, (_, i) => String(i));
export const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => String(i * MINUTE_STEP));
export const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));

export const PERIOD_LABEL: Record<SchedulePeriod, string> = {
  weekly: "매주",
  monthly: "매월",
};

export function emptyScheduleParts(): ScheduleParts {
  return { period: "", weekday: "", day: "", hour: "", minute: "" };
}

/** `9` → `09`. 시각만 두 자리로 맞춘다 — 날짜(`3일`)는 사람이 그렇게 쓰지 않는다 */
function pad2(value: string): string {
  return value.padStart(2, "0");
}

/**
 * 고른 값 → 저장 문자열.
 *
 * **한 칸이라도 비면 빈 문자열이다.** `매주 19:00`처럼 반쪽짜리 문장을 만들지 않는 것은,
 * 그 값이 활동 상세에 그대로 실려 운영진이 요일을 알 수 없는 일정을 보게 되기 때문이다.
 * 고르다 만 상태는 저장할 것이 아직 없는 상태다.
 */
export function toScheduleText(parts: ScheduleParts): string {
  const { period, weekday, day, hour, minute } = parts;
  if (period === "" || hour === "" || minute === "") return "";

  const time = `${pad2(hour)}:${pad2(minute)}`;

  if (period === "weekly") {
    if (weekday === "") return "";
    return `매주 ${weekday}요일 ${time}`;
  }

  if (day === "") return "";
  return `매월 ${day}일 ${time}`;
}

const WEEKLY_PATTERN = /^매주 ([월화수목금토일])요일 (\d{1,2}):(\d{2})$/;
const MONTHLY_PATTERN = /^매월 (\d{1,2})일 (\d{1,2}):(\d{2})$/;

/**
 * 저장 문자열 → 고른 값. **읽지 못하면 null**을 돌려준다.
 *
 * null은 "드롭다운으로 못 연다"는 뜻이고, 화면은 그때 지금까지 쓰던 자유 입력을 그대로 둔다 —
 * 이미 제출된 기획안에는 `매주 화 7시`·`격주 목요일`처럼 이 형식 밖의 값이 들어 있고, 그것을
 * 드롭다운에 억지로 얹으면 제출자가 쓴 내용이 화면에서 사라진다(#342와 같은 퇴화 규칙).
 *
 * 빈 값은 null이 아니라 **빈 한 벌**이다 — 아직 아무것도 안 고른 정상 상태이므로 드롭다운으로
 * 연다.
 *
 * 분이 5분 단위가 아닌 값(`19:03`)도 열지 않는다. 선택지에 없는 값을 드롭다운에 얹으면
 * 브라우저가 첫 선택지를 대신 보여 주고, 사용자가 손대지 않은 사이에 저장 값이 `19:00`으로
 * 바뀐다.
 */
export function toScheduleParts(text: string): ScheduleParts | null {
  const trimmed = text.trim();
  if (trimmed === "") return emptyScheduleParts();

  const weekly = WEEKLY_PATTERN.exec(trimmed);
  if (weekly) {
    const [, weekday, hour, minute] = weekly;
    if (!isSelectableTime(hour!, minute!)) return null;
    return {
      period: "weekly",
      weekday: weekday!,
      day: "",
      hour: String(Number(hour)),
      minute: String(Number(minute)),
    };
  }

  const monthly = MONTHLY_PATTERN.exec(trimmed);
  if (monthly) {
    const [, day, hour, minute] = monthly;
    if (!isSelectableTime(hour!, minute!)) return null;
    if (Number(day) < 1 || Number(day) > 31) return null;
    return {
      period: "monthly",
      weekday: "",
      day: String(Number(day)),
      hour: String(Number(hour)),
      minute: String(Number(minute)),
    };
  }

  return null;
}

/** 드롭다운 선택지로 고를 수 있는 시각인가 — 24시 밖이거나 5분 단위가 아니면 아니다 */
function isSelectableTime(hour: string, minute: string): boolean {
  const h = Number(hour);
  const m = Number(minute);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59 && m % MINUTE_STEP === 0;
}
