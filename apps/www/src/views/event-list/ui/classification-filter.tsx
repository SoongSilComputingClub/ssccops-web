import type { EventClassification } from "@/entities/event";
import { eventsPath, type EventListView } from "@/shared/config/routes";
import { FilterChip } from "./filter-chip";

/**
 * 분류 필터 칩.
 *
 * **버튼이 아니라 링크다.** 고른 분류가 주소에 남아야 공유·뒤로 가기가 말이 되고, 링크로
 * 두면 이 화면 전체가 서버 컴포넌트로 남아 자바스크립트 없이도 필터가 동작한다(공개 앱이라
 * 첫 화면이 빨리 뜨는 편이 낫다).
 *
 * 칩의 주소는 지금의 보기 방식(`view`)을 그대로 싣는다 — 분류를 바꿨다고 리스트가 카드로
 * 돌아가면 두 컨트롤이 서로를 지우는 셈이다(#573).
 */
export function ClassificationFilter({
  classifications,
  selected,
  view,
}: Readonly<{
  classifications: EventClassification[];
  /** 지금 고른 분류 코드 — 없으면 '전체' */
  selected: string | null;
  /** 지금의 보기 방식 — 칩 주소에 그대로 실린다 */
  view: EventListView;
}>) {
  // 분류가 하나뿐이면 고를 것이 없다 — '전체'와 그 하나가 언제나 같은 목록을 보여 준다
  if (classifications.length < 2) return null;

  return (
    <div className="flex flex-wrap items-center gap-[7px]">
      <FilterChip href={eventsPath(null, view)} active={selected === null}>
        전체
      </FilterChip>
      {classifications.map((classification) => (
        <FilterChip
          key={classification.eventClsfCd}
          href={eventsPath(classification.eventClsfCd, view)}
          active={selected === classification.eventClsfCd}
        >
          {classification.eventClsfNm}
        </FilterChip>
      ))}
    </div>
  );
}
