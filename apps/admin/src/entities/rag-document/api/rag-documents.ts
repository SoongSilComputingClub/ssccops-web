import { ApiError, apiFetch, apiUpload } from "@/shared/lib/api/client";
import type {
  RagApplyStatus,
  RagDocument,
  RagDocumentList,
  RagDocumentType,
  RagIndexStatus,
} from "../model/types";

/*
 * 규정 도우미 코퍼스 API (ssccops-server #399 · #401 · `/v1/assistant/documents`).
 *
 * **인가는 여섯 경로 모두 RAG_DOCUMENT_MANAGE 하나다**(서버 클래스 레벨 `@RequireAuthority`).
 * 목록 조회도 예외가 아니라서 라벨 관리처럼 "목록은 누구나"가 성립하지 않는다 — 메뉴를 감추는
 * 근거가 된다(nav.ts · 템플릿 관리와 같은 자리).
 *
 * 목록에 `page` 봉투가 없다. 이 표는 규정 문서 한 건씩이라 행이 수십 단위라고 서버가 정했고
 * 그래서 `apiFetchList`가 아니라 `apiFetch`로 받는다 — '더 보기'도 없다.
 */

/** 코퍼스 API가 돌려주는 오류 코드 (서버 `AssistantErrorCode`) */
export const RAG_DOCUMENT_ERROR = {
  /** `.md`·`.pdf`·`.docx` 밖의 확장자 (400) */
  UNSUPPORTED_TYPE: "RAG_DOCUMENT_UNSUPPORTED_TYPE",
  /** 10MB 초과 (413) — 화면이 먼저 막지만 서버 판정이 방어선이다 */
  TOO_LARGE: "RAG_DOCUMENT_TOO_LARGE",
  /**
   * 파싱 실패 (400). `.md`는 **몇째 줄이 왜 걸렸는지**가 `message`에 실린다 — 그래서 이
   * 코드만은 서버 문장을 뭉개지 않고 그대로 보여 준다(features/rag-document의 문구 매핑).
   */
  PARSE_FAILED: "RAG_DOCUMENT_PARSE_FAILED",
  /** 활성 청크 총량 3,000 초과 (409) */
  LIMIT_EXCEEDED: "RAG_DOCUMENT_LIMIT_EXCEEDED",
  /** 색인이 끝나지 않은 문서를 «답변에 사용»하려 했다 (409) — 화면이 버튼을 미리 잠근다 */
  NOT_INDEXED: "RAG_DOCUMENT_NOT_INDEXED",
  /** 성립하지 않는 적용 상태 전이 (400) */
  INVALID_APPLY_TRANSITION: "INVALID_RAG_APPLY_STATUS_TRANSITION",
  /** 이미 대기 중인 문서에 재색인을 불렀다 (400) */
  INVALID_INDEX_TRANSITION: "INVALID_RAG_INDEX_STATUS_TRANSITION",
  /** 없는 문서 (404) — 삭제가 하드라 «없음»이 정상 상태다 */
  NOT_FOUND: "RAG_DOCUMENT_NOT_FOUND",
  /** 적재 레이트 리밋 — 회원당 하루 10건 (429) */
  RATE_LIMITED: "ASSISTANT_RATE_LIMITED",
  /** 기능 플래그가 꺼져 있다 (404) */
  DISABLED: "ASSISTANT_DISABLED",
} as const;

/**
 * 업로드 상한 — **서버와 같은 값**(서버 `RAG_DOCUMENT_TOO_LARGE`는 413이다).
 *
 * 화면이 먼저 막는 것은 10MB를 다 올린 뒤 거절받지 않기 위해서고, 그렇다고 서버 판정을
 * 없애지 않는다 — 둘 중 하나만 남기면 다른 경로로 들어온 요청이 막히지 않는다(#432).
 */
export const RAG_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

/** 받는 확장자 — 유형은 요청이 신고하지 않고 이것이 정한다(서버 `RagDocumentFormat`) */
export const RAG_DOCUMENT_EXTENSIONS = [".md", ".pdf", ".docx"] as const;

/* ── 서버 응답(Response DTO) ────────────────────────────────── */

interface RagDocumentResponse {
  ragDocId: number;
  name: string | null;
  docType: RagDocumentType | null;
  indexStatus: RagIndexStatus | null;
  applyStatus: RagApplyStatus | null;
  originalFileName: string | null;
  fileSize: number | null;
  chunkCount: number | null;
  failureReason: string | null;
  effectiveFrom: string | null;
  createdAt: string | null;
}

interface RagCorpusSummaryResponse {
  registeredCount: number | null;
  indexedCount: number | null;
  totalChunkCount: number | null;
}

interface RagDocumentListResponse {
  summary: RagCorpusSummaryResponse | null;
  documents: RagDocumentResponse[] | null;
}

/* ── 응답 → 도메인 ─────────────────────────────────────────── */

/**
 * 없는 값을 만들어 내지 않는다 — `chunkCount`·`failureReason`·`effectiveFrom`은 비어 있는 것이
 * 정상 상태이고, 빈 자리를 «—»로 채우는 것은 표시 규칙이라 그리는 쪽이 정한다(AGENTS.md).
 *
 * 상태 두 값만은 기본값을 둔다. 배지를 그리려면 반드시 무엇이든 있어야 하는데, 서버가 이
 * 둘을 비우는 경우는 계약에 없다 — 옛 서버에 붙었을 때 배지가 통째로 비어 «상태를 모르는 행»이
 * 되는 것보다 «대기»·«개정안»으로 보이는 편이 읽는 사람에게 덜 틀리다.
 */
function toRagDocument(res: RagDocumentResponse): RagDocument {
  return {
    ragDocId: res.ragDocId,
    name: res.name ?? "",
    docType: res.docType ?? "GENERIC",
    indexStatus: res.indexStatus ?? "PENDING",
    applyStatus: res.applyStatus ?? "DRAFT",
    originalFileName: res.originalFileName ?? "",
    fileSize: res.fileSize,
    chunkCount: res.chunkCount,
    failureReason: res.failureReason,
    effectiveFrom: res.effectiveFrom,
    createdAt: res.createdAt,
  };
}

/* ── 조회 ──────────────────────────────────────────────────── */

/**
 * GET /v1/assistant/documents — 목록 + 요약 3값.
 *
 * **검색은 서버 `q`다**(#401) — 클라이언트 필터가 아니라. 문서가 몇 건이든 같은 코드이고,
 * 요약은 `q`와 무관하게 언제나 코퍼스 전체다.
 */
export async function fetchRagDocuments(keyword = ""): Promise<RagDocumentList> {
  const q = keyword.trim();
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  const res = await apiFetch<RagDocumentListResponse | null>(
    `/v1/assistant/documents${qs}`,
  );

  return {
    summary: {
      registeredCount: res?.summary?.registeredCount ?? 0,
      indexedCount: res?.summary?.indexedCount ?? 0,
      totalChunkCount: res?.summary?.totalChunkCount ?? 0,
    },
    documents: (res?.documents ?? []).map(toRagDocument),
  };
}

/* ── 업로드 ────────────────────────────────────────────────── */

export interface RagDocumentUploadInput {
  file: File;
  /** 비우면 서버가 파일명에서 확장자를 뗀 것을 표시명으로 쓴다 */
  name?: string;
}

/**
 * POST /v1/assistant/documents — 업로드.
 *
 * **응답은 201 + `indexStatus: PENDING`이고 목록 한 행과 같은 모양이다.** 그래서 호출부는 이
 * 값으로 표에 «대기» 행을 곧바로 그린다 — 202였다면 그릴 것이 없었다(서버 #399).
 *
 * `name`을 파트가 아니라 **폼 필드로** 보낸다(서버 컨트롤러가 `@RequestParam`으로 받는다 ·
 * CSV 이관과 같은 모양). 파싱은 이 요청 안에서 끝나므로 계약 위반은 그 자리에서 400이고,
 * 오래 걸리는 임베딩만 워커가 뒤에서 집어 간다.
 *
 * **문서 식별자를 보내지 않는다**(서버 ADR-0034). 문서 한 건이 곧 그 규정이라 묶을 것이 없고,
 * 규정을 갱신할 때는 옛 문서를 지우고 새로 올린다.
 */
export async function uploadRagDocument(
  input: RagDocumentUploadInput,
): Promise<RagDocument> {
  const form = new FormData();
  form.append("file", input.file);

  const name = input.name?.trim() ?? "";
  if (name) form.append("name", name);

  const res = await apiUpload<RagDocumentResponse | null>(
    "/v1/assistant/documents",
    form,
  );

  /*
   * 번호 없이 성공으로 처리하지 않는다. 이 응답이 곧 표에 꽂을 행이라, 번호가 없으면 폴링도
   * 재색인도 삭제도 걸 수 없는 «누를 수 없는 행»이 하나 남는다 (템플릿·폼 복제와 같은 판단).
   */
  if (!res?.ragDocId) {
    throw new ApiError(
      RAG_DOCUMENT_ERROR.PARSE_FAILED,
      "문서는 올라갔지만 서버가 문서 번호를 돌려주지 않았습니다. 목록을 새로고침해주세요",
    );
  }
  return toRagDocument(res);
}

/* ── 변이 ──────────────────────────────────────────────────── */

/**
 * POST /v1/assistant/documents/{id}/reindex — 색인 대기로 되돌린다.
 *
 * **상태 지정이 아니라 다시 줄을 세우는 조작이다** — 워커가 `PENDING`만 집으므로 이것이
 * 재색인의 전부다. 청크는 여기서 지우지 않고 워커가 새 청크를 넣기 직전에 지운다(중간에
 * 실패해도 직전 색인의 답이 사라지지 않는다).
 */
export async function reindexRagDocument(ragDocId: number): Promise<RagDocument | null> {
  const res = await apiFetch<RagDocumentResponse | null>(
    `/v1/assistant/documents/${ragDocId}/reindex`,
    { method: "POST" },
  );
  return res?.ragDocId ? toRagDocument(res) : null;
}

/**
 * PATCH /v1/assistant/documents/{id}/apply-status — 적용 상태 전환.
 *
 * 성립하는 전이는 `DRAFT → EFFECTIVE`와 `EFFECTIVE → SUPERSEDED` 둘뿐이다.
 *
 * **다른 행은 움직이지 않는다**(서버 ADR-0034). 예전에는 «답변에 사용»이 같은 문서 식별자의
 * 기존 사용본을 함께 내려서 목록을 다시 받아야 했는데, 판본 관리를 걷어내며 그 연쇄가 사라졌다.
 * 그래도 목록을 다시 받는 것은 그대로 둔다 — 갱신 경로를 둘로 가르지 않기 위해서다.
 *
 * `effectiveFrom`을 비우면 서버가 오늘을 넣는다.
 */
export async function changeRagDocumentApplyStatus(
  ragDocId: number,
  applyStatus: RagApplyStatus,
  effectiveFrom?: string,
): Promise<RagDocument | null> {
  const res = await apiFetch<RagDocumentResponse | null>(
    `/v1/assistant/documents/${ragDocId}/apply-status`,
    {
      method: "PATCH",
      body: JSON.stringify(
        effectiveFrom ? { applyStatus, effectiveFrom } : { applyStatus },
      ),
    },
  );
  return res?.ragDocId ? toRagDocument(res) : null;
}

/**
 * DELETE /v1/assistant/documents/{id} — **하드 삭제**다.
 *
 * 행·청크·R2 원본을 함께 지우며 되살리는 길이 없다(되돌리려면 같은 파일을 새 판본으로 올린다).
 * 폼·행사의 소프트 삭제와 갈리는 것은 그쪽이 «치우기»이고 이쪽은 «잘못 올린 파일을 없었던
 * 것으로 만들기»이기 때문이다 — 그래서 화면이 확인을 받고, 답변에 쓰이는 문서면 문구를 달리한다.
 */
export async function deleteRagDocument(ragDocId: number): Promise<void> {
  await apiFetch<null>(`/v1/assistant/documents/${ragDocId}`, { method: "DELETE" });
}
