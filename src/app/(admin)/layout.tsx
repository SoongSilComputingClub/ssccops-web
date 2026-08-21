import { AuthGate } from "@/features/auth";
import { MobileNav } from "./_shell/mobile-nav";
import { Sidebar } from "./_shell/sidebar";

/*
 * lg(1024px)를 경계로 셸이 갈린다 (#85).
 *
 * 경계를 1024px로 잡은 것은 이전의 `body { min-width: 1024px }`와 같은 값이기 때문이다 —
 * 그 이상에서는 정의상 예전과 같은 화면이 되므로 데스크톱 회귀를 만들지 않는다.
 *
 * 높이는 h-screen이 아니라 h-dvh다. 모바일 브라우저의 주소창이 접히고 펴질 때 100vh는
 * 큰 쪽으로 고정돼 하단이 잘린다.
 */
export default function AdminLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      <div className="hidden lg:flex">
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <div className="flex min-h-0 flex-1 flex-col">
          <AuthGate>{children}</AuthGate>
        </div>
      </div>
    </div>
  );
}
