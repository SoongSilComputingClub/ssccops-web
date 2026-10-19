"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hasAdminAccess, useSessionStore } from "@/entities/session";
import { ROUTES } from "@/shared/config/routes";
import { siteLinks } from "@/shared/config/site-links";

/*
 * 권한이 하나도 없는 회원이 그대로 쓰는 화면 — 계정 화면 둘뿐이다. 내 정보(프로필·푸시 설정)와
 * 알림(종 · 푸시를 누르면 여기로 온다)은 운영 화면이 아니라 그 사람 자신의 것이다.
 */
const OPEN_PATHS = [ROUTES.my, ROUTES.notifications] as const;

function isOpenPath(pathname: string): boolean {
  return OPEN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * 어드민 진입 게이트 (#809 · ssccops#611) — 권한이 하나도 없는 회원에게 운영 화면을 열지 않는다.
 *
 * 2026-10-18 제보에서 시작했다: 스터디장 계정이 어드민 «학술» 묶음을 봤다. 직접 원인은 서버가 그
 * 역할에 권한을 준 것이었지만(server#687), 그와 별개로 어드민은 **가입한 회원이면 누구나** 들어와
 * 셸·전체 메뉴·주소 직접 입력으로 운영 화면이 있다는 것을 알 수 있었다. 스터디장·프로젝트장·트랙장·
 * 일반 회원은 운영진이 아니라 «그런 화면이 있다»는 것조차 몰라야 한다(사용자 결정).
 *
 * AuthGate 안에 둔다 — 그때는 세션이 도착해 있어(status ready) member가 정해져 있다. 판정은
 * entities/session의 {@link hasAdminAccess} 한 곳(«권한이 하나라도 있는가»)이고, 목차가 비는 것
 * (use-shell-nav)도 같은 함수를 본다.
 *
 * ── 왜 로그인 화면으로 돌려보내지 않는가 ──────────────────────────
 * 이미 로그인한 회원이라 되돌려 보내면 같은 자리로 다시 온다. 갈 곳(학술 LMS·홍보 사이트)을
 * 보여 주는 편이 막다른 길이 아니다. 권한명을 적지 않는 것은 «무엇이 필요한가»를 말하는 순간 그
 * 화면이 있다는 것을 말하게 되기 때문이다(권한 오류 문구 규칙과 갈리는 유일한 자리).
 */
export function AdminAccessGate({ children }: Readonly<{ children: ReactNode }>) {
  const member = useSessionStore((s) => s.member);
  const pathname = usePathname();

  if (hasAdminAccess(member) || isOpenPath(pathname)) return <>{children}</>;
  return <NoAdminAccess />;
}

function NoAdminAccess() {
  const sites = siteLinks();
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="text-[16px] font-medium">이 앱에서 볼 수 있는 화면이 없습니다</div>
      <p className="max-w-[420px] text-[14px] leading-[1.6] text-n400">
        학술 활동은 학술 LMS에서 합니다.
      </p>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-[8px]">
        {sites.map((site) => (
          <a
            key={site.href}
            href={site.href}
            className="rounded-xl bg-accent px-[16px] py-[10px] text-[14.5px] font-semibold text-on-solid outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            {site.label}
          </a>
        ))}
        <Link
          href={ROUTES.my}
          className="rounded-xl border border-line px-[16px] py-[10px] text-[14.5px] text-n300 outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          내 정보
        </Link>
      </div>
    </div>
  );
}
