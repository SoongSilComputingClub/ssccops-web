"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/shared/config/routes";
import { useAuthBootstrap } from "../model/use-auth-bootstrap";
import { BootstrapError, BootstrapPending } from "./bootstrap-fallback";

/**
 * 가입 화면 게이트 — "인증됨 + 미가입"에게만 children을 연다.
 *
 * 미인증은 미들웨어가 /login으로 보내고, 이미 가입한 사용자는 여기서 대시보드로 되돌린다.
 * 가입 화면이 세션을 직접 조회하므로 새로고침해도 인증 정보가 유실되지 않는다
 * (예전에는 zustand의 pendingAuthUser에 의존해 새로고침하면 로그인으로 튕겼다).
 */
export function SignupGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status, errorMessage, retry } = useAuthBootstrap();

  useEffect(() => {
    if (status === "ready") router.replace(ROUTES.dashboard);
  }, [status, router]);

  if (status === "error") return <BootstrapError message={errorMessage} onRetry={retry} />;
  if (status !== "signup-required") return <BootstrapPending />;

  return <>{children}</>;
}
