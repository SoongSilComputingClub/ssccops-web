import { PROGRAM_ATTACHMENT_ERROR } from "@/entities/academic-program/api/program-attachments";
import { isUnauthenticated } from "@/shared/api/auth-error";
import { API_ERROR, ApiError } from "@/shared/api/client";

/*
 * 학술 프로그램 첨부 자료 실패 → 한 줄 (web#805 · AGENTS «화면 문구»).
 *
 * 목록을 못 받은 것과 내려받기가 막힌 것만 말한다. 익명·미가입·없는 프로그램은 여기 오지 않는다 —
 * 훅이 그 경우를 «절을 그리지 않음»으로 먼저 가른다(`use-program-attachments.ts`).
 */

export const PROGRAM_ATTACHMENTS_LOAD_FAILED = "첨부 자료를 불러오지 못했습니다 — 새로고침해주세요";

export function programAttachmentErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "파일을 내려받지 못했습니다 — 잠시 후 다시 시도해주세요";
  }
  if (isUnauthenticated(error)) return "로그인이 만료됐습니다 — 다시 로그인해주세요";
  switch (error.code) {
    case PROGRAM_ATTACHMENT_ERROR.NOT_FOUND:
      return "첨부 파일이 없습니다 — 새로고침해주세요";
    case API_ERROR.NETWORK_ERROR:
      return "서버에 연결할 수 없습니다 — 잠시 후 다시 시도해주세요";
    default:
      return error.message || "파일을 내려받지 못했습니다 — 잠시 후 다시 시도해주세요";
  }
}
