"use client";

import { useOnline } from "@ssccops/pwa";

/**
 * 오프라인 띠 — 연결이 없을 때 화면 맨 위에 한 줄 (#604 · ssccops#447).
 *
 * 쓰기 버튼을 따로 잠그지 않는다 — 오프라인에서 누르면 `CLIENT_NETWORK_ERROR` 토스트가 이미 뜨고,
 * `navigator.onLine`은 «인터페이스가 있다»까지만 알아 이 값으로 잠그면 연결은 있는데 잠기는 자리가
 * 생긴다. 띠는 «지금 보는 것이 마지막으로 본 내용»이라는 사실만 말한다.
 */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    /*
      셸이 h-dvh 고정이라 흐름에 끼우면 그만큼 밀린다 — 위에 겹쳐 띄운다(드로어 z-80보다 위).

      `role="status"`를 붙인 div가 아니라 `<output>`이다(#658 · S6819) — 같은 역할이 태그에
      이미 들어 있다. `output`은 인라인이라 `block`을 함께 준다(fixed가 어차피 블록으로 바꾸지만
      흐름이 바뀌어도 모양이 그대로여야 한다).
    */
    <output className="fixed inset-x-0 top-0 z-[90] block bg-amber-soft px-4 py-2 text-center text-[13.5px] text-amber">
      오프라인 — 마지막으로 본 내용
    </output>
  );
}
