import Link from "next/link";
import { cn } from "@/shared/lib/cn";

/**
 * 필터 줄의 알약 링크 — 분류 칩과 보기 전환이 같은 모양을 쓴다 (#573).
 *
 * `views/event-list/ui/classification-filter.tsx`에 있던 것을 파일로 뺐다. 버튼이 아니라 링크인
 * 이유는 그쪽 주석에 있다.
 */
export function FilterChip({
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
