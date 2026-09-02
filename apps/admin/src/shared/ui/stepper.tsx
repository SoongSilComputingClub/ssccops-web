import { cn } from "@/shared/lib/cn";

/** 숫자 원형 스테퍼 — 하위 업무 단계 (기획·진행·검토·완료) */
export function CircleStepper({
  steps,
  current,
  className,
}: {
  steps: readonly string[];
  current: number; // 1-based
  className?: string;
}) {
  return (
    <div className={cn("flex justify-between px-10", className)}>
      {steps.map((label, i) => {
        const num = i + 1;
        const done = num < current;
        const active = num === current;
        return (
          <div key={label} className="flex flex-1 flex-col items-center">
            <div
              className={cn(
                "flex size-[30px] items-center justify-center rounded-full text-[14px]",
                done && "bg-accent-strong text-white",
                active && "bg-accent font-semibold text-white",
                !done && !active && "text-n500 shadow-[inset_0_0_0_1px_#e5e8eb]",
              )}
            >
              {done ? "✓" : num}
            </div>
            <div
              className={cn(
                "mt-[7px] text-[13.5px]",
                active ? "font-semibold text-accent" : "text-n500",
              )}
            >
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 바 스테퍼 — CSV 이관 4단계 */
export function BarStepper({
  steps,
  current,
  className,
}: {
  steps: readonly string[];
  current: number; // 1-based
  className?: string;
}) {
  return (
    <div className={cn("grid max-w-[640px] gap-2", className)} style={{ gridTemplateColumns: `repeat(${steps.length},1fr)` }}>
      {steps.map((label, i) => (
        <div key={label}>
          <div
            className={cn(
              "h-[3px] rounded-full",
              i < current ? "bg-accent" : "bg-line",
            )}
          />
          <div
            className={cn(
              "mt-[6px] text-[12.5px]",
              i + 1 === current ? "font-semibold text-accent" : "text-n500",
            )}
          >
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
