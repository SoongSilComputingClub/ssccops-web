"use client";

import { cn } from "@/shared/lib/cn";

/**
 * 박스형 세그먼트 컨트롤 (역할 목록/분류 · 프로필/연결된 계정)
 *
 * ── 선택 상태를 색으로만 말하지 않는다 (#692 · ssccops#511) ──
 *
 * 그전에는 `bg-accent-soft font-semibold text-accent` 뿐이어서 스크린리더 사용자는
 * «편집, 버튼 / 미리보기, 버튼»으로 듣고 **어느 쪽이 켜져 있는지 알 수 없었다.** 누른 뒤에도
 * 확인이 없었다. 같은 레포의 형제들은 이미 고쳐져 있었다 — `packages/signup/ui/chip.tsx`·
 * `packages/pwa/ui/notification-list.tsx`는 `aria-pressed`, `www/views/event-list`의 필터 칩은
 * `aria-current`. 어드민의 공유 부품 둘만 남아 있었다.
 *
 * **`role="tab"`을 쓰지 않는다.** 호출부 11곳을 실제로 읽어 보면 성격이 셋으로 갈린다.
 *
 * | 성격 | 호출부 |
 * |---|---|
 * | 같은 화면의 패널 전환(탭에 가장 가깝다) | `markdown-editor`(편집/미리보기) · `content-page-edit`·`content-post-edit`(편집/이력) · `event-participants` |
 * | 보기 모드·필터 | `content-list` · `event-list` · `operations-hub` · `response-list` |
 * | **다른 화면으로 이동**(`router.push`) | `role-list` · `role-labels` |
 * | **폼 값 고르기**(참가 상태) | `manual-register-sheet` |
 *
 * `role="tab"`은 `aria-controls`로 이어진 `role="tabpanel"`과 로빙 tabindex를 요구한다 — 그
 * 배선이 없는데 역할만 붙이면 보조기기가 **없는 탭 패널을 찾는다.** 게다가 아래 셋은 탭이
 * 아니다(이동은 링크에 가깝고, 값 고르기는 라디오 그룹이다). 그래서 **어느 경우에도 틀리지 않는
 * `aria-pressed`를 기본으로** 두고, 이동인 곳만 `aria-current="page"`로 바꿀 수 있게 열었다.
 *
 * 진짜 탭이 필요해지면 `aria-controls`·`role="tabpanel"`·로빙 tabindex를 **함께** 들여야 한다 —
 * 그때는 이 부품이 아니라 별도 부품이다.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  as = "toggle",
  className,
}: Readonly<{
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  /** 그룹이 무엇을 고르는 것인지 — 보조기기에 «무엇의 편집/미리보기인가»를 준다 */
  label?: string;
  /**
   * `"toggle"`(기본)은 `aria-pressed`, `"nav"`는 `aria-current="page"`.
   *
   * 누르면 **다른 주소로 가는** 자리에만 `"nav"`를 쓴다(`role-list`·`role-labels`) — 그쪽은
   * 「켜져 있다」가 아니라 「지금 이 화면이다」가 사실이다.
   */
  as?: "toggle" | "nav";
  className?: string;
}>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex rounded-[12px] border border-line bg-surface p-[3px]",
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={as === "toggle" ? option === value : undefined}
          aria-current={as === "nav" && option === value ? "page" : undefined}
          className={cn(
            "flex-1 cursor-pointer rounded-[9px] py-2 text-center text-[14px] transition-colors",
            option === value
              ? "bg-accent-soft font-semibold text-accent"
              : "text-n400 hover:text-n300",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
