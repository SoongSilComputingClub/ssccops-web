import { cn } from "../lib/cn";

/*
 * 메뉴 묶음 아이콘 — 지금은 이모지 한 글자다 (ssccops#462 · ssccops-web#635).
 *
 * SVG(Lucide)를 권했지만 사용자가 이모지를 택했다(2026-09-22). 이모지는 OS마다 그림체가 다르고
 * 테마 색을 따르지 않는다 — 그래서 목차·레일·전체 메뉴가 이모지를 직접 찍지 않고 **이 컴포넌트
 * 한 곳**을 거친다. 나중에 SVG로 바꾸면 `emoji` 값을 아이콘 이름으로 보고 여기서 그리면 되고,
 * 부르는 쪽은 그대로다.
 *
 * - `aria-hidden` — 그림일 뿐이고 이름은 옆의 묶음명이 든다. 보조기기가 «클립보드»라고 읽지 않게.
 * - **고정 상자 22px** — 이모지는 글꼴마다 폭이 달라(Segoe 1.2em · Apple 1em) 글자로 두면 묶음마다
 *   라벨의 시작점이 어긋난다. 상자로 잘라 정렬을 맞춘다.
 * - 이모지 글꼴 스택을 명시한다 — Pretendard가 먼저 잡으면 흑백 글리프나 두부(□)가 나온다.
 */
const EMOJI_FONT_STACK =
  '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif';

export function GroupIcon({
  emoji,
  size = 22,
  className,
}: Readonly<{
  emoji: string;
  /** 상자 한 변 px — 목차·레일 22, 전체 메뉴 카드 제목 26 */
  size?: number;
  className?: string;
}>) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex flex-none items-center justify-center leading-none select-none", className)}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.72),
        fontFamily: EMOJI_FONT_STACK,
      }}
    >
      {emoji}
    </span>
  );
}
