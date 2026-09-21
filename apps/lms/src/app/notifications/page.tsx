import type { Metadata } from "next";
import { NotificationListPage } from "@/views/notification-list";

/** /notifications — 내 알림 (#606 · ADR-0045). `app/`은 라우팅 전용 — 뷰를 얇게 감싼다 */
export const metadata: Metadata = {
  title: "알림",
};

export default function Page() {
  return <NotificationListPage />;
}
