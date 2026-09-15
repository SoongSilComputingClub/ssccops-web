"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ASSISTANT_QUESTION_MAX_LENGTH } from "@/entities/assistant";
import { Button } from "@/shared/ui";
import { useAssistantStore } from "../model/use-assistant-store";
import { AssistantEmpty } from "./assistant-empty";
import { AssistantMessageItem } from "./assistant-message";

/*
 * 규정 도우미 패널 (#433 · 기획안 §13.1).
 *
 * ── 넓은 화면은 팝오버, `lg` 미만은 시트 전체 화면 ─────────────
 * 셸이 `lg`로 갈리는 것과 같은 경계다(#85 · `(admin)/layout.tsx`). 좁은 화면에서 팝오버를
 * 띄우면 380px 카드가 375px 화면을 거의 다 덮으면서도 모서리가 잘려, 덮을 바에는 온전히
 * 덮는 편이 낫다.
 *
 * ── `shared/ui`의 `Sheet`를 쓰지 않았다 ────────────────────────
 * 그것은 **확인·취소로 끝나는 모달**이다(제목 + 본문 + 버튼 두 개, 중앙 440px 고정). 도우미는
 * 닫기 말고 결론짓는 버튼이 없고, 대화가 길어지면 스크롤이 본문 안에서 돌아야 하며, 넓은
 * 화면에서는 중앙이 아니라 FAB 옆에 붙는다 — 그 셋을 prop으로 넣으면 `Sheet`가 두 가지 물건이
 * 된다. **색·모서리·그림자는 그대로 따른다**(새 색을 만들지 않는다).
 */

const TITLE_ID = "assistant-panel-title";

export function AssistantPanel() {
  const open = useAssistantStore((s) => s.open);
  const messages = useAssistantStore((s) => s.messages);
  const asking = useAssistantStore((s) => s.asking);
  const suggestions = useAssistantStore((s) => s.suggestions);
  const suggestionsLoaded = useAssistantStore((s) => s.suggestionsLoaded);
  const closePanel = useAssistantStore((s) => s.closePanel);
  const loadSuggestions = useAssistantStore((s) => s.loadSuggestions);
  const ask = useAssistantStore((s) => s.ask);

  const [draft, setDraft] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const tailRef = useRef<HTMLDivElement>(null);

  /* 추천 질문은 패널을 처음 열 때 한 번만 받아 온다 — 열지 않는 사람에게 왕복을 붙이지 않는다 */
  useEffect(() => {
    if (open) void loadSuggestions();
  }, [open, loadSuggestions]);

  /*
   * Esc로 닫고, 열릴 때 입력에 초점을 준다 (Sheet·MobileNav와 같은 규약).
   *
   * Esc를 document에서 받는 이유도 같다 — 초점이 패널 밖에 있을 때 컨테이너의 onKeyDown은
   * 오지 않는다. 본문 스크롤은 여기서 잠그지 않는다: 넓은 화면의 팝오버는 본문을 덮지 않아
   * 뒤를 계속 읽을 수 있어야 하고, 좁은 화면은 아래 시트가 화면을 통째로 덮는다.
   */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    document.addEventListener("keydown", onKey);
    inputRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closePanel]);

  /* 새 말풍선이 붙으면 끝으로 따라간다 — 답이 화면 아래에 숨은 채 도착하지 않게 한다 */
  useEffect(() => {
    if (open) tailRef.current?.scrollIntoView({ block: "end" });
  }, [open, messages, asking]);

  if (!open) return null;

  const submit = (question: string) => {
    if (!question.trim() || asking) return;
    setDraft("");
    void ask(question);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(draft);
  };

  /* Enter로 보내고 Shift+Enter로 줄을 바꾼다 — 채팅 입력의 관례다 */
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit(draft);
    }
  };

  const tooLong = draft.length > ASSISTANT_QUESTION_MAX_LENGTH;

  return (
    <>
      {/*
        좁은 화면에서만 스크림을 깐다. 넓은 화면의 팝오버는 본문 옆에 떠 있을 뿐이라 뒤를
        가리지 않으며, 바깥을 눌러 닫는 것은 아래 전역 클릭이 아니라 FAB 토글과 Esc가 맡는다.
      */}
      <div
        aria-hidden="true"
        onClick={closePanel}
        className="fixed inset-0 z-[88] animate-fade-in bg-scrim lg:hidden"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        onKeyDown={(e) => trapFocus(e, panelRef.current)}
        className="fixed inset-0 z-[89] flex animate-fade-in flex-col border-line-strong bg-surface outline-none lg:inset-auto lg:right-6 lg:bottom-[92px] lg:h-[min(620px,calc(100dvh-140px))] lg:w-[380px] lg:animate-pop-in lg:rounded-2xl lg:border lg:shadow-[0_16px_40px_rgb(0_0_0/.28)]"
      >
        <header className="flex flex-none items-center gap-[9px] border-b border-hairline-strong px-[16px] py-[13px]">
          <span
            aria-hidden="true"
            className="flex size-7 flex-none items-center justify-center rounded-[9px] bg-accent-soft text-[14px] text-accent"
          >
            ⚖
          </span>
          <h2 id={TITLE_ID} className="min-w-0 flex-1 truncate text-[16px] font-medium">
            규정 도우미
          </h2>
          {/*
            `↺` 초기화 버튼을 Phase 1에 그리지 않는다 — 그려 놓고 아무 일도 하지 않으면
            사용자는 초기화됐다고 믿는다(이슈 · §13.1).
          */}
          <button
            type="button"
            onClick={closePanel}
            aria-label="규정 도우미 닫기"
            className="flex size-7 flex-none cursor-pointer items-center justify-center rounded-[9px] border border-line text-[14px] text-n400 hover:border-accent hover:text-accent"
          >
            ✕
          </button>
        </header>

        {/*
          답변 영역 — `aria-live="polite"`. 답은 사용자가 누른 뒤 비동기로 도착하므로 화면을
          보지 않는 사람에게는 도착 자체가 전해지지 않는다. `assertive`가 아닌 것은 읽던 것을
          끊을 만큼 급한 소식이 아니기 때문이다.
        */}
        <div
          aria-live="polite"
          aria-busy={asking}
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-[16px] py-[14px]"
        >
          {messages.length === 0 ? (
            <AssistantEmpty suggestions={suggestions} loaded={suggestionsLoaded} onPick={submit} />
          ) : (
            messages.map((message) => (
              <AssistantMessageItem key={message.id} message={message} />
            ))
          )}

          {asking && (
            <div className="self-start rounded-2xl rounded-bl-md border border-line bg-surface px-[14px] py-[10px] text-[13.5px] text-n500">
              답변을 찾는 중입니다…
            </div>
          )}
          <div ref={tailRef} />
        </div>

        {/*
          입력 — **파일·이미지 입력을 두지 않는다**(이슈). 문서를 넣는 길은 `RAG › 설정`
          하나이고, 여기에 첨부를 두면 코퍼스를 바꾸는 경로가 둘이 되는데 그중 하나는 인가가
          다르다(이쪽은 인증만이다).
        */}
        <form
          onSubmit={onSubmit}
          className="flex flex-none flex-col gap-[7px] border-t border-hairline-strong px-[16px] py-[12px]"
        >
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={asking}
              aria-label="규정에 대한 질문"
              placeholder="규정에 대해 물어보세요"
              className="max-h-[120px] min-h-[40px] flex-1 resize-none rounded-xl border border-line-strong bg-bg px-[12px] py-[9px] text-[14px] leading-[1.5] outline-none focus:border-accent disabled:opacity-60"
            />
            <Button type="submit" size="sm" disabled={asking || !draft.trim() || tooLong}>
              전송
            </Button>
          </div>
          {/*
            1,000자는 **서버와 같은 값**이다(초과는 413). 화면이 먼저 막는 것은 다 적은 뒤
            거절받지 않기 위해서지, 서버 판정을 대신하려는 것이 아니다.
          */}
          {tooLong && (
            <div className="text-[12.5px] text-danger">
              질문이 너무 깁니다 — {ASSISTANT_QUESTION_MAX_LENGTH.toLocaleString()}자 이하로
              줄여주세요
            </div>
          )}
        </form>
      </div>
    </>
  );
}

/**
 * 포커스 트랩 — Tab이 패널 밖으로 새지 않게 양 끝을 잇는다.
 *
 * `aria-modal="true"`는 보조기기에게 «뒤는 없다»고 말할 뿐 Tab을 막지 못한다. 좁은 화면에서는
 * 패널이 화면을 덮고 있어 초점이 보이지 않는 곳으로 가면 사용자가 되돌아올 길을 잃는다.
 */
function trapFocus(e: KeyboardEvent<HTMLElement>, panel: HTMLElement | null) {
  if (e.key !== "Tab" || !panel) return;

  const focusable = panel.querySelectorAll<HTMLElement>(
    'button:not([disabled]), textarea:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first || !last) return;

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
