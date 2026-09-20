import { eventsPath, type EventListView } from "@/shared/config/routes";
import { FilterChip } from "./filter-chip";

/**
 * 카드·리스트 전환 — 필터 줄 오른쪽의 링크 두 개 (#573 · ssccops#427).
 *
 * 분류 칩과 같은 알약 링크다. 세그먼트 버튼(어드민 web#570)이 아닌 것은 이 화면이 서버
 * 컴포넌트라 상태를 쥘 곳이 없어서이고, 주소를 바꾸는 이동이니 `<nav>`가 맞다(디자인 시스템
 * «칩 · 탭 · 배지» — 같은 화면의 패널을 바꾸는 ARIA 탭이 아니다). 링크는 지금 고른 분류를
 * 그대로 싣는다.
 *
 * 리스트 하나만 남기고 «카드로 돌아가기»를 안 두는 길은 기각 — 어느 쪽을 보고 있는지가
 * 컨트롤에 드러나야 한다.
 */
export function ViewSwitch({
  view,
  eventClsfCd,
}: Readonly<{
  view: EventListView;
  /** 지금 고른 분류 — 전환 링크에 그대로 실린다 */
  eventClsfCd: string | null;
}>) {
  return (
    <nav aria-label="보기 방식" className="flex items-center gap-[7px]">
      <FilterChip href={eventsPath(eventClsfCd)} active={view === "card"}>
        카드
      </FilterChip>
      <FilterChip href={eventsPath(eventClsfCd, "list")} active={view === "list"}>
        리스트
      </FilterChip>
    </nav>
  );
}
