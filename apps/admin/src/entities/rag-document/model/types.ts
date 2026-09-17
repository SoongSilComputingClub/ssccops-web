/*
 * 규정 도우미 코퍼스의 문서 (#432 · #460 · 서버 #399·#400·#401 · ADR-0034로 판본 개념이 없어졌다).
 *
 * **상태가 두 축이다.** 색인 상태(`indexStatus`)는 워커가 적는 값이고 적용 상태(`applyStatus`)는
 * 사람이 정하는 값이다 — 섞어 한 열로 그리면 「색인은 끝났지만 아직 답변에 쓰이지 않는 문서」를
 * 표현할 수 없는데, 첫 업로드 대상이 바로 그것이다(#432).
 */

/** 색인 진행 — 워커가 적는다. 화면은 읽기만 하고 PATCH로 바꾸지 않는다 */
export type RagIndexStatus = "PENDING" | "INDEXING" | "INDEXED" | "FAILED";

/** 적용 여부 — 사람이 정한다. `EFFECTIVE`인 문서만 도우미의 답변 근거가 되며 여러 건일 수 있다 */
export type RagApplyStatus = "DRAFT" | "EFFECTIVE" | "SUPERSEDED";

/**
 * 문서 유형 — 요청이 신고하지 않고 **확장자가 정한다**(서버 `RagDocumentFormat`).
 * `.md`는 회칙 계약(장·조)을 검사하는 `STRUCTURED`, `.pdf`·`.docx`는 `GENERIC`이다.
 */
export type RagDocumentType = "STRUCTURED" | "GENERIC";

/**
 * 목록의 한 행. **업로드·재색인·적용 전환의 응답도 같은 모양이다**(서버 `RagDocumentResponse`
 * 주석) — 그래서 업로드 직후의 행과 다시 받은 목록의 행을 화면이 다르게 그릴 일이 없다.
 */
export interface RagDocument {
  ragDocId: number;
  name: string;
  docType: RagDocumentType;
  indexStatus: RagIndexStatus;
  applyStatus: RagApplyStatus;
  originalFileName: string;
  /** 바이트. 표에서 KB·MB로 줄여 그린다 */
  fileSize: number | null;
  /** 색인이 끝나야 채워진다 — 그 전에는 null이고 표는 그 자리에 «—»를 그린다 */
  chunkCount: number | null;
  /** `FAILED`일 때만 있다. 실패 배지의 툴팁이 이것을 싣는다 */
  failureReason: string | null;
  /** `DRAFT`에 비어 있는 것이 정상이다 — 의결 전 개정안에는 발효일이 없다 */
  effectiveFrom: string | null;
  createdAt: string | null;
}

/**
 * 카드 셋이 쓰는 요약. **목록 응답에 함께 실려 온다**(#401) — 별도 요청으로 나누면 두 요청
 * 사이에 색인이 끝나 카드와 표가 다른 시점을 가리킨다.
 *
 * `q`로 걸러도 이 값은 **언제나 코퍼스 전체**다(서버 계약).
 */
export interface RagCorpusSummary {
  registeredCount: number;
  indexedCount: number;
  /** 활성 청크(색인 완료이고 내려두지 않은 것)의 합 — 워커가 상한 3,000을 볼 때와 같은 수 */
  totalChunkCount: number;
}

export interface RagDocumentList {
  summary: RagCorpusSummary;
  documents: RagDocument[];
}
