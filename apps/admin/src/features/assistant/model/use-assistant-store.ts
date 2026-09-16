"use client";

import { create } from "zustand";
import {
  askAssistantStreaming,
  deleteAssistantConversation,
  fetchAssistantSuggestions,
  ASSISTANT_ERROR,
  type AssistantAnswer,
  type AssistantCorpusState,
} from "@/entities/assistant";
import { ApiError } from "@/shared/lib/api/client";
import { toAssistantErrorMessage, toAssistantResetErrorMessage } from "./assistant-error";

/*
 * 규정 도우미의 상태 (#433 · 기획안 §7.4 · §13.1).
 *
 * ── 왜 store인가 ───────────────────────────────────────────────
 * **라우트를 옮겨도 대화가 남아야 한다.** 승인함에서 물어본 조항을 들고 회원 화면으로 가서
 * 이어 묻는 것이 이 기능의 쓰임이다. `useState`를 패널에 두면 패널이 닫힐 때 사라지고, 셸
 * 컴포넌트에 두면 그 컴포넌트가 다시 마운트될 때 사라진다 — 모듈 수준 store는 둘 다 겪지
 * 않는다(`(admin)` layout이 라우트 이동에 다시 마운트되지 않는다는 전제에 기대지 않아도 된다).
 *
 * ── 이력은 화면이 정본으로 들고 있다 ───────────────────────────
 * 서버는 앞선 턴을 내려주지 않는다(모델에게 줄 맥락일 뿐이다). 그래서 말풍선 목록은 이
 * store가 유일한 정본이고, 새로고침하면 사라지는 것이 정상이다 — 서버도 질문·답변을 어디에도
 * 남기지 않는다(§11).
 *
 * ── `↺`가 이제 서는 자리 (#434) ────────────────────────────────
 * Phase 1이 초기화 버튼을 그리지 않은 것은 **아무 일도 하지 않는 버튼이 사용자를 초기화됐다고
 * 믿게 만들기** 때문이었다 — 서버에 대화 메모리가 없어 지울 것이 화면 쪽에만 있었다. 서버
 * #406이 `AssistantMemoryStore`를 세우면서 양쪽에 지울 것이 생겼고, 그래서 **버튼이 하는 일이
 * 믿음과 같아진다**: 서버 대화를 지우고 화면을 처음 상태로 되돌린다.
 *
 * ── 대화는 이어 간다 ───────────────────────────────────────────
 * 후속 질문은 같은 `conversationId`로 나가고 **앞선 말풍선을 지우지 않는다**. 24시간 슬라이딩
 * 만료로 서버 이력이 비어도 마찬가지다 — 그때 서버는 빈 이력 위에서 답할 뿐 오류를 내지
 * 않으므로 화면에는 **새 대화처럼 보이는 것이 맞다**(이슈). 이 store가 값의 나이를 재지 않는
 * 이유가 그것이다.
 */

/** 화면에 그리는 말풍선 하나 */
export type AssistantMessage =
  | { kind: "question"; id: number; text: string }
  /**
   * 흘러 들어오는 중인 답 (#464). **`answer`와 다른 종류로 둔다** — 아직 인용도 판본도
   * 확정되지 않았고, 본문의 `[3]`을 표기로 갈아 그릴 수도 없다(그러려면 인용이 있어야 한다).
   * 한 종류로 뭉쳐 «인용이 아직 비었을 뿐»으로 다루면 **거절(`citations`가 빈 배열)과 구별되지
   * 않아** 흘러 들어오는 문장 옆에 «근거 없음»이 먼저 뜬다.
   */
  | { kind: "streaming"; id: number; text: string }
  /** 서버가 답했거나(`answered`) 근거를 찾지 못했다(거절) — 둘 다 정상 응답이다 */
  | { kind: "answer"; id: number; answer: AssistantAnswer }
  /** 오류 — 거절과 다르다. 거절은 «답이 없다»이고 이것은 «묻지 못했다»다 */
  | { kind: "error"; id: number; text: string };

interface AssistantState {
  open: boolean;
  messages: AssistantMessage[];
  /** 질의가 도는 중 — 입력과 전송을 잠그고 «답변을 찾는 중» 말풍선을 그린다 */
  asking: boolean;
  /** 서버가 내린 추천 질문(최대 3개). **빈 배열이 `READY`가 아닌 동안의 정상 상태다** */
  suggestions: string[];
  /**
   * 코퍼스가 지금 답할 수 있는가 (#463) — 빈 상태 안내가 이 값으로 갈린다.
   *
   * **`suggestions.length === 0`으로는 갈리지 않는다.** 그 빈 배열은 «코퍼스가 비었다»와
   * «문서는 있는데 시행 중인 것이 없다» 둘 다였고, 앞쪽으로만 읽은 탓에 화면이 이미 올린
   * 문서를 올리라고 말했다. 조회 전 초깃값이 `EMPTY`인 것은 무해하다 — `suggestionsLoaded`가
   * 참이 되기 전에는 어떤 안내도 그리지 않는다.
   */
  corpusState: AssistantCorpusState;
  /**
   * 조회가 **끝났는가**(성공이든 실패든). 화면은 이 값이 참이 된 뒤에야 안내를 그린다 —
   * 조회 중에도 상태는 초깃값이라, 이것 없이 그리면 문서가 있는 환경에서도 «등록된 규정
   * 문서가 없습니다»가 한 번 번쩍인다.
   */
  suggestionsLoaded: boolean;
  /** 조회가 **도는 중인가** — 재진입을 막는 값이라 `suggestionsLoaded`와 갈린다 */
  suggestionsLoading: boolean;
  /**
   * 이어 갈 대화 — **서버가 발급한 값**을 그대로 들고 있다가 다음 질문에 싣는다.
   *
   * 24시간 쓰이지 않으면 서버에서 만료되어 **빈 이력으로 이어진다** — 오류가 아니라 새 대화처럼
   * 보이는 것이 정상이라, 화면은 이 값의 나이를 재지 않는다.
   */
  conversationId: string | null;
  /**
   * 초기화가 도는 중 — `↺`를 잠근다.
   *
   * `asking`과 갈라 두는 것은 둘이 함께 돌 수 있어서가 아니라(서로 막는다) **잠기는 버튼이
   * 다르기** 때문이다. 한 값으로 뭉치면 질문을 보내는 동안 `↺`가 «초기화 중»으로 보인다.
   */
  resetting: boolean;
  /**
   * 초기화 확인 시트가 떠 있는가 (#434).
   *
   * **패널의 `useState`가 아니라 여기 둔다.** 패널은 `open`이 false일 때 언마운트되지 않고
   * null만 그리므로 그쪽 state는 닫아도 살아남는다 — 확인을 띄운 채 FAB로 닫았다 다시 열면
   * 묻지도 않은 «대화를 지울까요?»가 먼저 떠 있다. 닫는 길이 셋(FAB · ✕ · Esc · 스크림)인데
   * **그중 FAB는 패널 밖**이라, 닫는 동작을 쥔 이 store에서 함께 접는 것이 빠짐없는 유일한
   * 자리다.
   */
  confirmingReset: boolean;

  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  askResetConfirm: () => void;
  cancelResetConfirm: () => void;
  loadSuggestions: () => Promise<void>;
  ask: (question: string) => Promise<void>;
  reset: () => Promise<void>;
}

let nextId = 0;
const newId = () => (nextId += 1);

export const useAssistantStore = create<AssistantState>((set, get) => ({
  open: false,
  messages: [],
  asking: false,
  suggestions: [],
  corpusState: "EMPTY",
  suggestionsLoaded: false,
  suggestionsLoading: false,
  conversationId: null,
  resetting: false,
  confirmingReset: false,

  openPanel: () => set({ open: true }),
  /* 닫을 때 확인도 함께 접는다 — 위 `confirmingReset` 주석 */
  closePanel: () => set({ open: false, confirmingReset: false }),
  togglePanel: () => set((s) => ({ open: !s.open, confirmingReset: false })),
  askResetConfirm: () => set({ confirmingReset: true }),
  cancelResetConfirm: () => set({ confirmingReset: false }),

  /**
   * 추천 질문과 코퍼스 상태를 받아 온다 — **`READY`가 되기 전까지는 열 때마다 다시**(#463).
   *
   * ── 왜 한 번으로는 안 되는가 ───────────────────────────────────
   * 한 번만 받으면 «시행을 누르세요»를 읽고 → RAG › 설정에서 시행하고 → 패널을 다시 연
   * 운영진에게 **여전히 «시행을 누르세요»**가 뜬다. 옛 문구에서는 «한 번 틀린다»였지만 새
   * 문구는 사용자가 방금 한 행동을 부정하는 말이라 그대로 둘 수 없다. 다시 받는 것은 싸다 —
   * 이 엔드포인트는 DB만 읽고 모델에 닿지 않아 질의 한도를 세지 않는다(서버 §11).
   *
   * ── `READY`가 된 뒤에는 다시 받지 않는다 ───────────────────────
   * 그 상태에서 바뀔 것은 추천 질문 문구뿐이고, 그것 때문에 패널을 열 때마다 왕복을 붙일
   * 이유가 없다. `suggestionsLoading`은 그대로 재진입만 막는다.
   *
   * **옛 서버(`corpusState`를 내리지 않는다)에서도 이 규칙이 옳다.** 그때 값은 폴백으로
   * 정해지는데, 질문이 있으면 `READY`라 종전처럼 한 번만 받고, 없으면 `EMPTY`라 열 때마다
   * 다시 받는다 — 문서가 생기면 알아차려야 하는 바로 그 상태다.
   *
   * 실패해도 오류로 그리지 않는다 — 추천 질문이 없는 것은 코퍼스가 빈 것과 화면에서 같은
   * 모양이라 사용자가 잃는 것이 없고, 실패를 빨갛게 그리면 «답을 물을 수는 있는데 화면은
   * 빨간» 상태가 된다. 대신 `READY`가 아닌 채로 남으므로 **다음에 열 때 다시 시도한다**.
   */
  loadSuggestions: async () => {
    const { corpusState, suggestionsLoaded, suggestionsLoading } = get();
    if (suggestionsLoading) return;
    if (suggestionsLoaded && corpusState === "READY") return;
    set({ suggestionsLoading: true });
    try {
      const { corpusState: state, questions } = await fetchAssistantSuggestions();
      set({ suggestions: questions, corpusState: state });
    } catch {
      /*
       * 조회하지 못했으면 **직전 값을 그대로 둔다.** 비우면 시행을 누른 뒤 열었다가 조회가
       * 한 번 실패했을 때 «문서가 없습니다»로 되돌아가는데, 그것은 방금 본 것보다 나쁜
       * 거짓말이다. 초회 실패라면 초깃값(`EMPTY` · 빈 배열)이 그대로 남는다.
       */
    } finally {
      /*
       * 실패해도 «끝났다»로 둔다 — 실패를 이유로 계속 「불러오는 중」에 머무르면 안내가 영영
       * 그려지지 않는다. `READY`가 아니므로 다음에 열 때 다시 시도한다.
       */
      set({ suggestionsLoaded: true, suggestionsLoading: false });
    }
  },

  /**
   * 질문 하나 — **답을 흘려 받는다** (#464 · 서버 #447).
   *
   * ── 말풍선이 두 단계를 지난다 ─────────────────────────────────
   * 첫 조각이 닿으면 `streaming` 말풍선을 붙여 글자를 이어 붙이고, `done`이 오면 **같은
   * 자리를** `answer`로 갈아 끼운다(뒤에 새로 붙이지 않는다 — 그러면 같은 문장이 두 번 그려진
   * 뒤 하나가 사라진다). 그 교체 시점에 인용·판본 배지가 확정되고 본문의 `[3]`이 표기로
   * 바뀐다(`withCitationMarkers` — 그리는 쪽에서 한다).
   *
   * ── 흘려보내기 시작한 뒤의 실패는 글자를 남긴다 ───────────────
   * 서버가 `error` 이벤트로 내리는 실패다(상태 코드를 바꿀 수 없는 자리). 그때 **이미 그려진
   * 글자를 지우지 않는다** — 읽던 문장을 화면에서 빼앗지 않는 것이 서버가 «사후 철회»를 기각한
   * 이유와 같고, 대신 오류 말풍선을 그 아래에 덧붙여 «여기서 끊겼다»를 밝힌다. 한 글자도
   * 받지 못한 실패(첫 바이트 전의 거절)는 종전처럼 오류 말풍선 하나로 끝난다.
   */
  ask: async (question: string) => {
    const trimmed = question.trim();
    const { asking, resetting } = get();
    /*
     * 초기화가 도는 중에는 묻지 않는다 — 지우기 요청이 날아가는 사이에 보낸 질문은 방금 지운
     * 대화를 되살리거나(서버가 지우기 전에 도착) 지워진 자리에 홀로 남는다(뒤에 도착). 어느
     * 쪽이든 «초기화했다»와 화면이 어긋난다.
     */
    if (!trimmed || asking || resetting) return;

    set((s) => ({
      messages: [...s.messages, { kind: "question", id: newId(), text: trimmed }],
      asking: true,
    }));

    /*
     * 흘러 들어오는 말풍선의 식별자. **첫 조각이 닿을 때 붙인다** — 미리 빈 말풍선을 두면
     * 근거를 찾지 못한 거절(조각이 한 번도 오지 않고 `done` 하나만 온다)에서 빈 상자가
     * 잠깐 그려진다.
     */
    let streamingId: number | null = null;

    const appendDelta = (text: string) => {
      set((s) => {
        if (streamingId === null) {
          streamingId = newId();
          return { messages: [...s.messages, { kind: "streaming", id: streamingId, text }] };
        }
        return {
          messages: s.messages.map((message) =>
            message.id === streamingId && message.kind === "streaming"
              ? { ...message, text: message.text + text }
              : message,
          ),
        };
      });
    };

    try {
      const answer = await send(trimmed, get().conversationId, appendDelta);
      set((s) => ({
        /* 흘러 들어오던 자리를 확정된 답으로 갈아 끼운다 — 없었으면(거절) 뒤에 붙인다 */
        messages:
          streamingId === null
            ? [...s.messages, { kind: "answer", id: newId(), answer }]
            : s.messages.map((message) =>
                message.id === streamingId
                  ? { kind: "answer", id: message.id, answer }
                  : message,
              ),
        asking: false,
        /*
         * 발급된 값을 갱신한다 — 거절일 때도 실려 오므로 근거를 찾지 못한 첫 질문 뒤에 이어
         * 묻는 흐름이 끊기지 않는다. 비어 오면 들고 있던 값을 유지한다(다음 질문이 새 대화를
         * 여는 것보다 이어 가는 쪽이 사용자의 뜻에 가깝다).
         */
        conversationId: answer.conversationId ?? s.conversationId,
      }));
    } catch (error) {
      /*
       * **그리다 끊긴 글자는 그대로 둔다.** `streaming` 말풍선을 `answer`로 세우지 않는 것은
       * 인용도 판본도 확정되지 않았기 때문이다 — 그 자리에 «근거 없음»을 그리면 서버가 실제로
       * 그렇게 판정한 답과 구별되지 않는다.
       */
      set((s) => ({
        messages: [
          ...s.messages,
          { kind: "error", id: newId(), text: toAssistantErrorMessage(error) },
        ],
        asking: false,
      }));
    }
  },

  /**
   * `↺` 초기화 — **서버 대화를 지우고 화면을 처음 상태로 되돌린다**.
   *
   * ── 화면을 언제 비우는가 ───────────────────────────────────────
   * **서버 응답을 기다린 뒤에 비운다.** 먼저 비우면 지우기가 실패했을 때 되돌릴 말풍선이
   * 우리 손에 없고(이 store가 이력의 정본이다), 사용자는 지워진 화면을 보며 초기화됐다고
   * 믿는데 서버에는 대화가 그대로 남는다 — Phase 1이 `↺`를 그리지 않은 이유가 바로 그
   * 어긋남이었다.
   *
   * ── 실패를 어떻게 다루는가 ─────────────────────────────────────
   * 실패하면 **화면을 그대로 두고 오류 말풍선만 붙인다.** 지우지 못했는데 비우면 같은 어긋남이
   * 생긴다. 다만 403 `CONVERSATION_FORBIDDEN`은 실패가 아니다 — 지우려던 대화에 이미 닿을 수
   * 없다는 뜻이고 그것은 사용자가 바란 결과와 같다(만료·재로그인이 이 코드를 만든다).
   *
   * ── 추천 질문은 다시 받지 않는다 ───────────────────────────────
   * `suggestions`·`corpusState`·`suggestionsLoaded`를 남긴다. 코퍼스가 이 몇 초 사이에 바뀌지
   * 않으므로 왕복만 늘고, 비워 두면 초기 화면이 안내만으로 한 번 그려졌다가 추천 질문이
   * 뒤늦게 끼어든다 — 되돌아간 «처음 상태»가 처음과 다르게 보인다. **#463의 재조회와
   * 어긋나지 않는다**: 그쪽은 «패널을 닫았다 여는 사이에 코퍼스가 바뀔 수 있다»를 다루고
   * 이쪽은 그 사이가 몇 초인 경우다.
   */
  reset: async () => {
    const { asking, resetting, conversationId } = get();
    if (asking || resetting) return;

    /*
     * 서버가 발급한 대화가 아직 없다 — 첫 질문 전이거나 모든 질의가 실패한 뒤다. 지울 것이
     * 서버에 없으므로 왕복 없이 화면만 되돌린다.
     */
    if (conversationId === null) {
      set({ messages: [], confirmingReset: false });
      return;
    }

    set({ resetting: true, confirmingReset: false });
    try {
      await deleteAssistantConversation(conversationId);
      set({ messages: [], conversationId: null, resetting: false });
    } catch (error) {
      const gone =
        error instanceof ApiError && error.code === ASSISTANT_ERROR.CONVERSATION_FORBIDDEN;
      if (gone) {
        set({ messages: [], conversationId: null, resetting: false });
        return;
      }
      set((s) => ({
        messages: [
          ...s.messages,
          { kind: "error", id: newId(), text: toAssistantResetErrorMessage(error) },
        ],
        resetting: false,
      }));
    }
  },
}));

/**
 * 질의 한 번 — **대화 식별자가 거절당하면 새 대화로 한 번만 다시 보낸다**.
 *
 * 서버가 그렇게 하라고 정한 복구다(«들고 있던 값을 버리고 새 대화로 다시 보내면 된다»).
 * 만료·초기화·다른 계정으로의 재로그인이 이 403을 만드는데, 그것을 오류로 그리면 사용자는
 * 자기가 방금 친 질문이 왜 실패했는지 알 수 없고 할 수 있는 일도 없다 — 다시 누르는 것으로는
 * 같은 값을 또 보내게 되어 영원히 같은 자리에 머문다.
 *
 * 재시도는 **한 번뿐이다.** 새 대화로 보낸 요청이 또 같은 코드로 거절당하면 우리가 고칠 수
 * 있는 것이 아니다.
 *
 * ⚠️ **한 글자라도 그린 뒤에는 다시 보내지 않는다** (#464). 403 `CONVERSATION_FORBIDDEN`은
 * 대화 식별자를 검증하는 자리에서 나므로 **첫 바이트 전에** 온다 — 그 뒤에 이 코드가 오는
 * 길은 계약에 없다. 그래도 조건에 못 박아 두는 것은, 만약 온다면 재시도가 **이미 읽힌 문장
 * 뒤에 답을 처음부터 다시 이어 붙이기** 때문이다. 같은 문단이 두 번 적힌 답변은 끊긴 답변보다
 * 나쁘다.
 */
async function send(
  question: string,
  conversationId: string | null,
  onDelta: (text: string) => void,
): Promise<AssistantAnswer> {
  /* 이번 시도에서 화면에 내보낸 글자가 있는가 — 재시도를 막는 값이다 */
  let streamed = false;

  const run = async (id: string | null): Promise<AssistantAnswer> => {
    for await (const event of askAssistantStreaming(question, id)) {
      if (event.kind === "delta") {
        streamed = true;
        onDelta(event.text);
        continue;
      }
      return event.answer;
    }
    /*
     * `done` 없이 흐름이 끝났다 — 서버가 답을 확정하지 못한 채 닫혔다는 뜻이다. 조용히 넘기면
     * 흘러 들어오던 말풍선이 인용도 배지도 없이 «흘러 들어오는 중» 모양으로 굳는다.
     */
    throw new ApiError(
      ASSISTANT_ERROR.UPSTREAM_FAILED,
      "답변이 끝나기 전에 연결이 끊어졌습니다",
    );
  };

  try {
    return await run(conversationId);
  } catch (error) {
    const forbidden =
      error instanceof ApiError && error.code === ASSISTANT_ERROR.CONVERSATION_FORBIDDEN;
    if (!forbidden || conversationId === null || streamed) throw error;
    return await run(null);
  }
}
