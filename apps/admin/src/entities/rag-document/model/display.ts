import type { BadgeTone } from "@/shared/ui";
import type { RagApplyStatus, RagDocumentType, RagIndexStatus } from "./types";

/*
 * 코퍼스 화면의 표시 어휘 (#432).
 *
 * **표시명이 여기 있는 것은 이 값들이 표준코드가 아니라 서버 enum이기 때문이다.** 응답이
 * raw enum만 내려오므로 한글은 화면이 갖는다 — `shared/config/codes.ts`의 시드 대조 규칙이
 * 걸리는 자리가 아니다(학술 활동 상태가 같은 판단 · #122).
 */

/**
 * 색인 진행 배지 — **넷이다.** «실패»는 목업에 없지만 서버가 내는 상태라 없으면 그 행이
 * «색인 중»인 채 영영 멈춘 것처럼 보인다(#432).
 */
export const RAG_INDEX_STATUS_NM: Record<RagIndexStatus, string> = {
  PENDING: "대기",
  INDEXING: "색인 중",
  INDEXED: "색인 완료",
  FAILED: "실패",
};

export const RAG_INDEX_STATUS_TONE: Record<RagIndexStatus, BadgeTone> = {
  PENDING: "grey",
  INDEXING: "amber",
  INDEXED: "blue",
  FAILED: "red",
};

/**
 * 적용 여부 배지 — **색인 상태와 다른 축이다**(#432).
 *
 * 한 열에 섞으면 「색인은 끝났지만 아직 답변에 쓰이지 않는 문서」를 표현할 수 없는데, 올린
 * 문서는 전부 그 상태로 들어온다. 톤을 `outline` 계열로 두어 색인 배지와 나란히 놓여도 무엇이
 * 진행이고 무엇이 판정인지 한눈에 갈리게 한다.
 *
 * ── «개정안 · 시행 중 · 내려둠»에서 바꿨다 (#468) ──────────────
 * 옛 표시명은 **법령의 어휘**였다. 누르는 사람이 알고 싶은 것은 «이 문서를 도우미가 답할 때
 * 쓰는가»인데 «시행 중»은 그것을 한 겹 건너서 말한다. 배지와 조작 열이 같은 말을 쓰도록
 * 셋을 함께 옮겼다 — 배지가 «시행 중»인데 버튼이 «답변에서 제외»면 둘이 같은 축인지 알 수 없다.
 *
 * **서버 enum(`DRAFT`·`EFFECTIVE`·`SUPERSEDED`)은 그대로다.** 이 상태들은 표준코드가 아니라
 * 서버 enum이라 시드와 글자를 맞출 계약이 없다(#432) — 그래서 표시명만 바꿀 수 있다.
 */
export const RAG_APPLY_STATUS_NM: Record<RagApplyStatus, string> = {
  DRAFT: "미사용",
  EFFECTIVE: "답변에 사용 중",
  SUPERSEDED: "제외됨",
};

export const RAG_APPLY_STATUS_TONE: Record<RagApplyStatus, BadgeTone> = {
  DRAFT: "outline",
  EFFECTIVE: "outline-accent",
  SUPERSEDED: "grey",
};

/** 문서 유형 — 확장자가 정한 값이라 사용자가 고른 적이 없다. 조 목록의 유무를 설명한다 */
export const RAG_DOCUMENT_TYPE_NM: Record<RagDocumentType, string> = {
  STRUCTURED: "회칙",
  GENERIC: "일반 문서",
};

/**
 * 파일 크기 표기 — 서버는 바이트로 준다.
 *
 * 소수 한 자리까지만 쓴다(«1.2 MB»). 운영진이 이 칸에서 보는 것은 «상한에 가까운가»뿐이라
 * 바이트를 그대로 적으면 자릿수만 늘고 읽히지 않는다.
 */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
