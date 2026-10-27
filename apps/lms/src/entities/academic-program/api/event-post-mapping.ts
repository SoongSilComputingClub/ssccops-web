import type { FormReceiptStatus } from "../model/types";
import type { EventPostLockReason, ProgramEventPost } from "../model/event-post";

/*
 * 소개 글(행사 게시물) 응답 → 도메인 변환 (#819 · 서버 #699) — 전송 계층을 모르는 순수 모듈.
 *
 * 조회(SSR · `event-post-read.ts`)와 저장(브라우저 · `event-post-write.ts`)이 이 한 벌을 함께 쓴다
 * (`entities/form/api/response-mapping.ts`와 같은 규칙). **서버 응답의 모양을 아는 곳은 이 파일
 * 하나다** — 서버 PR과 나란히 만들었으므로 계약이 어긋나면 여기만 고친다.
 */

/** 서버 응답 — GET·PUT `/v1/academic-programs/{id}/event-post`가 같은 모양을 준다 */
export interface ProgramEventPostApiResponse {
  eventId: number;
  eventTtl: string;
  mtxtCn: string | null;
  thmbUrlAddr: string | null;
  plcNm: string | null;
  receiptStatus: FormReceiptStatus;
  isEditable: boolean;
  lockReason: EventPostLockReason | null;
}

export function toProgramEventPost(res: ProgramEventPostApiResponse): ProgramEventPost {
  return {
    eventId: res.eventId,
    eventTtl: res.eventTtl,
    // 편집칸의 초깃값이다 — 본문이 없는 것과 빈 본문은 화면에서 같은 상태라 빈 문자열로 받는다
    mtxtCn: res.mtxtCn ?? "",
    thmbUrlAddr: res.thmbUrlAddr,
    plcNm: res.plcNm,
    receiptStatus: res.receiptStatus,
    isEditable: res.isEditable,
    lockReason: res.lockReason,
  };
}
