"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMemberStore } from "@/entities/member";
import { useSessionStore } from "@/entities/session";
import { ROUTES } from "@/shared/config/routes";
import { createClient } from "@/shared/lib/supabase/client";

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
