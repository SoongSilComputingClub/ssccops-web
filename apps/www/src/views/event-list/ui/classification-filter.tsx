import Link from "next/link";
import type { EventClassification } from "@/entities/event";
import { cn } from "@/shared/lib/cn";
import { eventsPath } from "@/shared/config/routes";

/**
 * 분류 필터 칩.
 *
 * **버튼이 아니라 링크다.** 고른 분류가 주소에 남아야 공유·뒤로 가기가 말이 되고, 링크로
 * 두면 이 화면 전체가 서버 컴포넌트로 남아 자바스크립트 없이도 필터가 동작한다(공개 앱이라
 * 첫 화면이 빨리 뜨는 편이 낫다).
 */
export function ClassificationFilter({
  classifications,
  selected,
}: {
  classifications: EventClassification[];
  /** 지금 고른 분류 코드 — 없으면 '전체' */
  selected: string | null;
}) {
  // 분류가 하나뿐이면 고를 것이 없다 — '전체'와 그 하나가 언제나 같은 목록을 보여 준다
  if (classifications.length < 2) return null;

  return (
    <div className="flex flex-wrap items-center gap-[7px]">
      <FilterChip href={eventsPath()} active={selected === null}>
        전체
      </FilterChip>
      {classifications.map((classification) => (
        <FilterChip
          key={classification.eventClsfCd}
          href={eventsPath(classification.eventClsfCd)}
          active={selected === classification.eventClsfCd}
        >
          {classification.eventClsfNm}
        </FilterChip>
      ))}
    </div>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
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
