import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchPublicEvent, toShareDescription } from "@/entities/event";
import { formatEventPeriod } from "@/shared/lib/date";
import { EventDetailPage } from "@/views/event-detail";

/**
 * 공유 카드용 메타 (wave2 D7 — 카카오톡·에브리타임 링크 공유).
 *
 * 여기서 한 번, 페이지 본문에서 한 번 같은 행사를 조회하지만 **Next가 같은 요청을 메모이즈**한다 —
 * 같은 URL·옵션의 GET은 한 렌더 안에서 `generateMetadata`와 페이지에 걸쳐 한 번만 나간다.
 *
 * 조회가 실패해도 여기서 404를 내지 않는다 — 그 판단은 본문 쪽 한 곳에서만 한다. 메타는
 * 루트 레이아웃의 기본값으로 두고 넘어간다(공유 카드가 밋밋한 것과 페이지가 안 뜨는 것은
 * 무게가 다르다).
 */
export async function generateMetadata({
  params,
}: PageProps<"/events/[eventId]">): Promise<Metadata> {
  const { eventId } = await params;

  try {
    const event = await fetchPublicEvent(Number(eventId));

    /*
     * 일시·장소를 앞세우고 본문 요약을 뒤에 붙인다 — 링크만 보고 갈지 말지를 정하는 사람에게
     * 가장 먼저 필요한 것이 언제·어디인가다. 둘 다 비면 마지막 문구로 떨어진다.
     */
    const when = [formatEventPeriod(event.eventBgngDt, event.eventEndDt), event.plcNm]
      .filter(Boolean)
      .join(" · ");
    const summary = toShareDescription(event.mtxtCn);
    const description =
      [when, summary].filter(Boolean).join(" — ") || "숭실컴퓨팅클럽(SSCC) 행사 안내입니다";

    return {
      title: event.eventTtl,
      description,
      openGraph: {
        // og:title 에는 레이아웃의 title.template 이 적용되지 않아 서비스 이름을 직접 붙인다
        title: `${event.eventTtl} · SSCC`,
        description,
        type: "article",
        // 대표 이미지가 없으면 필드를 아예 비운다 — 없는 이미지를 가리키면 카드가 깨진다
        images: event.thmbUrlAddr ? [{ url: event.thmbUrlAddr }] : undefined,
      },
    };
  } catch {
    return {};
  }
}

export default async function Page({ params }: PageProps<"/events/[eventId]">) {
  const { eventId } = await params;

  /*
   * 숫자가 아닌 주소(`/events/abc`)는 서버에 물어볼 것도 없이 404다 — 그대로 보내면 서버가
   * 400으로 답하고, 그 오류는 "행사를 불러오지 못했습니다"로 보여 없는 주소인지 서버가 아픈
   * 것인지 구별되지 않는다.
   */
  const parsed = Number(eventId);
  if (!Number.isInteger(parsed) || parsed <= 0) notFound();

  return <EventDetailPage eventId={parsed} />;
}
