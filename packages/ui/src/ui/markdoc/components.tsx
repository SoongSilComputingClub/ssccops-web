import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/*
 * 레이아웃 태그 5종이 그려지는 모양 (ADR-0039). 스키마(`schema.ts`)의 transform이 제목에서 잘라
 * 넘긴 것을 받는다 — 여기에는 자르는 논리가 없고 모양만 있다.
 *
 * 링크가 아니다. 카드·항목 안에 링크가 있으면 그 링크만 링크다(중첩 인터랙티브 요소를 만들지 않는다).
 */

export function Callout({ tone = "info", children }: Readonly<{ tone?: string; children?: ReactNode }>) {
  return (
    <div
      className={cn(
        "markdoc-callout my-[12px] rounded-[12px] px-[14px] py-[10px] text-[14px] text-ink",
        tone === "warn" ? "bg-amber-soft" : "bg-accent-soft",
      )}
    >
      {children}
    </div>
  );
}

export function Cards({ columns = 3, children }: Readonly<{ columns?: number; children?: ReactNode }>) {
  return (
    <div
      className={cn(
        "my-[12px] grid gap-[12px] sm:grid-cols-2",
        columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2",
      )}
    >
      {children}
    </div>
  );
}

export function Card({
  index,
  title,
  children,
}: Readonly<{ index: number; title: string; children?: ReactNode }>) {
  return (
    <div className="markdoc-card flex flex-col gap-[4px] rounded-2xl bg-bg px-[18px] py-[16px]">
      <span className="text-[12.5px] font-semibold tracking-[.4px] text-accent-strong">
        {String(index).padStart(2, "0")}
      </span>
      <h3 className="text-[18px] font-semibold tracking-[-.2px]">{title}</h3>
      {children}
    </div>
  );
}

export function Faq({ children }: Readonly<{ children?: ReactNode }>) {
  return <div className="my-[12px] flex flex-col divide-y divide-line">{children}</div>;
}

/** `<details>` — JS 없이 여닫히고 접근성 트리에 그대로 실린다 */
export function FaqItem({ question, children }: Readonly<{ question: string; children?: ReactNode }>) {
  return (
    <details className="group py-[4px]">
      <summary className="flex cursor-pointer list-none items-start gap-[12px] py-[10px] [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden
          className="mt-[1px] flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[7px] bg-accent-soft text-[12.5px] font-semibold text-accent-strong"
        >
          Q
        </span>
        <span className="flex-1 text-[15.5px] font-medium leading-[1.55]">{question}</span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="mt-[4px] h-[16px] w-[16px] shrink-0 text-n500 transition-transform group-open:rotate-180"
        >
          <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </summary>
      <div className="markdoc-answer pb-[12px] pl-[36px] text-[14.5px]">{children}</div>
    </details>
  );
}

export function Steps({ children }: Readonly<{ children?: ReactNode }>) {
  return <ol className="my-[12px] flex list-none flex-col pl-0">{children}</ol>;
}

/** 번호 원과 다음 단계로 이어지는 세로선 — 마지막 단계는 선이 없다 */
export function Step({ index, children }: Readonly<{ index: number; children?: ReactNode }>) {
  return (
    <li className="group relative pb-[16px] pl-[40px] text-[15px] leading-[1.75] last:pb-0">
      <span
        aria-hidden
        className="absolute left-0 top-0 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-accent text-[13px] font-semibold text-white"
      >
        {index}
      </span>
      <span
        aria-hidden
        className="absolute bottom-0 left-[12px] top-[30px] w-[2px] bg-line-strong group-last:hidden"
      />
      {children}
    </li>
  );
}

export function Timeline({ children }: Readonly<{ children?: ReactNode }>) {
  return <div className="my-[8px] flex flex-col">{children}</div>;
}

/** 연도 제목 왼쪽에 accent 점 — 아래 목록의 세로선은 스키마가 목록 노드에 단다 */
export function TimelineEntry({ title, children }: Readonly<{ title: string; children?: ReactNode }>) {
  return (
    <section className="py-[6px]">
      <h3 className="relative ml-[30px] text-[19px] font-semibold tracking-[-.2px] text-accent-strong">
        <span
          aria-hidden
          className="absolute -left-[30px] top-[0.45em] h-[12px] w-[12px] rounded-full bg-accent shadow-[0_0_0_3px_var(--color-accent-soft)]"
        />
        {title}
      </h3>
      {children}
    </section>
  );
}

export const MARKDOC_COMPONENTS = {
  Callout,
  Cards,
  Card,
  Faq,
  FaqItem,
  Steps,
  Step,
  Timeline,
  TimelineEntry,
};
