"use client";

import { Button } from "@/shared/ui";

/** 세션 조회 중 — 게이트가 children 렌더링을 보류하는 동안의 자리 표시 */
export function BootstrapPending() {
  return (
    <div className="flex h-full flex-1 items-center justify-center text-[14.5px] text-n400">
      불러오는 중…
    </div>
  );
}

/*
 * 세션 조회 실패 화면.
 *
 * 예전에는 조회 체인에 .catch()가 없어 실패하면 "불러오는 중…"이 영원히 남았다.
 * 백엔드가 꺼져 있는 것과 로딩이 느린 것을 사용자가 구분할 수 있어야 한다.
 */
export function BootstrapError({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="text-[16px] font-medium">세션을 불러오지 못했습니다</div>
      <div className="max-w-[420px] text-[14px] leading-[1.6] text-n400">
        {message ?? "잠시 후 다시 시도해주세요"}
      </div>
      <Button className="mt-1" onClick={onRetry}>
        다시 시도
      </Button>
    </div>
  );
}
