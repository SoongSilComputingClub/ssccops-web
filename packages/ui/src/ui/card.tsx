import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { onKeyActivate } from "../lib/key-activate";

/*
 * 서피스 카드 — 세 앱이 함께 쓴다 (ssccops#243).
 *
 * www·lms에 같은 사본이 있었고 admin 것이 자라 있었다(`onClick`·`id`·`CardTitle`·
 * `SectionLabel`). 자란 쪽을 올린다 — 늘어난 prop은 전부 선택이라 좁은 쪽 호출부가 그대로
 * 돈다.
 *
 * **`EmptyState`는 올리지 않았다.** www·lms는 이 파일 안에 두고 `title`+`description`을
 * 카드 안에 그리는데, admin은 별도 파일에서 `message`+`action` 버튼을 맨 div로 그린다.
 * 이름만 같고 **API도 모양도 다른 컴포넌트**라 합치면 한쪽 화면이 바뀐다 — 이 작업은
 * 겉모습을 바꾸지 않는다.
 *
 * **`onClick`이 있을 때만 `role="button"`·`tabIndex`가 붙는다** (ssccops-web#403). 카드 안에
 * 버튼·링크가 흔히 들어 있어 `<button>`으로 바꾸면 중첩이 되므로 role 방식이다. 누를 수 없는
 * 카드가 Tab에 잡히면 키보드 사용자에게는 없던 정거장이 하나 늘어나는 것이라 조건부로 둔다.
 */

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
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? onKeyActivate(onClick) : undefined}
      className={cn(
        "rounded-2xl bg-surface p-[18px] shadow-[0_0_0_1px_var(--color-line)]",
        onClick &&
          "cursor-pointer transition-shadow hover:shadow-[0_0_0_1px_var(--color-accent-strong)]",
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
  return <div className={cn("text-[13px] tracking-[.3px] text-n400", className)}>{children}</div>;
}
