/*
 * 의도적으로 "use client"를 두지 않는다 (#85).
 *
 * 이 파일을 클라이언트 진입점으로 만들면 Next가 export된 컴포넌트의 props를 직렬화
 * 가능해야 하는 것으로 보고 `onNavigate` 같은 콜백을 Server Action으로 오해한다.
 * 진입점은 이것을 감싸는 sidebar.tsx · mobile-nav.tsx이고, 이 파일은 그 클라이언트
 * 그래프에 딸려 들어간다 — 서버 컴포넌트에서 직접 import하지 말 것.
 */
import { useState } from "react";
import { cn } from "@/shared/lib/cn";
import { NAV_FOOT, type NavGroup, type NavItem } from "./nav";

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

/**
 * 메뉴 목록 + 프로필 + 계정 행 (#85).
 *
 * 데스크톱 사이드바와 모바일 드로어가 같은 것을 그린다 — 한쪽에만 메뉴가 늘어나는 일을
 * 막으려고 마크업을 여기 한 벌만 둔다. 묶음 접기 상태는 화면 폭과 무관한 표시 상태라
 * 이 컴포넌트가 직접 쥔다.
 */
export function NavPanel({
  groups,
  pathname,
  onNavigate,
  meName,
  meLabel,
}: {
  groups: NavGroup[];
  pathname: string;
  onNavigate: (href: string) => void;
  meName: string;
  meLabel: string;
}) {
  const [closed, setClosed] = useState<Record<string, boolean>>({});

  return (
    <>
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
                  onNavigate={onNavigate}
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
          <NavRow key={item.label} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </div>
    </>
  );
}
