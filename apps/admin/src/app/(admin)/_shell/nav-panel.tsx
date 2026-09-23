/*
 * 의도적으로 "use client"를 두지 않는다 (#85).
 *
 * 이 파일을 클라이언트 진입점으로 만들면 Next가 export된 컴포넌트의 props를 직렬화
 * 가능해야 하는 것으로 보고 `onNavigate` 같은 콜백을 Server Action으로 오해한다.
 * 진입점은 이것을 감싸는 sidebar.tsx · mobile-nav.tsx이고, 이 파일은 그 클라이언트
 * 그래프에 딸려 들어간다 — 서버 컴포넌트에서 직접 import하지 말 것.
 */
import { Fragment, useId } from "react";
import { GroupIcon, onKeyActivate } from "@ssccops/ui";
import { cn } from "@/shared/lib/cn";
import { groupHasActive, type NavGroup, type NavItem } from "./nav";

/** 키보드 포커스 표시 — 셸의 행·머리글·레일 버튼이 같은 테를 쓴다 */
export const NAV_FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40";

function NavRow({
  item,
  pathname,
  onNavigate,
  child,
}: Readonly<{
  item: NavItem;
  pathname: string;
  onNavigate: (href: string) => void;
  child?: boolean;
}>) {
  const active = item.isActive(pathname);
  const childActive = item.children?.some((k) => k.isActive(pathname)) ?? false;
  return (
    <>
      {/*
        메뉴 행은 `<a>`가 아니라 div다 — `onNavigate`가 드로어를 닫고 router로 가는 콜백이라
        href를 그대로 링크로 못 준다. Tab으로 닿고 Enter·Space로 눌리게 role 방식으로 둔다
        (ssccops-web#403). `aria-current`는 현재 화면을 보조기기에 알린다 — 색만으로는 모른다.
        들여쓰기는 묶음 머리글의 아이콘(22px) 뒤 라벨 시작점(49px)에 맞춘다 — 항목이 묶음 «안»으로 읽히게.
      */}
      <div
        role="button"
        tabIndex={0}
        aria-current={active ? "page" : undefined}
        onClick={() => onNavigate(item.href)}
        onKeyDown={onKeyActivate(() => onNavigate(item.href))}
        className={cn(
          "flex min-h-[40px] cursor-pointer touch-manipulation items-center hover:bg-accent/6",
          NAV_FOCUS,
          child
            ? "gap-2 py-2 pr-[18px] pl-[53px] text-[14.5px]"
            : "gap-[9px] py-[9px] pr-[18px] pl-[37px] text-[15px]",
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

function Chevron({ open }: Readonly<{ open: boolean }>) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
      className={cn("flex-none transition-transform motion-reduce:transition-none", open && "rotate-90")}
    >
      <path
        d="M3 1.5 6.5 5 3 8.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 묶음 메뉴 목록 — 아코디언 (#85 · #635 · ssccops#462).
 *
 * 데스크톱 사이드바와 모바일 드로어가 같은 것을 그린다 — 한쪽에만 메뉴가 늘어나는 일을
 * 막으려고 마크업을 여기 한 벌만 둔다. 펼침 상태는 `useNavAccordion`이 쥔다(기본 = 활성 묶음만 ·
 * localStorage 기억) — 부르는 쪽이 훅을 들고 `isOpen`·`onToggle`을 넘기는 것은 접힌 레일의 아이콘
 * 버튼이 «펼치면서 그 묶음을 열기»를 해야 해서다(사이드바 안의 다른 자리가 같은 상태를 만진다).
 *
 * **묶음 머리글은 토글이지 이동이 아니다** — 누르면 접고 펼칠 뿐 첫 항목으로 가지 않는다. 네이티브
 * `<button>`이다(안에 다른 버튼이 없어 role 방식이 필요 없다). `aria-expanded`·`aria-controls`로
 * 보조기기가 접힘을 안다. 접힌 묶음 안에 현재 화면이 있으면 머리글을 강조색으로 — 닫아 두어도
 * «지금 여기»가 목차 어디인지는 보여야 한다.
 *
 * **여기는 목차뿐이다** (#614 · ssccops#452). 프로필·«내 계정»·«로그아웃»·다른 앱 링크·«홈 화면에
 * 추가»·테마는 전부 계정 메뉴(`@ssccops/ui` `AccountMenu` — 사이드바 발치 · 드로어는
 * `AccountSections`)다. «전체 메뉴» 링크(`sitemap-link.tsx`)도 부르는 쪽이 목차 아래에 둔다.
 */
export function NavPanel({
  groups,
  pathname,
  onNavigate,
  isOpen,
  onToggle,
}: Readonly<{
  groups: NavGroup[];
  pathname: string;
  onNavigate: (href: string) => void;
  isOpen: (groupId: string) => boolean;
  onToggle: (groupId: string) => void;
}>) {
  // 사이드바와 드로어가 같은 목차를 함께 DOM에 두므로(lg에서 한쪽은 hidden) id가 겹치지 않게 한다
  const uid = useId();
  return (
    <div>
      {groups.map((g) => {
        const open = isOpen(g.id);
        const active = groupHasActive(g, pathname);
        const panelId = `${uid}${g.id}`;
        return (
          <div key={g.id} className="pt-1">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => onToggle(g.id)}
              className={cn(
                "flex min-h-[40px] w-full cursor-pointer touch-manipulation items-center gap-[9px] px-[18px] py-[8px] text-left text-[14px] font-medium hover:bg-accent/6",
                NAV_FOCUS,
                active && !open ? "text-accent-strong" : "text-n300",
              )}
            >
              <GroupIcon emoji={g.emoji} />
              <span className="min-w-0 flex-1 truncate">{g.label}</span>
              <span className="text-n500">
                <Chevron open={open} />
              </span>
            </button>
            {/*
              접혀도 DOM에 둔다(`hidden`) — `aria-controls`가 가리키는 자리가 늘 있어야 한다.

              `role="group"`을 붙인 div가 아니라 `<fieldset>`이다(#658 · S6819) — 같은 역할이
              태그에 들어 있다. `min-w-0`은 fieldset의 기본값 `min-inline-size: min-content`를
              되돌린다: 그대로 두면 안의 `truncate`가 줄이지 못해 묶음이 사이드바 폭을 밀어낸다.
            */}
            <fieldset id={panelId} aria-label={g.label} hidden={!open} className="min-w-0 pb-1">
              {g.items.map((item, i) => (
                <Fragment key={item.href}>
                  {/* 구분 제목 — 보이는 항목 기준으로 값이 바뀔 때만 (#639 · ssccops#463) */}
                  {item.section && item.section !== g.items[i - 1]?.section && (
                    <div className="px-[18px] pt-[10px] pb-[3px] text-[11.5px] font-semibold tracking-[.3px] text-n500">
                      {item.section}
                    </div>
                  )}
                  <NavRow item={item} pathname={pathname} onNavigate={onNavigate} />
                </Fragment>
              ))}
            </fieldset>
          </div>
        );
      })}
    </div>
  );
}
