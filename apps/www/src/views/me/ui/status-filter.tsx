import Link from "next/link";
import { meStatusPath } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";

/**
 * 상태 필터 칩 — 내부 페이지의 목록 위 (#574).
 *
 * **버튼이 아니라 링크다** — 행사 목록의 분류 칩(`views/event-list/ui/classification-filter.tsx`)과
 * 같은 판단이다. 고른 상태가 주소(`?status=`)에 남아야 공유·뒤로 가기가 말이 되고, 링크로 두면
 * 페이지가 서버 컴포넌트로 남는다. 거르기는 받아 둔 전량 목록에서 한다 — 서버에 없는 필터
 * 파라미터를 지어내지 않는다(`model/responses.ts`의 `filterByStatus`).
 *
 * 칩은 목록에 실제로 있는 상태만 세운다(`presentStatuses`). 상태가 하나뿐이면 고를 것이
 * 없어 줄을 통째로 뺀다 — '전체'와 그 하나가 언제나 같은 목록이다.
 */
export function StatusFilter({
  basePath,
  options,
  selected,
}: Readonly<{
  /** 이 페이지의 주소 — 칩이 `?status=`를 여기에 붙인다 */
  basePath: string;
  options: readonly { code: string; label: string }[];
  /** 지금 고른 상태 코드 — 없으면 '전체' */
  selected: string | null;
}>) {
  if (options.length < 2) return null;

  return (
    <div className="flex flex-wrap items-center gap-[7px]">
      <FilterChip href={meStatusPath(basePath)} active={selected === null}>
        전체
      </FilterChip>
      {options.map((option) => (
        <FilterChip
          key={option.code}
          href={meStatusPath(basePath, option.code)}
          active={selected === option.code}
        >
          {option.label}
        </FilterChip>
      ))}
    </div>
  );
}

function FilterChip({
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
