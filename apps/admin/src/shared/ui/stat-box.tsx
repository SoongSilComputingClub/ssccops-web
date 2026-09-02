import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

/** 응답 요약 · CSV 검증 통계 박스 */
export function StatBox({
  label,
  value,
  tone = "default",
  size = "md",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: "default" | "accent" | "danger";
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <div className={cn("rounded-[12px] border border-line p-3", className)}>
      <div className="text-[13px] text-n500">{label}</div>
      <div
        className={cn(
          "mt-1 font-medium",
          size === "lg" ? "text-[26px]" : "text-[21px]",
          tone === "accent" && "text-accent",
          tone === "danger" && "text-danger",
        )}
      >
        {value}
      </div>
    </div>
  );
}
