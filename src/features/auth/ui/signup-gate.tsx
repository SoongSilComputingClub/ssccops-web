"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ROUTES } from "@/shared/config/routes";
import { safeNextPath } from "@/shared/lib/next-path";
import { useAuthBootstrap } from "../model/use-auth-bootstrap";
import { BootstrapError, BootstrapPending } from "./bootstrap-fallback";

/**
 * 가입 화면 게이트 — "인증됨 + 미가입"에게만 children을 연다.
 *
 * 미인증은 미들웨어가 /login으로 보내고, 이미 가입한 사용자는 여기서 비켜 세운다.
 * 가입 화면이 세션을 직접 조회하므로 새로고침해도 인증 정보가 유실되지 않는다
 * (예전에는 zustand의 pendingAuthUser에 의존해 새로고침하면 로그인으로 튕겼다).
 *
 * 이미 가입한 사용자를 되돌릴 때도 `?next=` 를 존중한다 — 뒤로가기로 가입 화면에 다시
 * 들어온 경우까지 대시보드로 밀어 버리면, 원래 열려던 폼으로 가는 길이 끊긴다.
 */
export function SignupGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, errorMessage, retry } = useAuthBootstrap();

  useEffect(() => {
    if (status === "ready") {
      router.replace(safeNextPath(searchParams.get("next"), ROUTES.dashboard));
    }
  }, [status, router, searchParams]);

  if (status === "error") return <BootstrapError message={errorMessage} onRetry={retry} />;
  if (status !== "signup-required") return <BootstrapPending />;

  return <>{children}</>;
}
