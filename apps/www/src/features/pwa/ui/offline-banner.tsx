"use client";

import { useOnline } from "@ssccops/pwa";

/**
 * 오프라인 띠 — 연결이 없을 때 화면 맨 위에 한 줄 (#607 · ssccops#449 · admin #604와 같다).
 *
 * `navigator.onLine`은 «인터페이스가 있다»까지만 알아 이 값으로 무엇을 잠그지 않는다. 띠는 «지금
 * 보는 것이 마지막으로 본 내용»이라는 사실만 말한다 — 신청서 저장이 실패하면 그 화면이 이미
 * `CLIENT_NETWORK_ERROR`로 안내한다.
 */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    /*
     * 흐름에 끼우면 상단 바가 그만큼 밀린다 — 위에 겹쳐 띄운다(드로어 z-80보다 위).
     * `<output>`은 `role="status"`를 스스로 갖는 태그다(#659 · S6819). 기본 `display`가
     * `inline`이지만 `fixed`가 블록으로 만들고, 그래도 의도가 보이게 `block`을 적어 둔다.
     */
    <output className="fixed inset-x-0 top-0 z-[90] block bg-amber-soft px-4 py-2 text-center text-[13.5px] text-amber">
      오프라인 — 마지막으로 본 내용
    </output>
  );
}
