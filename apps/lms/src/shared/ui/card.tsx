import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

/** 서피스 카드 — rounded 16px + 1px 링 (어드민과 같은 토큰) */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl bg-surface p-[18px] shadow-[0_0_0_1px_#e5e8eb]", className)}>
      {children}
    </div>
  );
}

/** 값이 비었을 때의 안내 — 목록이 비었을 때와 조회가 실패했을 때 모두 이 모양으로 그린다 */
export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <Card className="flex flex-col items-center gap-[6px] px-[18px] py-[52px] text-center">
      <div className="text-[15px] text-n300">{title}</div>
      {description && <div className="text-[13.5px] text-n500">{description}</div>}
    </Card>
  );
}
