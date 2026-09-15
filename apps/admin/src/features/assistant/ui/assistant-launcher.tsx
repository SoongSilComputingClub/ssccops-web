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
        <span aria-hidden="true">{open ? "✕" : "⚖"}</span>
      </button>
    </>
  );
}
