import { EVENT_CLSF_QUERY } from "@/shared/config/routes";
import { EventListPage } from "@/views/event-list";

export default async function Page({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const raw = params[EVENT_CLSF_QUERY];
  /*
   * 같은 키가 두 번 실리면(`?clsf=A&clsf=B`) 배열로 온다 — 첫 값만 쓴다. 필터는 하나뿐이고,
   * 배열을 그대로 쿼리에 실어 보내면 서버가 무엇을 골라야 할지 모른다.
   */
  const eventClsfCd = (Array.isArray(raw) ? raw[0] : raw) || null;

  return <EventListPage eventClsfCd={eventClsfCd} />;
}
