import type { Metadata } from "next";
import { EVENT_CLSF_QUERY, EVENT_VIEW_QUERY } from "@/shared/config/routes";
import { EventListPage, parseEventListView } from "@/views/event-list";

export const metadata: Metadata = {
  title: "행사",
  description: "SSCC가 여는 모집·세미나·프로젝트·행사",
};

/**
 * 행사 목록 — 홈(`/`)에서 이사했다 (#524 · ssccops#385). 화면(`views/event-list`)은 그대로이고
 * 주소만 바뀌었다. 상단 바에서는 «활동» 축이 켜지고, 홈의 «다가오는 일정»이 여기로 링크한다.
 *
 * 보기 방식(`?view=list` · #573)도 여기서 읽어 넘긴다 — 서버 컴포넌트라 첫 HTML이 곧 최종 모양이다.
 */
export default async function Page({ searchParams }: Readonly<PageProps<"/events">>) {
  const params = await searchParams;
  const raw = params[EVENT_CLSF_QUERY];
  /*
   * 같은 키가 두 번 실리면(`?clsf=A&clsf=B`) 배열로 온다 — 첫 값만 쓴다. 필터는 하나뿐이고,
   * 배열을 그대로 쿼리에 실어 보내면 서버가 무엇을 골라야 할지 모른다.
   */
  const eventClsfCd = (Array.isArray(raw) ? raw[0] : raw) || null;
  const view = parseEventListView(params[EVENT_VIEW_QUERY]);

  return <EventListPage eventClsfCd={eventClsfCd} view={view} />;
}
