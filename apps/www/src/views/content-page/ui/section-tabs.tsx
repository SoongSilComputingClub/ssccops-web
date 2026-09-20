import Link from "next/link";
import { SECTION_TABS, type SectionAxis, type SectionTab } from "@/shared/config/section-tabs";
import { cn } from "@/shared/lib/cn";

/**
 * 축 안의 탭 줄 — 페이지 제목 아래 (#524).
 *
 * 활동 아카이브의 분류 탭(`views/activities/ui/category-tabs.tsx`)과 같은 모양·같은 판단이다 —
 * **링크**이고 `<nav>` + `aria-current`다. 주소가 바뀌는 이동이라 ARIA 탭이 아니다.
 *
 * `pathname`을 서버 컴포넌트가 넘긴다 — 이 화면은 `usePathname`을 쓸 수 없고(전 화면 서버
 * 컴포넌트), 라우트마다 자기 주소를 알고 있다.
 */
export function SectionTabs({
  axis,
  pathname,
  items,
}: Readonly<{
  axis: SectionAxis;
  /** 지금 화면의 주소 — 켜질 탭을 고른다 */
  pathname: string;
  /** 정적 표 대신 그릴 탭 — 운영진 축이 게시된 대수로 만든다 (#571) */
  items?: readonly SectionTab[];
}>) {
  return (
    <nav aria-label="하위 메뉴" className="flex flex-wrap items-center gap-[7px]">
      {(items ?? SECTION_TABS[axis]).map((tab) => {
        const active = tab.isActive(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-full border px-3 py-[6px] text-[14px] transition-colors",
              active
                ? "border-accent-strong bg-accent-soft text-accent-strong"
                : "border-line text-n400 hover:text-n300",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
