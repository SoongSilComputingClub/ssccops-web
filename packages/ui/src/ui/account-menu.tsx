"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { cn } from "../lib/cn";
import { ThemeToggle } from "./theme-toggle";

/*
 * 계정 메뉴 — 세 앱 셸의 유틸리티를 한 자리에 모은다 (ssccops#452 · ssccops-web#614).
 *
 * 기능이 붙을 때마다 상단 바·사이드바에 아이콘이 하나씩 늘어(테마 라디오 · 다른 앱 링크 · 설치 ·
 * 종 · 내 정보 · 로그아웃) 세 앱의 내비게이션이 제각각이고 붐볐다. 규칙은 하나다 — **유틸리티는
 * 계정 메뉴 하나, 종만 밖에.** 절의 순서는 ssccops#452 표가 정본이고 여기서 고정한다:
 *
 *   ① 이름·역할(머리)   ② 내 정보 / 내 활동   ③ 테마(`ThemeToggle` 재사용)
 *   ④ 다른 앱(자기 아닌 것)   ⑤ 홈 화면에 추가(슬롯 — 설치 가능할 때만)   ⑥ 로그아웃
 *   구분선은 ②·③·⑥ 앞.
 *
 * 앱은 **항목만** 넘긴다 — 무엇이 «내 정보»이고 어느 오리진이 «다른 앱»인지는 앱마다 다르지만
 * 순서·간격·키보드 동작은 같아야 «두 앱을 오가는 사람에게 같은 물건»으로 보인다.
 *
 * ── WAI-ARIA menu button ────────────────────────────────────
 * 트리거는 `aria-haspopup="menu"` + `aria-expanded`, 팝오버는 `role="menu"`에 `role="menuitem"`
 * 항목. Esc·바깥 클릭·포커스 이탈로 닫히고, ↑↓·Home·End로 옮기며, 열리면 첫 항목에 포커스,
 * Esc·항목 선택으로 닫히면 트리거로 돌아온다. 테마 라디오는 메뉴 항목이 아니라 그 안의
 * `radiogroup`이라 ↑↓ 이동에 라디오 버튼도 끼운다 — 건너뛰면 키보드로 테마를 못 바꾼다.
 *
 * ── 링크는 `<a>`다 ──────────────────────────────────────────
 * Cmd/Ctrl·가운데 클릭이 새 탭으로 열려야 한다. 앱 라우터로 가려면 `onNavigate`를 주면 되고,
 * 그때도 수식키 없는 왼쪽 클릭만 가로챈다. 다른 오리진(`external`)은 언제나 브라우저에 맡긴다.
 * `next/link`를 쓰지 않는 것은 이 패키지가 Next에 기대지 않기 때문이다.
 *
 * ── 드로어에는 같은 절을 인라인으로 (`AccountSections`) ──────
 * 모바일 드로어는 이미 열린 패널이라 그 안에서 또 팝오버를 열지 않는다. 같은 항목·같은 순서를
 * `role` 없이 그린다 — 마크업이 한 벌이라 한쪽에만 항목이 늘어나지 않는다.
 */

export interface AccountMenuLink {
  label: string;
  href: string;
  /** 다른 오리진 — `onNavigate`를 타지 않고 브라우저가 이동한다 */
  external?: boolean;
}

interface ItemContext {
  /** 팝오버 안(`role="menuitem"`)인가, 드로어 인라인인가 */
  inMenu: boolean;
  /** 항목을 고른 뒤 — 팝오버는 닫히고, 드로어는 자기를 닫는다 */
  onSelect: () => void;
  onNavigate?: (href: string) => void;
}

const ItemCtx = createContext<ItemContext>({ inMenu: false, onSelect: () => {} });

const ITEM_CLASS =
  "flex min-h-[40px] w-full cursor-pointer touch-manipulation items-center gap-2 rounded-[8px] px-3 py-2 text-left text-[14.5px] text-ink outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-default disabled:opacity-50";

/** 수식키 없는 왼쪽 클릭만 — 나머지는 브라우저의 새 탭·새 창에 맡긴다 */
function isPlainLeftClick(ev: MouseEvent<HTMLAnchorElement>): boolean {
  return ev.button === 0 && !ev.metaKey && !ev.ctrlKey && !ev.shiftKey && !ev.altKey;
}

/**
 * 메뉴 항목 하나 — 링크(`href`) 또는 동작(`onClick`).
 *
 * 앱이 ⑤ 슬롯에 넣는 «홈 화면에 추가»도 이것으로 그린다 — 그래야 팝오버 안에서는 `menuitem`이 되고
 * 드로어에서는 보통 버튼이 되며, 높이·여백이 다른 항목과 같다.
 */
export function AccountMenuItem({
  href,
  external,
  current,
  disabled,
  onClick,
  children,
}: Readonly<{
  href?: string;
  external?: boolean;
  /** 지금 보고 있는 화면 — `aria-current` */
  current?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}>) {
  const { inMenu, onSelect, onNavigate } = useContext(ItemCtx);
  const role = inMenu ? "menuitem" : undefined;

  if (href) {
    const handleClick = (ev: MouseEvent<HTMLAnchorElement>) => {
      if (!external && onNavigate && isPlainLeftClick(ev)) {
        ev.preventDefault();
        onSelect();
        onNavigate(href);
        return;
      }
      onSelect();
    };
    return (
      <a
        href={href}
        role={role}
        aria-current={current ? "page" : undefined}
        onClick={handleClick}
        className={cn(ITEM_CLASS, current && "bg-accent-soft font-semibold text-accent")}
      >
        {children}
        {external && (
          <span className="ml-auto text-[12px] text-n500" aria-hidden="true">
            ↗
          </span>
        )}
      </a>
    );
  }

  return (
    <button
      type="button"
      role={role}
      disabled={disabled}
      onClick={() => {
        onSelect();
        onClick?.();
      }}
      className={ITEM_CLASS}
    >
      {children}
    </button>
  );
}

/** 항목이 아닌 안내 한 줄 — iOS의 «홈 화면에 추가는 공유 버튼에서 합니다» 같은 것 */
export function AccountMenuNote({ children }: Readonly<{ children: ReactNode }>) {
  const { inMenu } = useContext(ItemCtx);
  return (
    <div role={inMenu ? "none" : undefined} className="px-3 py-[6px] text-[12.5px] leading-[1.6] text-n500">
      {children}
    </div>
  );
}

/* `<hr>`이 곧 role="separator"다(S6819). 기본 테두리는 Tailwind preflight가 지우지만 `border-0`을
 * 적어 두면 preflight 없이 쓰는 자리에서도 1px 줄이 두 겹으로 보이지 않는다 */
function Divider() {
  return <hr className="my-1 h-px border-0 bg-line" />;
}

function Avatar({ name, size }: Readonly<{ name: string; size: number }>) {
  const initial = name.trim().charAt(0) || "?";
  return (
    <span
      aria-hidden="true"
      className="flex flex-none items-center justify-center rounded-full bg-accent-soft font-semibold text-accent"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
    >
      {initial}
    </span>
  );
}

interface SectionsProps {
  /** ② 내 정보 · 내 활동 — 이 앱의 화면 */
  links?: readonly AccountMenuLink[];
  /** ④ 다른 앱 — 자기 아닌 것만, 오리진이 없으면 빼고 넘긴다 */
  apps?: readonly AccountMenuLink[];
  /** ⑤ 홈 화면에 추가 — `AccountMenuItem`·`AccountMenuNote`로 그린 것. 설치할 수 없으면 `null` */
  install?: ReactNode;
  onSignOut: () => void;
  signingOut?: boolean;
  /** 지금 경로 — ② 항목의 `aria-current` */
  pathname?: string;
}

/** 절 ②~⑥ — 팝오버와 드로어가 같은 것을 그린다 */
function Sections({
  links = [],
  apps = [],
  install,
  onSignOut,
  signingOut,
  pathname,
}: Readonly<SectionsProps>) {
  return (
    <>
      <Divider />
      {links.map((link) => (
        <AccountMenuItem
          key={link.href}
          href={link.href}
          current={pathname !== undefined && pathname === link.href}
        >
          {link.label}
        </AccountMenuItem>
      ))}
      {links.length > 0 && <Divider />}
      <div role="none" className="px-3 py-2">
        <div className="mb-[6px] text-[12px] text-n500">테마</div>
        <ThemeToggle />
      </div>
      {apps.map((app) => (
        <AccountMenuItem key={app.href} href={app.href} external>
          {app.label}
        </AccountMenuItem>
      ))}
      {install}
      <Divider />
      <AccountMenuItem onClick={onSignOut} disabled={signingOut}>
        {signingOut ? "로그아웃 중…" : "로그아웃"}
      </AccountMenuItem>
    </>
  );
}

/**
 * 드로어용 — 같은 절(②~⑥)을 인라인으로. 1차 메뉴 아래에 둔다.
 *
 * `onSelect`는 항목을 골랐을 때 드로어가 자기를 닫는 콜백이다(링크·로그아웃 모두).
 */
export function AccountSections({
  onSelect,
  onNavigate,
  className,
  ...sections
}: Readonly<
  SectionsProps & {
    onSelect?: () => void;
    onNavigate?: (href: string) => void;
    className?: string;
  }
>) {
  // 값이 매 렌더 새 객체면 이 컨텍스트를 읽는 항목 전부가 함께 다시 그려진다 (S6481)
  const ctx = useMemo<ItemContext>(
    () => ({ inMenu: false, onSelect: onSelect ?? (() => {}), onNavigate }),
    [onSelect, onNavigate],
  );
  return (
    <ItemCtx.Provider value={ctx}>
      <div className={cn("flex flex-col", className)}>
        <Sections {...sections} />
      </div>
    </ItemCtx.Provider>
  );
}

const FOCUSABLE = '[role="menuitem"]:not([disabled]), [role="radio"]';

/**
 * 계정 메뉴 — 트리거 + 팝오버.
 *
 * - `trigger="avatar"`: 동그란 이니셜 하나(40px). 모바일 상단 바·접힌 레일.
 * - `trigger="avatar-name"`: 이니셜 + lg 이상에서 이름. lms·www 상단 바.
 * - `trigger="row"`: 아바타·이름·역할이 한 줄을 채우는 행. admin 사이드바 발치 — 메뉴는 위로(`placement="up"`).
 */
export function AccountMenu({
  name,
  label,
  onNavigate,
  trigger = "avatar",
  placement = "down",
  align = "end",
  className,
  ...sections
}: Readonly<
  SectionsProps & {
    /** ① 머리의 이름 — 아바타 이니셜도 여기서 */
    name: string;
    /** ① 머리의 둘째 줄 — 역할·등급 또는 이메일 */
    label?: string;
    /** 앱 라우터로 가려면 — 없으면 `<a>`가 그대로 이동한다 */
    onNavigate?: (href: string) => void;
    trigger?: "avatar" | "avatar-name" | "row";
    placement?: "down" | "up";
    align?: "start" | "end";
    className?: string;
  }
>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // 팝오버의 컨텍스트 값이 이것을 물고 있어 `useCallback`이다 — 매 렌더 새 함수면 memo가 헛돈다
  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  // 열리면 첫 항목에 포커스 — 메뉴 버튼 패턴. 바깥 클릭은 포커스를 뺏지 않고 닫기만 한다
  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    const onPointerDown = (ev: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const onMenuKeyDown = (ev: KeyboardEvent<HTMLDivElement>) => {
    if (ev.key === "Escape") {
      ev.preventDefault();
      ev.stopPropagation();
      close(true);
      return;
    }
    if (ev.key === "Tab") {
      // Tab은 메뉴를 떠나는 키다 — 포커스는 브라우저가 옮기고 메뉴만 닫는다
      setOpen(false);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(ev.key)) return;
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (items.length === 0) return;
    ev.preventDefault();
    const index = items.indexOf(document.activeElement as HTMLElement);
    let next: number;
    if (ev.key === "Home") next = 0;
    else if (ev.key === "End") next = items.length - 1;
    else if (ev.key === "ArrowDown") next = index < 0 ? 0 : (index + 1) % items.length;
    else next = index <= 0 ? items.length - 1 : index - 1;
    items[next].focus();
  };

  const onTriggerKeyDown = (ev: KeyboardEvent<HTMLButtonElement>) => {
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault();
      setOpen(true);
    }
  };

  /* 포커스가 트리거·메뉴 밖으로 나가면 닫는다 — Tab·Shift+Tab, 다른 곳 클릭 */
  const onBlur = (ev: FocusEvent<HTMLDivElement>) => {
    if (!open) return;
    const next = ev.relatedTarget as Node | null;
    if (next && rootRef.current?.contains(next)) return;
    setOpen(false);
  };

  // 팝오버 안 항목이 읽는 값 — 매 렌더 새 객체면 항목 전부가 함께 다시 그려진다 (S6481)
  const menuCtx = useMemo<ItemContext>(
    () => ({ inMenu: true, onSelect: () => close(true), onNavigate }),
    [close, onNavigate],
  );

  /* `type`은 두 트리거에 직접 적는다 — 스프레드로 넘기면 읽는 사람도 정적 분석도 못 본다 (S9011) */
  const triggerProps = {
    ref: triggerRef,
    "aria-haspopup": "menu" as const,
    "aria-expanded": open,
    "aria-controls": open ? menuId : undefined,
    onClick: () => setOpen((v) => !v),
    onKeyDown: onTriggerKeyDown,
  };

  return (
    <div
      ref={rootRef}
      onBlur={onBlur}
      className={cn("relative", trigger === "row" ? "w-full" : "flex-none", className)}
    >
      {trigger === "row" ? (
        <button
          {...triggerProps}
          type="button"
          aria-label={`계정 메뉴 — ${name}`}
          className="flex w-full min-w-0 cursor-pointer touch-manipulation items-center gap-[9px] rounded-[10px] px-2 py-[6px] text-left outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Avatar name={name} size={30} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14.5px] font-semibold">{name}</span>
            {label && <span className="block truncate text-[12.5px] text-n500">{label}</span>}
          </span>
          <span className="flex-none text-[10px] text-n500" aria-hidden="true">
            {open ? "▾" : "▴"}
          </span>
        </button>
      ) : (
        <button
          {...triggerProps}
          type="button"
          aria-label={`계정 메뉴 — ${name}`}
          className={cn(
            "flex h-10 min-w-10 cursor-pointer touch-manipulation items-center justify-center gap-[6px] rounded-full outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-accent",
            trigger === "avatar-name" && "lg:pr-[10px]",
          )}
        >
          <Avatar name={name} size={34} />
          {trigger === "avatar-name" && (
            <span className="hidden max-w-[120px] truncate text-[14.5px] text-n300 lg:inline">
              {name}
            </span>
          )}
        </button>
      )}

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          /* 메뉴 버튼 패턴대로 컨테이너도 포커스를 받을 수 있어야 한다 — Tab 순서에는 넣지 않는다 (S6852) */
          tabIndex={-1}
          aria-label="계정 메뉴"
          onKeyDown={onMenuKeyDown}
          className={cn(
            "absolute z-[70] flex w-[240px] flex-col rounded-[12px] border border-line bg-surface p-1 shadow-lg",
            placement === "up" ? "bottom-full mb-2" : "top-full mt-2",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          <div role="none" className="flex items-center gap-[9px] px-3 py-2">
            <Avatar name={name} size={30} />
            <div className="min-w-0">
              <div className="truncate text-[14.5px] font-semibold">{name}</div>
              {label && <div className="truncate text-[12.5px] text-n500">{label}</div>}
            </div>
          </div>
          <ItemCtx.Provider value={menuCtx}>
            <Sections {...sections} />
          </ItemCtx.Provider>
        </div>
      )}
    </div>
  );
}
