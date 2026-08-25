import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventApplyPage } from "@/views/event-apply";

/**
 * 신청 화면은 색인하지 않는다.
 *
 * 행사 목록·상세는 공유·검색으로 찾아오는 것이 목적이지만, 이 주소는 로그인해야 뜻이 있는
 * 화면이다 — 검색 결과에 서면 신청서를 열려던 사람이 로그인 안내부터 만난다. 공유할 것도 없어
 * OG 메타도 두지 않는다(공유는 상세가 맡는다).
 */
export const metadata: Metadata = {
  title: "행사 신청",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: PageProps<"/events/[eventId]/apply">) {
  const { eventId } = await params;

  // 숫자가 아닌 주소는 서버에 물어볼 것 없이 404다 — 상세 화면과 같은 규칙이다
  const parsed = Number(eventId);
  if (!Number.isInteger(parsed) || parsed <= 0) notFound();

  return <EventApplyPage eventId={parsed} />;
}
