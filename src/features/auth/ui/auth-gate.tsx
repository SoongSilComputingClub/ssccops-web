"use client";

import type { ReactNode } from "react";
import { useAuthBootstrap } from "../model/use-auth-bootstrap";

/** 관리자 라우트 진입 시 Supabase 인증 ↔ Member 연결이 끝날 때까지 children 렌더링을 보류한다 */
export function AuthGate({ children }: { children: ReactNode }) {
  const status = useAuthBootstrap();

  if (status !== "ready") {
    return (
      <div className="flex h-full flex-1 items-center justify-center text-[14.5px] text-n400">
        불러오는 중…
      </div>
    );
  }

  return <>{children}</>;
}
