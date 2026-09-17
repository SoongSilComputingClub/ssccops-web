"use client";

import { useAssistantStore } from "../model/use-assistant-store";
import { AssistantPanel } from "./assistant-panel";

/*
 * 규정 도우미 FAB + 패널 (#433).
 *
 * ── 이 한 컴포넌트가 셸에 붙는 전부다 ──────────────────────────
 * `(admin)/layout.tsx`가 넣는 줄이 하나인 것은, FAB와 패널이 같은 상태를 보고 서로의 위치를
 * 아는 한 쌍이기 때문이다 — 둘을 따로 붙이면 «둘 중 하나만 옮겨진» 상태가 생긴다.
 *
 * ── `AuthGate` **안**에 둔다 ───────────────────────────────────
 * 로그인하지 않은 상태에서 버튼이 보이면 누르는 순간 401이다(이슈). 질의 API는 **인증만**을
 * 요구하므로 `useCan`으로 다시 가르지 않는다 — 규정은 회원에게 공개된 문서이고, 코퍼스를
 * 바꾸는 쪽만 `RAG_DOCUMENT_MANAGE`다(서버가 컨트롤러를 나눈 이유).
 *
 * ── 대화가 라우트 이동에 살아남는 자리 ─────────────────────────
 * 상태는 이 컴포넌트가 아니라 모듈 수준 store에 있다(`use-assistant-store`). 그래서 셸이
 * 다시 마운트되더라도 말풍선이 사라지지 않는다 — 「layout은 라우트 이동에 다시 마운트되지
 * 않는다」는 전제는 지금 맞지만, 대화를 그 전제 하나에 걸어 두지 않았다.
 */
export function AssistantLauncher() {
  const open = useAssistantStore((s) => s.open);
  const togglePanel = useAssistantStore((s) => s.togglePanel);

  return (
    <>
      <AssistantPanel />

      {/*
        FAB — 우측 하단 고정. 패널이 열리면 `lg` 미만에서는 시트가 화면을 덮으므로 버튼을
        감춘다(덮인 버튼이 스크림 위로 떠 있으면 무엇을 누르는지 알 수 없다). 넓은 화면에서는
        패널이 이 버튼 바로 위에 떠 있어 남겨 두는 편이 닫는 길이 하나 더 있는 셈이다.
      */}
      <button
        type="button"
        onClick={togglePanel}
        aria-expanded={open}
        aria-label={open ? "규정 도우미 닫기" : "규정 도우미 열기"}
        className={`fixed right-5 bottom-5 z-[87] flex size-[52px] cursor-pointer items-center justify-center rounded-full bg-accent text-[20px] text-on-solid shadow-[0_8px_24px_rgb(0_0_0/.28)] transition-colors hover:bg-accent-strong lg:right-6 lg:bottom-6 ${
          open ? "hidden lg:flex" : ""
        }`}
      >
        {open ? <span aria-hidden="true">✕</span> : <AssistantMark />}
      </button>
    </>
  );
}

/**
 * FAB의 표식 (#468).
 *
 * ── 저울(`⚖`)에서 말풍선으로 ─────────────────────────────────
 * 저울은 «규정»을 가리키려던 표식이었지만, 우측 하단에 떠 있는 동그란 버튼에서 사람이 기대하는
 * 것은 «말을 걸 수 있는 곳»이다. 게다가 이 앱에는 실제로 승인함이 있어 저울이 심사 기능으로
 * 읽힌다. 말풍선 안의 점 셋은 대화를, 오른쪽 위의 반짝임은 «사람이 아니라 도우미가 답한다»는
 * 것을 함께 말한다.
 *
 * ── 글리프가 아니라 인라인 SVG다 ─────────────────────────────
 * `⚖`가 그랬듯 글리프는 **OS·브라우저마다 다르게 그려지고 이모지 색이 입혀진다** — 파란 FAB
 * 위에서 제 색을 가진 그림이 떠 버리면 버튼이 아니라 스티커로 보인다. `currentColor`로 그리면
 * 버튼의 `text-on-solid`를 그대로 따르므로 테마가 바뀌어도 함께 간다(`shared/ui/search-input`·
 * `page-header`가 같은 방식이다).
 *
 * 닫기(`✕`)는 글리프로 둔다 — 그것은 어느 환경에서나 같은 모양으로 그려지는 기호이고, 이
 * 앱의 다른 닫기 버튼들과 같은 것을 써야 한다.
 */
function AssistantMark() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      aria-hidden="true"
      className="flex-none"
    >
      {/* 말풍선 — 왼쪽 아래로 꼬리가 난 둥근 사각형 */}
      <path
        d="M3.6 4.4h11.2a1.8 1.8 0 0 1 1.8 1.8v6.6a1.8 1.8 0 0 1-1.8 1.8H8.1l-3.4 3.2a.5.5 0 0 1-.84-.36v-2.84h-.26a1.8 1.8 0 0 1-1.8-1.8V6.2a1.8 1.8 0 0 1 1.8-1.8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* 대화를 뜻하는 점 셋 */}
      <circle cx="6.4" cy="9.5" r="1.1" fill="currentColor" />
      <circle cx="9.2" cy="9.5" r="1.1" fill="currentColor" />
      <circle cx="12" cy="9.5" r="1.1" fill="currentColor" />
      {/*
        반짝임 — «사람이 아니라 도우미가 답한다»를 말하는 부분이다. 네 꼭짓점이 오목하게
        들어간 별로, 말풍선 바깥 오른쪽 위에 겹쳐 둔다.
      */}
      <path
        d="M17.6 2.6c.33 1.63.64 1.94 2.27 2.27-1.63.33-1.94.64-2.27 2.27-.33-1.63-.64-1.94-2.27-2.27 1.63-.33 1.94-.64 2.27-2.27Z"
        fill="currentColor"
      />
    </svg>
  );
}
