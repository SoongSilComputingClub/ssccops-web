"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/shared/config/routes";
import { useAuthBootstrap } from "../model/use-auth-bootstrap";
import { BootstrapError, BootstrapPending } from "./bootstrap-fallback";

/**
 * 보호 라우트 게이트 — 가입까지 끝난 회원에게만 children을 연다.
 *
 * 미인증은 미들웨어가 이미 /login으로 걸러 주므로 여기서는 "인증됨 + 미가입"만 가른다.
 * 가입 여부는 서버 세션 조회가 있어야 알 수 있고, 그 조회를 미들웨어에 두면 모든 요청마다
 * 백엔드 왕복이 하나씩 붙는다 — 그래서 이 판정만 클라이언트에 남겼다.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status, errorMessage, retry } = useAuthBootstrap();

  useEffect(() => {
    if (status === "signup-required") router.replace(ROUTES.signup);
  }, [status, router]);

  if (status === "error") return <BootstrapError message={errorMessage} onRetry={retry} />;
  if (status !== "ready") return <BootstrapPending />;

  return <>{children}</>;
}
