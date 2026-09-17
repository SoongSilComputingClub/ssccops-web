"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ASSISTANT_QUESTION_MAX_LENGTH } from "@/entities/assistant";
import { Button, Sheet } from "@/shared/ui";
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

/**
 * 기다리는 동안의 말풍선 (#468).
 *
 * ── 왜 글자만으로는 모자랐나 ──────────────────────────────────
 * 첫 조각이 오기 전까지는 화면에 움직이는 것이 하나도 없었다. 멈춘 글자는 «도는 중»과 «멈춘
 * 것»을 구별해 주지 못해서, 몇 초가 걸리는 이 구간에 사용자가 같은 질문을 다시 누르게 된다.
 * 흘려 받기 시작한 뒤에는 글자 자체가 진행 표시라(#464) 이 말풍선을 걷는다.
 *
 * ── 두 자리가 같은 것을 쓴다 ──────────────────────────────────
 * 답을 기다리는 동안과 대화를 지우는 동안은 **같은 성격의 기다림**이다. 한쪽만 움직이면
 * 사용자는 그 차이를 «이쪽은 돌고 저쪽은 멈췄다»로 읽는다.
 *
 * ── 점은 읽어 주지 않는다 ────────────────────────────────────
 * `aria-hidden`인 것은 점이 글자가 아니라 표시라서다 — 진행 중이라는 사실은 패널의
 * `aria-busy`가 이미 말하고 있고(#464), 문구도 그대로 남아 읽힌다.
 */
function WaitingBubble({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex items-center gap-2 self-start rounded-2xl rounded-bl-md border border-line bg-surface px-[14px] py-[10px] text-[13.5px] text-n500">
      <span aria-hidden="true" className="flex flex-none items-center gap-[3px]">
        {/*
          지연만 다르고 나머지는 같다. 인라인 `style`로 주는 것은 `animation-delay`가 Tailwind의
          임의 값으로는 세 번 다른 클래스를 만들어야 하는 값이라서다 — 세 점을 위해 유틸리티
          세 개를 만드느니 여기서 세 자리만 다르게 적는 편이 읽힌다.
        */}
        {[0, 0.2, 0.4].map((delay) => (
          <span
            key={delay}
            style={{ animationDelay: `${delay}s` }}
            className="size-[5px] animate-blink rounded-full bg-n500"
          />
        ))}
      </span>
      {children}
    </div>
  );
}

export function AssistantPanel() {
  const open = useAssistantStore((s) => s.open);
  const messages = useAssistantStore((s) => s.messages);
  const asking = useAssistantStore((s) => s.asking);
  const suggestions = useAssistantStore((s) => s.suggestions);
  /* 빈 상태 안내가 이 값으로 갈린다 (#463) — 추천 질문의 빈 배열로는 두 상태가 갈리지 않는다 */
  const corpusState = useAssistantStore((s) => s.corpusState);
  const suggestionsLoaded = useAssistantStore((s) => s.suggestionsLoaded);
  const resetting = useAssistantStore((s) => s.resetting);
  /*
   * 확인 시트가 떠 있는가 — 대화를 지우는 것은 되돌릴 수 없어서 묻는다(#432의 기준: 되돌릴 수
   * 없거나 그 사이의 답이 바뀌는 조작만 확인을 받는다). **말풍선의 정본이 store 하나라** 서버가
   * 지운 뒤에는 화면에도 어디에도 남지 않는다.
   *
   * 이 값이 패널의 `useState`가 아닌 이유는 store 쪽 주석에 있다 — 닫는 길 중 FAB가 이
   * 컴포넌트 밖이다.
   */
  const confirmingReset = useAssistantStore((s) => s.confirmingReset);
  const closePanel = useAssistantStore((s) => s.closePanel);
  const loadSuggestions = useAssistantStore((s) => s.loadSuggestions);
  const ask = useAssistantStore((s) => s.ask);
  const reset = useAssistantStore((s) => s.reset);
  const askResetConfirm = useAssistantStore((s) => s.askResetConfirm);
  const cancelResetConfirm = useAssistantStore((s) => s.cancelResetConfirm);

  /*
   * 흘려 받는 중인 말풍선이 있는가 (#464). `asking`과 갈리는 것은 그 값이 «요청이 도는
   * 중»이고 이것은 «글자가 오기 시작했다»이기 때문이다 — 둘 사이에 검색·임계값 판정이 있어
   * 실제로 몇 초가 흐른다.
   */
  const streaming = messages.some((message) => message.kind === "streaming");

  const [draft, setDraft] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const tailRef = useRef<HTMLDivElement>(null);

  /*
   * 추천 질문은 패널을 열 때 받아 온다 — 열지 않는 사람에게 왕복을 붙이지 않는다.
   *
   * **`READY`가 되기 전에는 열 때마다 다시 받는다**(#463 · 판정은 store에 있다). «답변에
   * 사용을 누르세요»를 읽고 그렇게 한 뒤 다시 연 운영진에게 같은 문구가 또 뜨면, 그 말이 방금
   * 한 행동을 부정한다.
   */
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
      if (e.key !== "Escape") return;
      /*
       * 확인 시트가 떠 있으면 그것만 닫는다 (#434). `Sheet`도 document에서 Esc를 받으므로
       * 여기서 함께 닫으면 한 번 누른 Esc가 시트와 패널을 같이 접는다 — 확인을 물은 자리에서
       * 취소했을 뿐인데 읽던 대화까지 사라진 것처럼 보인다.
       */
      if (confirmingReset) return;
      closePanel();
    };
    document.addEventListener("keydown", onKey);
    inputRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closePanel, confirmingReset]);

  /* 새 말풍선이 붙으면 끝으로 따라간다 — 답이 화면 아래에 숨은 채 도착하지 않게 한다 */
  useEffect(() => {
    if (open) tailRef.current?.scrollIntoView({ block: "end" });
  }, [open, messages, asking, resetting]);

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
        onKeyDown={(e) => {
          /*
            확인 시트가 떠 있는 동안에는 가두지 않는다 (#434). 시트는 패널 밖(형제)에 그려지고
            `z-[90]`으로 그 위에 있으므로, 여기서 계속 Tab을 패널 안으로 되돌리면 초점이
            «지우기»·«취소»에 닿지 못한다 — 확인을 물어 놓고 키보드로는 답할 수 없게 된다.
          */
          if (confirmingReset) return;
          trapFocus(e, panelRef.current);
        }}
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
            `↺` 초기화 (#434) — **대화가 있을 때만 그린다.** 지울 것이 없는 자리에 두면 누른
            사람이 무엇이 지워졌는지 알 수 없고, 이미 «처음 상태»인 화면은 눌러도 바뀌지
            않는다. Phase 1이 이 버튼을 아예 그리지 않은 이유(아무 일도 하지 않는 버튼)가
            빈 대화에서는 여전히 그대로다.

            초기화가 도는 동안 잠근다 — 두 번 눌러 봐야 두 번째는 이미 지워진 값을 지운다.
          */}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={askResetConfirm}
              disabled={asking || resetting}
              aria-label="대화 지우기"
              title="대화 지우기"
              className="flex size-7 flex-none cursor-pointer items-center justify-center rounded-[9px] border border-line text-[14px] text-n400 hover:border-accent hover:text-accent disabled:cursor-default disabled:opacity-50 disabled:hover:border-line disabled:hover:text-n400"
            >
              <span aria-hidden="true">↺</span>
            </button>
          )}
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

          ⚠️ **흘려 받는 동안에는 알림을 끈다** (#464). 조각이 붙을 때마다 이 영역이 바뀌므로
          켜 둔 채로 두면 보조기기가 **답변을 몇 글자씩 수십 번 되읽는다** — 도착을 알리려던
          것이 오히려 문장을 듣지 못하게 만든다. `done`으로 말풍선이 확정되는 순간 `polite`로
          돌아오고, 그때 완성된 답이 한 번 읽힌다. 진행 중이라는 사실은 `aria-busy`가 말한다.
        */}
        <div
          aria-live={streaming ? "off" : "polite"}
          aria-busy={asking || resetting}
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-[16px] py-[14px]"
        >
          {messages.length === 0 ? (
            <AssistantEmpty
              suggestions={suggestions}
              corpusState={corpusState}
              loaded={suggestionsLoaded}
              onPick={submit}
            />
          ) : (
            messages.map((message) => (
              <AssistantMessageItem key={message.id} message={message} />
            ))
          )}

          {/*
            «찾는 중»은 **한 글자도 오지 않은 동안만** 그린다 (#464). 흘려 받기 시작하면 그
            글자 자체가 진행 표시라, 말풍선을 함께 두면 답변 아래에 «아직 찾는 중»이 매달려
            무엇이 도는 중인지가 흐려진다. 문구가 «찾는» 중인 것은 실제로 그 단계라서다 —
            서버가 검색과 임계값 판정을 끝내기 전에는 첫 조각이 나오지 않는다.
          */}
          {asking && !streaming && <WaitingBubble>답변을 찾는 중입니다…</WaitingBubble>}

          {/*
            지우는 동안의 안내 (#434). **화면은 서버 응답을 기다린 뒤에 비운다**(store 주석) —
            그 사이 말풍선이 그대로 남아 있어, 이것이 없으면 누른 뒤 아무 일도 일어나지 않는
            것처럼 보인다.
          */}
          {resetting && <WaitingBubble>대화를 지우는 중입니다…</WaitingBubble>}
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

      {/*
        초기화 확인 (#434) — **되돌릴 수 없어서 묻는다**(#432의 기준). 말풍선의 정본이 store
        하나라 서버 대화를 지우고 나면 되살릴 곳이 없다.

        `Sheet`가 `z-[90]`이라 패널(`z-[89]`) 위에 온전히 뜬다 — 여기서만은 저 컴포넌트를 쓰는
        것이 맞다. 패널이 `Sheet`를 쓰지 않은 이유는 «확인·취소로 끝나지 않아서»였는데, 이
        물음은 정확히 확인·취소로 끝난다.
      */}
      <Sheet
        open={confirmingReset}
        title="대화를 지울까요?"
        onClose={cancelResetConfirm}
        onOk={() => void reset()}
        okLabel="지우기"
        okVariant="danger"
      >
        <div className="text-[14px] leading-[1.8] text-n400">
          지금까지 주고받은 질문과 답변이 사라지고 다음 질문은 새 대화로 시작합니다. 되살리는
          길은 없으니, 남겨야 할 조항이 있으면 먼저 옮겨 적어주세요.
        </div>
      </Sheet>
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
