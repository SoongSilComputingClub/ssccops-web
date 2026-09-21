"use client";

import { NotificationList } from "@ssccops/pwa/ui";
import { LoginGate } from "@/features/auth";
import { useNotifications } from "@/features/notification";
import { SignupRequiredNotice } from "@/features/signup";

/*
 * `/notifications` — 내 알림 목록 (#606 · ssccops#448).
 *
 * 목록 UI는 `@ssccops/pwa/ui`의 `NotificationList`다 — 어드민 `/notifications`(#604)가 같은 것을 그린다
 * («알림 목록 뷰를 두 앱이 공유» · ssccops#448). 이 화면은 훅(`useNotifications`)과 그 컴포넌트를 잇는
 * 것이 전부다. 진입 경로는 상단 바의 종뿐이고 목차(`nav-links.ts`)에는 없다 — 목차는 «할 수 있는 일»이고
 * 알림은 그 일로 가는 문이다.
 *
 * **클라이언트 화면이다** — 이 앱의 다른 조회와 달리 SSR 로더가 아니다. 읽음 처리·«더 보기»가 브라우저
 * 상태이고, 종 배지(`@ssccops/pwa` 스토어)와 같은 값을 그 자리에서 맞춰야 한다. 미로그인·미가입은 훅이
 * 상태로 올리고 여기서 다른 화면과 같은 게이트·안내를 그린다.
 */
export function NotificationListPage() {
  const list = useNotifications();

  return (
    <div className="flex flex-col gap-[16px]">
      <header className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-medium tracking-[-.3px] lg:text-[24px]">알림</h1>
        <p className="text-[13.5px] text-n500">승인 요청·결과·마감</p>
      </header>
      <Body list={list} />
    </div>
  );
}

function Body({ list }: Readonly<{ list: ReturnType<typeof useNotifications> }>) {
  if (list.status === "unauthenticated") {
    return (
      <LoginGate
        title="로그인이 필요합니다"
        description="알림은 로그인한 회원만 볼 수 있습니다 — 구글 계정으로 로그인해주세요"
      />
    );
  }
  if (list.status === "signup-required") {
    return <SignupRequiredNotice title="회원 가입을 마쳐야 알림을 볼 수 있습니다" />;
  }
  return (
    <div>
      {list.actionError && (
        <div className="mb-3 rounded-[10px] border border-danger/28 bg-danger/8 px-3 py-[10px] text-[14px] leading-[1.6] text-danger">
          {list.actionError}
        </div>
      )}
      <NotificationList
        items={list.items}
        status={list.status}
        errorMessage={list.errorMessage || undefined}
        hasNext={list.hasNext}
        loadingMore={list.loadingMore}
        onLoadMore={() => void list.loadMore()}
        onOpen={(item) => void list.open(item)}
        onReadAll={() => void list.readAll()}
        readingAll={list.readingAll}
      />
    </div>
  );
}
