import type { Metadata } from "next";
import { NotificationListPage } from "@/views/notification-list";

/**
 * /notifications — 내 알림 (#616 · ssccops#453 · ADR-0045). `app/`은 라우팅 전용 — 뷰를 얇게 감싼다.
 *
 * 본인만 보는 화면이라 색인하지 않는다(`/me`와 같은 판단 · `robots.ts`에도 든다). 미들웨어 매처가 이
 * 경로의 세션 쿠키를 갱신한다 — 브라우저에서 읽음 처리·«더 보기»를 이어 가는 화면이라서다.
 */
export const metadata: Metadata = {
  title: "알림",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <NotificationListPage />;
}
