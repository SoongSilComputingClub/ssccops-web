import { apiFetch } from "@/shared/lib/api/client";
import type {
  AssistantAnswer,
  AssistantApplyStatus,
  AssistantCitation,
  CitationType,
} from "../model/types";

/*
 * 규정 도우미 질의 API (ssccops-server #403 · #406 · `/v1/assistant`).
 *
 * **인가가 코퍼스 API와 다르다 — 여기는 인증만이다.** 규정은 회원에게 공개된 문서라 묻는 데
 * 권한이 필요하지 않고, 서버도 그래서 컨트롤러를 나눴다(`RagDocumentController`는 클래스 레벨
 * `@RequireAuthority(RAG_DOCUMENT_MANAGE)`). 패널을 `useCan`으로 감싸지 않는 근거가 이것이다.
 *
 * **거절이 정상 응답이다.** 근거를 찾지 못하면 200에 `answered: false`이며 오류가 아니다 —
 * 화면이 그 문구를 말풍선으로 그린다.
 */

/** 도우미 API가 돌려주는 오류 코드 (서버 `AssistantErrorCode`) */
export const ASSISTANT_ERROR = {
  /** 기능 플래그가 꺼져 있다 (404) — 재시도가 뜻이 없다 */
  DISABLED: "ASSISTANT_DISABLED",
  /** 키가 없어 배선이 서지 않았다 (503) */
  UNAVAILABLE: "ASSISTANT_UNAVAILABLE",
  /** 회원당 1분 5회 · 하루 50회, 그리고 전원이 나눠 쓰는 분당 한도 (429) */
  RATE_LIMITED: "ASSISTANT_RATE_LIMITED",
  /** 모델 호출이 실패했다 (503) */
  UPSTREAM_FAILED: "ASSISTANT_UPSTREAM_FAILED",
  /** 질문이 1,000자를 넘었다 (413) — 화면이 먼저 막지만 서버 판정이 방어선이다 */
  QUESTION_TOO_LONG: "ASSISTANT_QUESTION_TOO_LONG",
  /**
   * 남의 대화이거나 서버가 발급하지 않은 모양이다 (403).
   *
   * **화면이 복구할 수 있는 유일한 오류다** — 들고 있던 값을 버리고 새 대화로 다시 보내면
   * 된다(서버 주석). 그래서 이 코드만 훅이 재시도한다.
   */
  CONVERSATION_FORBIDDEN: "ASSISTANT_CONVERSATION_FORBIDDEN",
} as const;

/**
 * 질문 길이 상한 — **서버와 같은 값**(초과는 413 `ASSISTANT_QUESTION_TOO_LONG`).
 *
 * 화면이 먼저 막는 것은 1,000자를 다 적은 뒤 거절받지 않기 위해서고, 그렇다고 서버 판정이
 * 없어지는 것은 아니다 — 둘 중 하나만 남기면 다른 경로로 들어온 요청이 막히지 않는다(#432와
 * 같은 판단).
 */
export const ASSISTANT_QUESTION_MAX_LENGTH = 1000;

/* ── 서버 응답(Response DTO) ────────────────────────────────── */

interface AssistantCitationResponse {
  citationType: CitationType | null;
  docTitle: string | null;
  chapter: string | null;
  supplementary: boolean | null;
  article: string | null;
  clause: string | null;
  page: number | null;
  snippet: string | null;
}

interface AssistantQueryResponse {
  answer: string | null;
  citations: AssistantCitationResponse[] | null;
  applyStatus: AssistantApplyStatus | null;
  effectiveDate: string | null;
  answered: boolean | null;
  conversationId: string | null;
}

interface AssistantSuggestionsResponse {
  questions: string[] | null;
}

/* ── 도메인 타입으로 옮기기 ─────────────────────────────────── */

/*
 * **빈 값을 채우지 않는다**(AGENTS.md). `PAGE`인데 `page`가 없는 것은 DOCX라서 정상이고,
 * 여기서 `1`이나 `"—"`로 메우면 화면이 «값이 없다»와 «없는 것이 정상이다»를 구별하지 못한다.
 *
 * `citationType`만은 기본값을 정한다 — 없는 유형은 그릴 모양이 없는데, 조항 필드가 전부 비면
 * 조항 카드가 문서명만 그려 페이지 카드와 같아지므로 덜 주장하는 쪽(`PAGE`)으로 떨어뜨린다.
 */
function toCitation(response: AssistantCitationResponse): AssistantCitation {
  return {
    citationType: response.citationType ?? "PAGE",
    docTitle: response.docTitle,
    chapter: response.chapter,
    supplementary: response.supplementary,
    article: response.article,
    clause: response.clause,
    page: response.page,
    snippet: response.snippet,
  };
}

function toAnswer(response: AssistantQueryResponse): AssistantAnswer {
  /*
   * `answered`가 비어 온다면 판정할 근거가 없다는 뜻이므로 거절 쪽으로 떨어뜨린다 — 규정
   * 답변에서 없는 조항을 지어내는 것은 틀린 답보다 나쁘고(서버 §6.1), 그 위험은 인용 없는
   * 답을 답으로 그리는 쪽에 있다.
   */
  const answered = response.answered === true;

  return {
    answer: response.answer ?? "",
    citations: (response.citations ?? []).map(toCitation),
    applyStatus: answered ? response.applyStatus : null,
    effectiveDate: answered ? response.effectiveDate : null,
    answered,
    conversationId: response.conversationId,
  };
}

/* ── 호출 ──────────────────────────────────────────────────── */

/**
 * 질의 — `POST /v1/assistant/queries`.
 *
 * `conversationId`를 **비워 보내면 새 대화가 열리고** 서버가 발급한 값이 응답에 실려 온다.
 * 클라이언트가 만드는 값이 아니므로 화면은 받은 것을 그대로 돌려보낸다.
 */
export async function askAssistant(
  question: string,
  conversationId: string | null,
): Promise<AssistantAnswer> {
  const response = await apiFetch<AssistantQueryResponse>("/v1/assistant/queries", {
    method: "POST",
    body: JSON.stringify({ question, conversationId: conversationId ?? undefined }),
  });
  return toAnswer(response);
}

/**
 * 추천 질문 — `GET /v1/assistant/suggestions`. 최대 3개.
 *
 * **웹에 하드코딩하지 않는다**(§13.3). 코퍼스가 이제 화면에서 바뀌므로 문구를 고정하면 업로드
 * 다음 날부터 거짓말을 한다. **빈 배열이 새 환경의 정상 상태다** — 그때 화면은 고지 문구만
 * 그린다.
 */
export async function fetchAssistantSuggestions(): Promise<string[]> {
  const response = await apiFetch<AssistantSuggestionsResponse>("/v1/assistant/suggestions");
  return response.questions ?? [];
}

/**
 * 대화 지우기 — `DELETE /v1/assistant/conversations/{id}` (서버 #406).
 *
 * **`{memberId}:` 앞부분을 서버가 검증한다** — 남의 대화를 지우는 길이 없어야 하므로 질의와
 * 같은 규칙이 여기에도 걸린다. 모양이 틀리거나 남의 것이면 403 `ASSISTANT_CONVERSATION_FORBIDDEN`인데,
 * **그 거절은 지우는 쪽에서 실패가 아니다** — 지우려던 대화에 이미 닿을 수 없다는 뜻이라
 * 사용자가 바라던 결과(그 대화가 더는 이어지지 않는다)와 같다(호출부 주석).
 *
 * 응답 본문이 없다(`data: null`). `apiFetch`가 봉투의 `success`만 보므로 그대로 쓴다.
 */
export async function deleteAssistantConversation(conversationId: string): Promise<void> {
  await apiFetch<null>(`/v1/assistant/conversations/${encodeURIComponent(conversationId)}`, {
    method: "DELETE",
  });
}
