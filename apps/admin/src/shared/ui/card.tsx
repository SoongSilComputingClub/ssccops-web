import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

/** 서피스 카드 — rounded 16px + 1px 링 */
export function Card({
  className,
  children,
  onClick,
  id,
}: {
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  /** 목록에서 특정 카드로 스크롤·강조할 때만 필요하다(승인함의 대시보드 딥링크 등) */
  id?: string;
}) {
  return (
    <div
      id={id}
      onClick={onClick}
      className={cn(
        "rounded-2xl bg-surface p-[18px] shadow-[0_0_0_1px_#e5e8eb]",
        onClick && "cursor-pointer transition-shadow hover:shadow-[0_0_0_1px_#1b64da]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** 카드 내부 섹션 제목 (18px 헤딩) */
export function CardTitle({
  children,
  right,
  className,
}: {
  children: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-[14px] flex items-baseline gap-[10px]", className)}>
      <div className="text-[18px] font-medium">{children}</div>
      <div className="flex-1" />
      {right}
    </div>
  );
}

/** 섹션 라벨 (13-14px, 자간 있는 회색 캡션) */
export function SectionLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("text-[13px] tracking-[.3px] text-n400", className)}>
      {children}
    </div>
  );
}
