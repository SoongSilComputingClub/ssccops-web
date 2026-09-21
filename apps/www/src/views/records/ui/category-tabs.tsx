import Link from "next/link";
import { CONTENT_CATEGORIES } from "@/entities/content";
import { recordsPath } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";

/**
 * 분류 탭 — 전체 · 학술 · 행사 · 뉴스 (#520).
 *
 * **버튼이 아니라 링크다.** 행사 목록의 분류 칩과 같은 이유다 — 고른 분류가 주소에 남아야
 * 공유·뒤로 가기가 말이 되고, 링크로 두면 목록 화면이 서버 컴포넌트로 남는다. 그래서
 * `role="tablist"`가 아니라 `<nav>` + `aria-current`다 — ARIA 탭은 같은 화면 안의 패널을
 * 바꾸는 위젯이고, 주소가 바뀌는 이동은 내비게이션이다(`docs/design-system.md` «탭»).
 */
export function CategoryTabs({ selected }: Readonly<{ selected: string | null }>) {
  return (
    <nav aria-label="분류" className="flex flex-wrap items-center gap-[7px]">
      <Tab href={recordsPath(null)} active={selected === null}>
        전체
      </Tab>
      {CONTENT_CATEGORIES.map((category) => (
        <Tab
          key={category.code}
          href={recordsPath(category.slug)}
          active={selected === category.slug}
        >
          {category.label}
        </Tab>
      ))}
    </nav>
  );
}

function Tab({
  href,
  active,
  children,
}: Readonly<{
  href: string;
  active: boolean;
  children: string;
}>) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "whitespace-nowrap rounded-full border px-3 py-[6px] text-[14px] transition-colors",
        active
          ? "border-accent-strong bg-accent-soft text-accent-strong"
          : "border-line text-n400 hover:text-n300",
      )}
    >
      {children}
    </Link>
  );
}
