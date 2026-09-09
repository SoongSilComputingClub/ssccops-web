import type { Metadata } from "next";
import { SessionLandingPage } from "@/views/session-landing";

/**
 * /studio/sessions/{sessionId} — 회차 공유 링크의 착지 해석기 (#335).
 *
 * `app/`은 라우팅 전용이다 — 뷰(`views/session-landing`)를 얇게 감싼다. 회차 식별자만 경로에
 * 싣는다. 숫자가 아니거나 없으면 null로 넘겨 뷰가 "찾을 수 없음"을 그린다(활동 상세와 같다).
 *
 * 성공하면 뷰가 활동 상세로 넘기므로 이 제목은 넘기지 못할 때만 보인다.
 */
export const metadata: Metadata = {
  title: "회차 열기",
};

function toId(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export default async function Page({
  params,
}: PageProps<"/studio/sessions/[sessionId]">) {
  const { sessionId } = await params;
  return <SessionLandingPage sessionId={toId(sessionId)} />;
}
