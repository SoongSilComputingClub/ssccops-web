"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSessionStore } from "@/entities/session";
import { ROUTES } from "@/shared/config/routes";
import { firstAllowedHref, routeAllowed } from "./nav";

/**
 * 주소 직접 입력 가드 (#809 · ssccops#611) — 목차에서 감춘 화면은 주소를 쳐도 **없는 주소**다.
 *
 * 그전에는 «감추기는 안내일 뿐, 차단은 서버가 한다»였다. 서버는 데이터를 막았지만 화면은 그대로
 * 열려서, 권한이 없는 회원이 `/academic-programs/sessions`를 치면 «학술 대시보드» 제목과 «…학술
 * 프로그램 관리(ACADEMIC_PROGRAM_MANAGE) 권한이 필요합니다»를 봤다 — 그 화면이 있다는 것과 무엇이
 * 필요한지를 알려 준 셈이다. 조회가 «인증만»인 화면(프로그램 목록·상세·회차 상세)은 실제 데이터까지
 * 그렸다.
 *
 * 판정은 `nav.ts`의 {@link routeAllowed} — 목차와 같은 표(`isActive`·`requires`)다. 권한 오류
 * 문구가 아니라 not-found를 그리는 것은 «X 권한이 필요합니다»가 그 화면이 있다고 말하기 때문이다.
 * 화면 **안**의 버튼 잠금 사유(«이동은 감추고, 동작은 잠근다»)는 그대로 둔다 — 그 화면을 이미 볼 수
 * 있는 사람에게 하는 말이다.
 *
 * 셸 안에 그린다(사이드바 유지) — 권한 있는 운영진이 상세 주소를 잘못 친 경우와 갈 곳이 같다.
 * AdminAccessGate 안에 두므로 여기 오는 회원은 권한이 하나 이상 있다.
 */
export function RouteGuard({ children }: Readonly<{ children: ReactNode }>) {
  const member = useSessionStore((s) => s.member);
  const pathname = usePathname();
  const router = useRouter();

  const allowed = routeAllowed(member, pathname);
  // 첫 화면(`/` → `/dashboard`)을 못 여는 운영진은 자기 첫 화면으로 — 없는 주소는 그가 친 것이 아니다
  const landing = !allowed && pathname === ROUTES.dashboard ? firstAllowedHref(member) : null;

  useEffect(() => {
    if (landing) router.replace(landing);
  }, [landing, router]);

  if (allowed) return <>{children}</>;
  if (landing) return null;
  return <RouteNotFound />;
}

/* 루트 `app/not-found.tsx`와 같은 문구 — 셸 밖과 안에서 같은 상황을 다르게 말하지 않는다 */
function RouteNotFound() {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-[10px] px-6 text-center">
      <div className="text-[18px] font-medium">없는 주소입니다</div>
      <p className="text-[14px] leading-[1.6] text-n500">전체 메뉴에서 다시 찾아주세요.</p>
      <Link
        href={ROUTES.sitemap}
        className="mt-[6px] rounded-xl bg-accent px-[16px] py-[10px] text-[14.5px] font-semibold text-on-solid outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        전체 메뉴
      </Link>
    </div>
  );
}
