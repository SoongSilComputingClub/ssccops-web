import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * 유틸리티 묶음 — 상단 바·사이드바 오른쪽 끝의 `[종] [계정 메뉴]` (ssccops#452 · ssccops-web#614).
 *
 * 둘뿐이다. 테마·다른 앱·설치·내 정보·로그아웃은 전부 계정 메뉴 안이고, 밖에 남는 것은 안 읽은
 * 배지를 열지 않고도 봐야 하는 종 하나다. 앱마다 간격을 따로 적지 않도록 여기서 한 값(6px)으로
 * 못 박는다 — 종은 앱의 `NotificationBell`(라우트·스토어가 앱마다 다르다)이라 슬롯으로 받는다. 세 앱
 * 모두 채웠다(www는 #616) — 종이 없는 앱이 다시 생기면 비워 두면 된다.
 */
export function UtilityCluster({
  bell,
  children,
  className,
}: Readonly<{
  /** 종 — 없으면 비운다 */
  bell?: ReactNode;
  /** 계정 메뉴 */
  children: ReactNode;
  className?: string;
}>) {
  return <div className={cn("flex flex-none items-center gap-[6px]", className)}>{bell}{children}</div>;
}
