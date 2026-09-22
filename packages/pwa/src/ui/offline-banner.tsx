"use client";

import { useOnline } from "../use-online";

/**
 * 오프라인 띠 — 연결이 없을 때 화면 맨 위에 한 줄 (ssccops#447 · #606에서 패키지로).
 *
 * admin(#604)이 처음 만든 것과 글자·클래스가 같다 — lms(#606)가 같은 것을 그리게 되어 올렸다
 * («둘 이상» 규칙). admin의 `features/pwa/ui/offline-banner.tsx` 사본은 다음 admin 작업에서 이것으로
 * 바꾼다.
 *
 * 쓰기 버튼을 따로 잠그지 않는다 — 오프라인에서 누르면 `CLIENT_NETWORK_ERROR`가 이미 뜨고,
 * `navigator.onLine`은 «인터페이스가 있다»까지만 알아 이 값으로 잠그면 연결은 있는데 잠기는 자리가
 * 생긴다. 띠는 «지금 보는 것이 마지막으로 본 내용»이라는 사실만 말한다.
 *
 * 색은 토큰 이름(`bg-amber-soft`·`text-amber`)이다 — 앱의 `globals.css`가 `@source`로 이 패키지를
 * 가리켜야 클래스가 생성된다(루트 AGENTS.md «함정»).
 */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    // 흐름에 끼우지 않고 위에 겹쳐 띄운다 — admin 셸은 h-dvh 고정이고 드로어(z-80)보다 위여야 한다
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[90] bg-amber-soft px-4 py-2 text-center text-[13.5px] text-amber"
    >
      오프라인 — 마지막으로 본 내용
    </div>
  );
}
