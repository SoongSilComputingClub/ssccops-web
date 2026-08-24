import type { ReactNode } from "react";
import { Button } from "./button";
import { cn } from "@/shared/lib/cn";

export function EmptyState({
  message,
  action,
  className,
  padding = "lg",
}: {
  message: ReactNode;
  action?: { label: string; onClick: () => void };
  className?: string;
  padding?: "sm" | "lg";
}) {
  return (
    <div
      className={cn(
        "text-center text-[15px] text-n500",
        padding === "lg" ? "py-[52px]" : "py-6",
        className,
      )}
    >
      <div>{message}</div>
      {action && (
        <Button className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
