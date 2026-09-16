import { ApiError, API_ERROR, apiFetch, apiFetchStream } from "@/shared/lib/api/client";
import type {
  AssistantAnswer,
  AssistantApplyStatus,
  AssistantCitation,
  AssistantCorpusState,
  AssistantSuggestions,
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
  /** 본문의 `[3]`과 짝인 발췌 번호 (서버 #447) */
  ref: number | null;
  /** 서버가 만든 짧은 표기 — `제7조` · `p.12` · 문서명 */
  marker: string | null;
  citationType: CitationType | null;
  docTitle: string | null;
  chapter: string | null;
  supplementary: boolean | null;
  article: string | null;
  /**
   * **언제나 `null`이다**(서버 #447). DTO에 남아 있는 것은 응답 필드 삭제가 OpenAPI 하위 호환
   * 게이트에 막히기 때문이며, 도메인 타입은 이 필드를 갖지 않는다 — 여기 적어 두는 것은
   * «빠뜨린 것이 아니라 버린 것»을 다음 사람이 알아보게 하기 위해서다.
   */
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
  /**
   * 코퍼스가 지금 답할 수 있는 상태인가 (#463 · 서버 #449).
   *
   * **옛 서버는 이 필드를 내리지 않는다** — prod 가 아직 릴리스 대기다. `apiFetch`는 본문을
   * 검사하지 않고 캐스팅하므로(`envelope.data as T`) 그때 실제 값은 `undefined`이고, 위의
   * `| null`은 «그렇다더라»일 뿐이다(#462가 같은 자리에서 `vundefined`를 만들었다).
   */
  corpusState: AssistantCorpusState | null;
  questions: string[] | null;
}

/* ── 도메인 타입으로 옮기기 ─────────────────────────────────── */

/*
 * **빈 값을 채우지 않는다**(AGENTS.md). `PAGE`인데 `page`가 없는 것은 DOCX라서 정상이고,
 * 여기서 `1`이나 `"—"`로 메우면 화면이 «값이 없다»와 «없는 것이 정상이다»를 구별하지 못한다.
 *
 * `citationType`만은 기본값을 정한다 — 없는 유형은 그릴 모양이 없는데, 조항 필드가 전부 비면
 * 조항 카드가 문서명만 그려 페이지 카드와 같아지므로 덜 주장하는 쪽(`PAGE`)으로 떨어뜨린다.
 *
 * ⚠️ **없는 필드를 `?? null`로 옮긴다 — `vundefined`가 이것을 빠뜨려 생겼다**(#462).
 * `apiFetch`는 본문을 **검사하지 않고 캐스팅**하므로(`envelope.data as T`) 위 인터페이스의
 * `| null`은 «그렇다더라»이고, 서버가 필드를 빼면 실제 값은 `undefined`다. 그러면 그리는 쪽의
 * `x === null` 검사가 통과해 `` `p.${undefined}` `` 같은 문자열이 화면에 굳는다 — 판본이 사라진
 * 자리에서 실제로 그랬다. 여기서 한 번 눌러 두면 그리는 쪽이 «null 아니면 값»만 보면 된다.
 */
function toCitation(response: AssistantCitationResponse): AssistantCitation {
  return {
    /*
     * `ref`가 비어 올 자리는 계약상 없지만(서버가 언제나 싣는다) 0으로 떨어뜨린다 — 본문에
     * `[0]`이 박힐 일이 없으므로 **어느 대괄호와도 짝이 되지 않는** 값이고, 그러면 표기 치환이
     * 그 인용만 건너뛴다. `NaN`이나 배열 인덱스로 메우면 엉뚱한 대괄호를 갈아 그린다.
     */
    ref: response.ref ?? 0,
    marker: response.marker ?? null,
    citationType: response.citationType ?? "PAGE",
    docTitle: response.docTitle ?? null,
    chapter: response.chapter ?? null,
    supplementary: response.supplementary ?? null,
    article: response.article ?? null,
    page: response.page ?? null,
    snippet: response.snippet ?? null,
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
    applyStatus: answered ? (response.applyStatus ?? null) : null,
    effectiveDate: answered ? (response.effectiveDate ?? null) : null,
    answered,
    conversationId: response.conversationId ?? null,
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

/* ── 흘려 받는 질의 (SSE) ──────────────────────────────────── */

/** 흘려 받는 동안 화면에 올라오는 것 — 조각이 이어지다 답 하나로 확정된다 */
export type AssistantStreamEvent =
  /** 본문 조각. 이어 붙이면 `done`의 `answer`와 글자 하나까지 같다 */
  | { kind: "delta"; text: string }
  /** 답·인용·판본이 확정됐다. 거절도 이것 하나로 끝난다 */
  | { kind: "done"; answer: AssistantAnswer };

/** SSE `delta` 이벤트의 본문 (서버 `AssistantAnswerDeltaResponse`) */
interface AssistantAnswerDeltaResponse {
  text: string | null;
}

/**
 * SSE `error` 이벤트의 본문 (서버 `AssistantStreamErrorResponse`).
 *
 * **필드 이름이 `ApiResponse`의 오류와 같다**(`code`·`message`) — 서버가 일부러 맞춘 것이라
 * 화면의 오류 처리가 두 벌이 되지 않는다. 여기서도 그대로 `ApiError`로 세워 올린다.
 */
interface AssistantStreamErrorResponse {
  code: string | null;
  message: string | null;
}

/**
 * 흘려 받는 질의 — `POST /v1/assistant/queries/stream` (#464 · 서버 #447).
 *
 * **화면이 쓰는 경로다.** 답 한 건이 실측 7.5~12.2초인데 한 번에 받으면 그동안 화면이 비어
 * 있다 — 흘려보내면 같은 생성 시간에 첫 글자가 1~2초에 닿는다. 한 번에 받는
 * {@link askAssistant}는 **그대로 남는다**: 도구·스크립트가 «질문 하나에 JSON 하나»로 부를
 * 자리이고 골든셋이 그 길로 지표를 재며, 되돌릴 자리를 없애지 않기 위해서다(서버 주석).
 *
 * ⚠️ **이 경로의 이벤트에는 `ApiResponse` 봉투가 없다 — 전역 규약의 유일한 예외다.** 그래서
 * `apiFetch`가 아니라 `apiFetchStream`을 쓴다.
 *
 * ── 실패가 두 자리로 갈린다 ─────────────────────────────────
 * **첫 바이트 전의 거절은 종전 그대로 상태 코드 + 봉투다**(404·413·503·403·429·400) — 그것은
 * `apiFetchStream`이 `ApiError`로 던지므로 **지금의 오류 처리가 그대로 선다**. 흘려보내기
 * 시작한 뒤의 실패만 `error` 이벤트로 오는데, 그때는 상태 코드를 바꿀 수 없어 서버가 그렇게
 * 내리는 것이다. 이쪽도 같은 `ApiError`로 세워 던지되 **이미 그려진 글자는 호출부가 남긴다** —
 * 이 함수가 그것을 판단하지 않는 것은 글자를 들고 있는 쪽이 호출부라서다.
 *
 * ── 근거를 찾지 못한 거절은 오류가 아니다 ───────────────────
 * `delta`가 한 번도 오지 않고 `done` 하나가 `answered: false`를 싣는다 — 그것은 정상 응답이라
 * 여기서 던지지 않는다.
 */
export async function* askAssistantStreaming(
  question: string,
  conversationId: string | null,
  signal?: AbortSignal,
): AsyncGenerator<AssistantStreamEvent> {
  const stream = apiFetchStream("/v1/assistant/queries/stream", {
    method: "POST",
    body: JSON.stringify({ question, conversationId: conversationId ?? undefined }),
    signal,
  });

  for await (const event of stream) {
    /*
     * 본문을 읽지 못하는 이벤트는 **버리지 않고 끊는다.** 조각 하나를 조용히 건너뛰면 답변에
     * 구멍이 난 채로 그려지고, 읽는 사람에게는 그것이 모델의 문장으로 보인다.
     */
    const payload = parseEventData(event.data);

    if (event.event === "delta") {
      const delta = payload as AssistantAnswerDeltaResponse;
      /* 빈 조각은 이어 붙일 것이 없다 — 화면을 다시 그리지 않고 넘긴다 */
      if (delta.text) yield { kind: "delta", text: delta.text };
      continue;
    }

    if (event.event === "done") {
      yield { kind: "done", answer: toAnswer(payload as AssistantQueryResponse) };
      /*
       * 서버가 여기서 스트림을 닫지만 우리도 읽기를 멈춘다 — `done` 뒤에 무엇이 오든 답은
       * 이미 확정됐고, 남은 이벤트를 계속 읽으면 «확정된 답을 뒤늦게 고치는» 길이 열린다.
       */
      return;
    }

    if (event.event === "error") {
      const failure = payload as AssistantStreamErrorResponse;
      throw new ApiError(
        failure.code ?? API_ERROR.NETWORK_ERROR,
        failure.message ?? "답변을 받는 중 연결이 끊어졌습니다",
        /*
         * 상태 코드는 200이다 — 이미 헤더가 나간 뒤의 실패라서 서버가 바꿀 수 없었고, 그것이
         * 이 오류가 이벤트로 오는 이유다. `0`을 쓰면 «서버에 닿지 못했다»(CLIENT_*)로 읽히므로
         * 실제 값을 그대로 둔다.
         */
        200,
      );
    }

    /* 모르는 이름의 이벤트는 건너뛴다 — 서버가 이벤트를 더해도 화면이 깨지지 않는다 */
  }
}

/**
 * 이벤트 본문 → 객체. **파싱 실패를 조용히 넘기지 않는다**.
 *
 * 조각 하나를 버리면 답변에 구멍이 난 채 그려지는데, 읽는 사람에게는 그것이 모델의 문장으로
 * 보인다 — 규정 답변에서 그 종류의 손실은 틀린 답과 같다.
 */
function parseEventData(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    throw new ApiError(API_ERROR.NETWORK_ERROR, "답변을 읽는 중 응답이 깨졌습니다");
  }
}

/** 서버가 내리는 세 값 — 모르는 문자열을 그대로 상태로 삼지 않기 위한 대조표 */
const CORPUS_STATES: readonly AssistantCorpusState[] = ["EMPTY", "NONE_EFFECTIVE", "READY"];

/**
 * 추천 질문 — `GET /v1/assistant/suggestions`. 최대 3개 + 코퍼스 상태(#463).
 *
 * **웹에 하드코딩하지 않는다**(§13.3). 코퍼스가 이제 화면에서 바뀌므로 문구를 고정하면 업로드
 * 다음 날부터 거짓말을 한다. **빈 배열이 새 환경의 정상 상태다** — 그때 화면은 상태에 맞는
 * 안내만 그린다.
 *
 * ── 값이 비어 올 때 (#463) ─────────────────────────────────────
 * `corpusState`가 없거나 모르는 값이면 **옛 규칙으로 떨어뜨린다** — 질문이 있으면 `READY`,
 * 없으면 `EMPTY`. prod 서버가 아직 이 필드를 내리지 않으므로 그때도 화면이 종전과 똑같이
 * 성립해야 한다. `NONE_EFFECTIVE`로 떨어뜨리지 않는 것은, 그쪽이 틀리면 **문서를 올린 적도
 * 없는 새 환경에 «답변에 사용을 누르세요»**라고 말하기 때문이다(고치려던 오류의 거울상이다).
 */
export async function fetchAssistantSuggestions(): Promise<AssistantSuggestions> {
  const response = await apiFetch<AssistantSuggestionsResponse>("/v1/assistant/suggestions");
  const questions = response.questions ?? [];
  const received = response.corpusState;
  const corpusState =
    received !== null && received !== undefined && CORPUS_STATES.includes(received)
      ? received
      : questions.length > 0
        ? "READY"
        : "EMPTY";

  return { corpusState, questions };
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
