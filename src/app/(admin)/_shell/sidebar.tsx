"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { representativeRole, useSessionStore } from "@/entities/session";
import { ROUTES } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";
import { flash } from "@/shared/ui";
import { NAV_FOOT, NAV_GROUPS, groupHasActive, visibleGroups, type NavItem } from "./nav";

function NavRow({
  item,
  pathname,
  onNavigate,
  child,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: (href: string) => void;
  child?: boolean;
}) {
  const active = item.isActive(pathname);
  const childActive = item.children?.some((k) => k.isActive(pathname)) ?? false;
  return (
    <>
      <div
        onClick={() => onNavigate(item.href)}
        className={cn(
          "flex cursor-pointer items-center hover:bg-accent/6",
          child
            ? "gap-2 py-2 pr-[18px] pl-[34px] text-[14.5px]"
            : "gap-[9px] px-[18px] py-[10px] text-[15.5px]",
          active
            ? "bg-accent/8 text-accent-strong"
            : child
              ? "text-n500"
              : "text-n300",
        )}
      >
        {child ? (
          <div
            className={cn(
              "size-[5px] flex-none rounded-full",
              active ? "bg-accent" : "bg-line-strong",
            )}
          />
        ) : (
          <div
            className={cn(
              "h-[15px] w-[3px] flex-none rounded-[2px]",
              active || childActive ? "bg-accent" : "bg-transparent",
            )}
          />
        )}
        {item.label}
      </div>
      {item.children?.map((k) => (
        <NavRow key={k.href} item={k} pathname={pathname} onNavigate={onNavigate} child />
      ))}
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [closed, setClosed] = useState<Record<string, boolean>>({});

  // 프로필은 서버 세션이 정본이다 — 목 회원 스토어를 거치지 않는다
  const member = useSessionStore((s) => s.member);
  const authUser = useSessionStore((s) => s.authUser);
  const logout = useSessionStore((s) => s.logout);

  const meName = member?.name ?? authUser?.name ?? "-";

  /*
   * 권한 없는 메뉴는 감춘다 (#29 · 근거는 nav.ts의 visibleGroups 주석).
   * 세션이 아직 없으면(member === null) 아무 권한도 없는 것으로 본다 — 잠깐 보였다 사라지는
   * 편보다 처음부터 안 보이는 편이 낫다. 세션이 도착하면 다시 계산된다.
   */
  const groups = useMemo(() => visibleGroups(NAV_GROUPS, member), [member]);

  /** 프로필 부제 — 대표 역할이 있으면 역할명, 없으면 등급명 · 등급명 */
  const meLabel = (() => {
    if (!member) return "";
    const role = representativeRole(member);
    return `${role?.roleName ?? member.membershipGradeName} · ${member.membershipGradeName}`;
  })();

  const navigate = (href: string) => {
    if (href === ROUTES.login) {
      void logout().then((ok) => {
        if (!ok) {
          // 쿠키가 남아 있어 실제로는 여전히 로그인 상태다 — 화면만 로그아웃된 척하지 않는다
          flash("로그아웃에 실패했습니다. 잠시 후 다시 시도해주세요");
          return;
        }
        // 서버 컴포넌트·미들웨어가 들고 있던 세션까지 확실히 버리려면 전체 이동이 필요하다
        window.location.replace(ROUTES.login);
      });
      return;
    }
    router.push(href);
  };

  if (collapsed) {
    return (
      <div className="flex w-16 flex-none flex-col items-center gap-[10px] border-r border-black/8 bg-surface pt-[22px] pb-4">
        <div className="flex size-[30px] flex-none items-center justify-center rounded-[8px] border border-accent text-[15px] text-accent">
          S
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex size-8 flex-none cursor-pointer items-center justify-center rounded-[10px] border border-line text-[15px] text-n400 hover:border-accent hover:text-accent"
        >
          ›
        </button>
        <div className="my-[2px] h-px w-6 bg-bg" />
        {groups.map((g) => (
          <button
            key={g.label}
            type="button"
            onClick={() => {
              setCollapsed(false);
              navigate(g.items[0].href);
            }}
            className={cn(
              "flex size-[38px] flex-none cursor-pointer items-center justify-center rounded-[12px] border text-[14.5px] font-semibold",
              groupHasActive(g, pathname)
                ? "border-accent bg-accent-soft text-accent"
                : "border-line bg-surface text-n500 hover:border-accent hover:text-accent",
            )}
          >
            {g.mono}
          </button>
        ))}
        <div className="flex-1" />
        <div className="my-[2px] h-px w-6 bg-bg" />
        <button
          type="button"
          onClick={() => {
            setCollapsed(false);
            navigate(NAV_FOOT.items[0].href);
          }}
          className={cn(
            "flex size-[38px] flex-none cursor-pointer items-center justify-center rounded-[12px] border text-[14.5px] font-semibold",
            groupHasActive(NAV_FOOT, pathname)
              ? "border-accent bg-accent-soft text-accent"
              : "border-line bg-surface text-n500 hover:border-accent hover:text-accent",
          )}
        >
          {NAV_FOOT.mono}
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-[230px] flex-none flex-col border-r border-black/8 bg-surface pt-[22px] pb-4">
      <div className="mb-3 flex items-center gap-[10px] border-b border-bg px-[18px] pb-4">
        <div className="flex size-7 flex-none items-center justify-center rounded-[7px] border border-accent text-[15px] text-accent">
          S
        </div>
        <div className="min-w-0 text-[16px] whitespace-nowrap">SSCC 운영관리</div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="flex size-7 flex-none cursor-pointer items-center justify-center rounded-[9px] border border-line text-[14px] text-n400 hover:border-accent hover:text-accent"
        >
          ‹
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {groups.map((g) => (
          <div key={g.label}>
            <div
              onClick={() => setClosed((c) => ({ ...c, [g.label]: !c[g.label] }))}
              className="flex cursor-pointer items-center justify-between px-[18px] pt-3 pb-1 text-[12.5px] tracking-[1px] text-n400 hover:text-accent"
            >
              {g.label}
              <div className="text-[10px]">{closed[g.label] ? "▸" : "▾"}</div>
            </div>
            {!closed[g.label] &&
              g.items.map((item) => (
                <NavRow
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={navigate}
                />
              ))}
          </div>
        ))}
      </div>

      <div className="mt-2 border-t border-bg pt-2">
        <div className="flex items-center gap-[9px] px-[18px] pb-2">
          <div className="flex size-[30px] flex-none items-center justify-center rounded-full bg-accent-soft text-[13.5px] font-semibold text-accent">
            {meName.charAt(0) || "S"}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[14.5px] font-semibold">{meName}</div>
            <div className="truncate text-[12.5px] text-n500">{meLabel}</div>
          </div>
        </div>
        {NAV_FOOT.items.map((item) => (
          <NavRow key={item.label} item={item} pathname={pathname} onNavigate={navigate} />
        ))}
      </div>
    </div>
  );
}
