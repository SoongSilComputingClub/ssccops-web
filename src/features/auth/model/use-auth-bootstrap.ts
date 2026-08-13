"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMemberStore } from "@/entities/member";
import { useSessionStore } from "@/entities/session";
import { ROUTES } from "@/shared/config/routes";
import { apiFetch } from "@/shared/lib/api/client";
import { createClient } from "@/shared/lib/supabase/client";

/*
 * ssccops-server는 아직 회원 프로필 API가 없지만, 인증된 요청이면 어떤 엔드포인트든
 * Supabase JWT의 sub(UUID)로 회원을 찾고 없으면 즉시 임시회원으로 프로비저닝한다
 * (SupabaseJwtAuthenticationConverter). /actuator/health는 부작용 없는 안전한 엔드포인트라
 * 백엔드 연결 확인 겸 그 프로비저닝을 트리거하는 용도로 임시로 쓴다 — 회원 프로필 API가
 * 생기면 그쪽 호출로 교체한다. 백엔드가 꺼져 있어도 로그인 자체(mock store 기준)는
 * 막지 않도록 실패를 무시한다.
 */
function provisionBackendMember() {
  apiFetch("/actuator/health").catch(() => {});
}

type BootstrapStatus = "pending" | "ready";

/**
 * 관리자 페이지 진입 시 Supabase Auth 사용자를 내부 Member와 연결한다.
 * 연결된 Member가 있으면 세션에 로그인 처리하고, 없으면(최초 로그인) 회원가입으로 보낸다.
 */
export function useAuthBootstrap(): BootstrapStatus {
  const router = useRouter();
  const [status, setStatus] = useState<BootstrapStatus>("pending");
  const login = useSessionStore((s) => s.login);
  const setPendingAuthUser = useSessionStore((s) => s.setPendingAuthUser);
  const members = useMemberStore((s) => s.members);

  useEffect(() => {
    let cancelled = false;

    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (cancelled) return;

        if (!user) {
          router.replace(ROUTES.login);
          return;
        }

        provisionBackendMember();

        const member = members.find((m) => m.authUserId === user.id);
        if (member) {
          login(member.key);
          setStatus("ready");
          return;
        }

        setPendingAuthUser({
          id: user.id,
          email: user.email ?? "",
          name:
            (user.user_metadata?.full_name as string | undefined) ??
            (user.user_metadata?.name as string | undefined),
        });
        router.replace(ROUTES.signup);
      });

    return () => {
      cancelled = true;
    };
  }, [router, login, setPendingAuthUser, members]);

  return status;
}
