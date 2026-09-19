import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { Card, Markdown } from "@/shared/ui";
import { type ContentSection, splitSections } from "../model/sections";

/**
 * 페이지 본문 레이아웃 프리셋 — 라우트가 고른다(`content-slugs.ts`의 표와 같은 자리에 적는다).
 *
 * | 프리셋 | 절(`##`)을 | 쓰는 곳 |
 * |---|---|---|
 * | `prose` | 카드 안에 차례로. `###` 소절이 둘 이상이면 타일 격자 | 소개 · 운영진 · 지난 모집 |
 * | `steps` | `prose` + 번호 목록(`1.`)을 단계 원으로 | 지원 안내 |
 * | `cards` | 절마다 카드 하나, 격자(번호 · 제목 · 본문). 헤딩 없는 절은 격자 아래 문단 | 핵심 가치 |
 * | `faq` | 절마다 접이식 `<details>` — 헤딩이 질문, 본문이 답 | 자주 묻는 질문 |
 * | `legal` | 카드 위에 목차, 절마다 앵커 | 처리방침 · 사진 게재 안내 · 약관 |
 * | `timeline` | 연도 헤딩 왼쪽에 점, 목록 왼쪽에 세로선(`.content-timeline` CSS) | 연혁 |
 *
 * 어느 프리셋이든 **본문이 어떤 모양이어도 그려진다** — 절이 없으면 통째로 한 절이고, 소절이
 * 하나뿐이면 타일이 아니라 소제목이다. 프리셋이 기대하는 구조가 아니어도 깨지지 않고 `prose`에
 * 가까운 모양으로 떨어진다(홍보국이 글을 고쳐 써도 화면이 빈 채로 남지 않는다).
 */
export type ContentLayout = "prose" | "steps" | "cards" | "faq" | "legal" | "timeline";

const SECTION_ID = (index: number) => `s${index + 1}`;

export function ContentBody({
  mtxt,
  layout,
}: Readonly<{
  mtxt: string;
  layout: ContentLayout;
}>) {
  const { lede, sections } = splitSections(mtxt);

  return (
    <div className="content-prose flex flex-col gap-[14px]">
      {lede && (
        <div className="content-lede px-[2px]">
          <Markdown>{lede}</Markdown>
        </div>
      )}
      {sections.length === 0 ? null : layout === "cards" ? (
        <CardsLayout sections={sections} />
      ) : layout === "faq" ? (
        <FaqLayout sections={sections} />
      ) : layout === "timeline" ? (
        <TimelineLayout sections={sections} />
      ) : (
        <ProseLayout sections={sections} steps={layout === "steps"} toc={layout === "legal"} />
      )}
    </div>
  );
}

/** 본문 카드 — 모든 프리셋이 같은 여백을 쓴다 */
function BodyCard({ className, children }: Readonly<{ className?: string; children: ReactNode }>) {
  return (
    <Card className={cn("px-[18px] py-[6px] lg:px-[26px] lg:py-[10px]", className)}>{children}</Card>
  );
}

function SectionHeading({
  id,
  children,
  className,
}: Readonly<{ id?: string; children: string; className?: string }>) {
  return (
    <h2
      id={id}
      className={cn("scroll-mt-[80px] text-[19px] font-semibold tracking-[-.2px]", className)}
    >
      {children}
    </h2>
  );
}

/**
 * `###` 소절 — 둘 이상이면 타일 격자(소개의 «무엇을 하나» 넷), 하나면 소제목 하나.
 * 타일은 배경색 상자 하나에 제목·본문이고, 링크가 아니다.
 */
function Subsections({ children }: Readonly<{ children: ContentSection[] }>) {
  if (children.length === 0) return null;
  if (children.length === 1) {
    const [only] = children;
    return (
      <div className="mt-[10px]">
        {only.heading && <h3 className="text-[16px] font-semibold">{only.heading}</h3>}
        {only.body && <Markdown>{only.body}</Markdown>}
      </div>
    );
  }
  return (
    <div className="mt-[12px] grid gap-[10px] sm:grid-cols-2">
      {children.map((sub, i) => (
        <div key={i} className="content-tile rounded-xl bg-bg px-[16px] py-[14px]">
          {sub.heading && <h3 className="text-[15.5px] font-semibold">{sub.heading}</h3>}
          {sub.body && <Markdown>{sub.body}</Markdown>}
        </div>
      ))}
    </div>
  );
}

/** `prose` · `steps` · `legal` — 절이 카드 안에 차례로. 절 사이는 하늘선 */
function ProseLayout({
  sections,
  steps,
  toc,
}: Readonly<{ sections: ContentSection[]; steps: boolean; toc: boolean }>) {
  const headed = sections.filter((s) => s.heading);
  return (
    <>
      {toc && headed.length >= 3 && (
        <nav aria-label="목차" className="rounded-xl bg-surface px-[18px] py-[12px] lg:px-[26px]">
          <ol className="flex flex-wrap gap-x-[14px] gap-y-[4px] text-[13.5px] text-n400">
            {sections.map((s, i) =>
              s.heading ? (
                <li key={i}>
                  <a href={`#${SECTION_ID(i)}`} className="hover:text-accent-strong">
                    {s.heading}
                  </a>
                </li>
              ) : null,
            )}
          </ol>
        </nav>
      )}
      <BodyCard className={cn(steps && "content-steps")}>
        {sections.map((s, i) => (
          <section
            key={i}
            className={cn("py-[16px] lg:py-[18px]", i > 0 && "border-t border-line")}
          >
            {s.heading && <SectionHeading id={toc ? SECTION_ID(i) : undefined}>{s.heading}</SectionHeading>}
            {s.body && <Markdown>{s.body}</Markdown>}
            <Subsections>{s.children}</Subsections>
          </section>
        ))}
      </BodyCard>
    </>
  );
}

/**
 * `cards` — 절마다 카드, `sm` 이상 3열. 번호는 절의 차례(`01`)이고 본문의 값이 아니다.
 * 헤딩 없는 절은 자리 그대로 — 첫 카드 앞이면 격자 위에, 뒤면 아래에 문단으로.
 */
function CardsLayout({ sections }: Readonly<{ sections: ContentSection[] }>) {
  const firstCard = sections.findIndex((s) => s.heading);
  const cards = sections.filter((s) => s.heading);
  const before = sections.slice(0, Math.max(firstCard, 0)).filter((s) => s.body);
  const after = sections.slice(firstCard + 1).filter((s) => !s.heading && s.body);
  const note = (s: ContentSection, i: number) => (
    <div key={i} className="content-note px-[2px]">
      <Markdown>{s.body}</Markdown>
    </div>
  );
  return (
    <>
      {before.map(note)}
      <div className="grid gap-[12px] sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((s, i) => (
          <Card key={i} className="flex flex-col gap-[6px] px-[20px] py-[20px]">
            <span className="text-[12.5px] font-semibold tracking-[.4px] text-accent-strong">
              {String(i + 1).padStart(2, "0")}
            </span>
            <SectionHeading className="text-[20px]">{s.heading ?? ""}</SectionHeading>
            {s.body && <Markdown>{s.body}</Markdown>}
            <Subsections>{s.children}</Subsections>
          </Card>
        ))}
      </div>
      {after.map(note)}
    </>
  );
}

/**
 * `faq` — 절마다 `<details>`. JS 없이 여닫히고 접근성 트리에 그대로 실린다. `##` 아래 `###`가
 * 있으면 질문으로 펼쳐 같은 줄에 세운다(FAQ는 보통 `###`만으로 쓴다).
 */
function FaqLayout({ sections }: Readonly<{ sections: ContentSection[] }>) {
  const items = sections.flatMap((s) => [s, ...s.children]).filter((s) => s.heading || s.body);
  return (
    <BodyCard className="py-0 lg:py-0">
      {items.map((s, i) => (
        <details key={i} className={cn("group py-[4px]", i > 0 && "border-t border-line")}>
          <summary className="flex cursor-pointer list-none items-start gap-[12px] py-[12px] [&::-webkit-details-marker]:hidden">
            <span
              aria-hidden
              className="mt-[1px] flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[7px] bg-accent-soft text-[12.5px] font-semibold text-accent-strong"
            >
              Q
            </span>
            <span className="flex-1 text-[15.5px] font-medium leading-[1.55]">{s.heading}</span>
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              className="mt-[4px] h-[16px] w-[16px] shrink-0 text-n500 transition-transform group-open:rotate-180"
            >
              <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </summary>
          {s.body && (
            <div className="content-answer pb-[14px] pl-[36px]">
              <Markdown>{s.body}</Markdown>
            </div>
          )}
        </details>
      ))}
    </BodyCard>
  );
}

/** `timeline` — 연도 헤딩 + 목록. 모양은 `globals.css` `.content-timeline` */
function TimelineLayout({ sections }: Readonly<{ sections: ContentSection[] }>) {
  return (
    <BodyCard className="content-timeline py-[14px] lg:py-[18px]">
      {sections.map((s, i) => (
        <section key={i} className="tl-section">
          {s.heading && <SectionHeading className="tl-year">{s.heading}</SectionHeading>}
          <div className="tl-body">
            {s.body && <Markdown>{s.body}</Markdown>}
            <Subsections>{s.children}</Subsections>
          </div>
        </section>
      ))}
    </BodyCard>
  );
}
