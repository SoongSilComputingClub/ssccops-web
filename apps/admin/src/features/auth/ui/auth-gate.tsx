"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/shared/config/routes";
import { currentPath, withNextParam } from "@/shared/lib/next-path";
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
    /*
     * 가입 화면으로 비켜 세울 때 지금 열려 있던 경로를 함께 넘긴다. 공개 폼 링크
     * (/f/{formId})를 받고 들어온 사람은 가입 자체가 목적이 아니라 그 폼에 응답하러 온
     * 것이라, 가입을 마치고 대시보드에 떨어뜨리면 어디로 돌아가야 하는지 알 수 없다.
     */
    if (status === "signup-required") {
      router.replace(withNextParam(ROUTES.signup, currentPath(), ROUTES.dashboard));
    }
  }, [status, router]);

  if (status === "error") return <BootstrapError message={errorMessage} onRetry={retry} />;
  if (status !== "ready") return <BootstrapPending />;

  return <>{children}</>;
}
