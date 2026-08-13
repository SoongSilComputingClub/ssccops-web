"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMemberStore, memberRoleLabel } from "@/entities/member";
import { useSessionStore } from "@/entities/session";
import { cn } from "@/shared/lib/cn";
import { NAV_FOOT, NAV_GROUPS, groupHasActive, type NavItem } from "./nav";

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

  const memberKey = useSessionStore((s) => s.memberKey);
  const logout = useSessionStore((s) => s.logout);
  const me = useMemberStore((s) => s.members.find((m) => m.key === memberKey));

  const navigate = (href: string) => {
    if (href === "/login") {
      void logout().then(() => router.push(href));
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
        {NAV_GROUPS.map((g) => (
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
        {NAV_GROUPS.map((g) => (
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
            {me?.name.charAt(0) ?? "S"}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[14.5px] font-semibold">{me?.name ?? "-"}</div>
            <div className="truncate text-[12.5px] text-n500">
              {me ? memberRoleLabel(me) : ""}
            </div>
          </div>
        </div>
        {NAV_FOOT.items.map((item) => (
          <NavRow key={item.label} item={item} pathname={pathname} onNavigate={navigate} />
        ))}
      </div>
    </div>
  );
}
