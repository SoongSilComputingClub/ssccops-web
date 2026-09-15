"use client";

import { create } from "zustand";
import {
  askAssistant,
  fetchAssistantSuggestions,
  ASSISTANT_ERROR,
  type AssistantAnswer,
} from "@/entities/assistant";
import { ApiError } from "@/shared/lib/api/client";
import { toAssistantErrorMessage } from "./assistant-error";

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
 * ── `↺`가 없는 이유 ────────────────────────────────────────────
 * Phase 1에 초기화 버튼을 그리지 않는다(이슈). 서버에 `DELETE .../conversations/{id}`가 생겼지만
 * 그것은 Phase 2의 자리이고, **아무 일도 하지 않는 버튼은 사용자가 초기화됐다고 믿게 만든다**.
 * 지울 상태가 화면에 쌓이는 지금은 store만 비우고 서버 대화는 24시간 만료에 맡기는 반쪽짜리가
 * 되는데, 그 반쪽은 «초기화했다»는 믿음과 어긋난다.
 */

/** 화면에 그리는 말풍선 하나 */
export type AssistantMessage =
  | { kind: "question"; id: number; text: string }
  /** 서버가 답했거나(`answered`) 근거를 찾지 못했다(거절) — 둘 다 정상 응답이다 */
  | { kind: "answer"; id: number; answer: AssistantAnswer }
  /** 오류 — 거절과 다르다. 거절은 «답이 없다»이고 이것은 «묻지 못했다»다 */
  | { kind: "error"; id: number; text: string };

interface AssistantState {
  open: boolean;
  messages: AssistantMessage[];
  /** 질의가 도는 중 — 입력과 전송을 잠그고 «답변을 찾는 중» 말풍선을 그린다 */
  asking: boolean;
  /** 서버가 내린 추천 질문(최대 3개). **빈 배열이 새 환경의 정상 상태다** */
  suggestions: string[];
  /**
   * 조회가 **끝났는가**(성공이든 실패든). 화면은 이 값이 참이 된 뒤에야 빈 배열을 «코퍼스가
   * 비었다»로 읽는다 — 조회 중에도 배열은 비어 있어서, 이것 없이 그리면 문서가 있는
   * 환경에서도 «등록된 규정 문서가 없습니다»가 한 번 번쩍인다.
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

  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  loadSuggestions: () => Promise<void>;
  ask: (question: string) => Promise<void>;
}

let nextId = 0;
const newId = () => (nextId += 1);

export const useAssistantStore = create<AssistantState>((set, get) => ({
  open: false,
  messages: [],
  asking: false,
  suggestions: [],
  suggestionsLoaded: false,
  suggestionsLoading: false,
  conversationId: null,

  openPanel: () => set({ open: true }),
  closePanel: () => set({ open: false }),
  togglePanel: () => set((s) => ({ open: !s.open })),

  /**
   * 추천 질문을 한 번만 받아 온다.
   *
   * 실패해도 다시 시도하지 않는다 — 추천 질문이 없는 것은 **새 환경의 정상 상태**와 같은
   * 모양이고(빈 배열), 그때 화면은 고지 문구만 그리므로 사용자가 잃는 것이 없다. 실패를
   * 오류로 그리면 «답을 물을 수는 있는데 화면은 빨간» 상태가 된다.
   */
  loadSuggestions: async () => {
    const { suggestionsLoaded, suggestionsLoading } = get();
    if (suggestionsLoaded || suggestionsLoading) return;
    set({ suggestionsLoading: true });
    try {
      set({ suggestions: await fetchAssistantSuggestions() });
    } catch {
      set({ suggestions: [] });
    } finally {
      /*
       * 실패해도 «끝났다»로 둔다 — 추천 질문이 없는 것과 코퍼스가 빈 것은 화면에서 같은
       * 모양이고(고지 문구만), 실패를 이유로 계속 「불러오는 중」에 머무르면 안내가 영영
       * 그려지지 않는다.
       */
      set({ suggestionsLoaded: true, suggestionsLoading: false });
    }
  },

  ask: async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || get().asking) return;

    set((s) => ({
      messages: [...s.messages, { kind: "question", id: newId(), text: trimmed }],
      asking: true,
    }));

    try {
      const answer = await send(trimmed, get().conversationId);
      set((s) => ({
        messages: [...s.messages, { kind: "answer", id: newId(), answer }],
        asking: false,
        /*
         * 발급된 값을 갱신한다 — 거절일 때도 실려 오므로 근거를 찾지 못한 첫 질문 뒤에 이어
         * 묻는 흐름이 끊기지 않는다. 비어 오면 들고 있던 값을 유지한다(다음 질문이 새 대화를
         * 여는 것보다 이어 가는 쪽이 사용자의 뜻에 가깝다).
         */
        conversationId: answer.conversationId ?? s.conversationId,
      }));
    } catch (error) {
      set((s) => ({
        messages: [
          ...s.messages,
          { kind: "error", id: newId(), text: toAssistantErrorMessage(error) },
        ],
        asking: false,
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
 */
async function send(question: string, conversationId: string | null): Promise<AssistantAnswer> {
  try {
    return await askAssistant(question, conversationId);
  } catch (error) {
    const forbidden =
      error instanceof ApiError && error.code === ASSISTANT_ERROR.CONVERSATION_FORBIDDEN;
    if (!forbidden || conversationId === null) throw error;
    return await askAssistant(question, null);
  }
}
