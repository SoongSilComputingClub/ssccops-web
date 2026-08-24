import { cn } from "@/shared/lib/cn";

/** 5px 진행률 바 — danger=지연 시 #d63a46 */
export function ProgressBar({
  value,
  danger,
  className,
  height = 5,
}: {
  value: number;
  danger?: boolean;
  className?: string;
  height?: number;
}) {
  return (
    <div
      className={cn("flex-1 overflow-hidden rounded-full bg-line", className)}
      style={{ height }}
    >
      <div
        className={cn("h-full rounded-full", danger ? "bg-danger-strong" : "bg-accent")}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
