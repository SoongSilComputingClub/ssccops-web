import type { FormReceiptStatus } from "./types";

/*
 * 프로그램의 행사 게시물(소개 글) — 리더 전용 경로의 도메인 모델 (#819 · ADR-0069 · 서버 #699).
 *
 * 학술 프로그램은 구조상 행사이고(ADR-0043) 공개 웹사이트의 프로그램 상세는 그 행사 본문을
 * 그대로 보여 준다. 이 경로가 다루는 칸은 넷뿐이다 — 제목·본문·썸네일·장소. 기간·정원·분류·
 * 신청 폼은 서버가 받지 않으므로 이 모델에도 없다.
 */

/**
 * 잠긴 이유 — 서버가 정한 값을 그대로 쓴다. 화면이 접수 상태·프로그램 상태로 다시 계산하지 않는다
 * (ADR-0069 «조회 응답에 `isEditable`을 실어 화면이 이유와 함께 읽기 전용으로 보인다»).
 */
export type EventPostLockReason =
  | "RECRUITMENT_CLOSED"
  | "PROGRAM_COMPLETED"
  | "PROGRAM_DISCONTINUED";

export interface ProgramEventPost {
  eventId: number;
  eventTtl: string;
  /** 본문 Markdown — 서버가 null이면 빈 문자열로 받는다(편집칸의 초깃값) */
  mtxtCn: string;
  thmbUrlAddr: string | null;
  plcNm: string | null;
  /** 연결된 모집 폼의 접수 상태 — 배지에만 쓴다 */
  receiptStatus: FormReceiptStatus;
  isEditable: boolean;
  /** 잠겼을 때의 이유. 고칠 수 있으면 null */
  lockReason: EventPostLockReason | null;
}

/** PUT 본문 — 네 칸 전체를 보낸다(부분 갱신이 아니다) */
export interface ProgramEventPostSaveInput {
  eventTtl: string;
  mtxtCn: string;
  thmbUrlAddr: string | null;
  plcNm: string | null;
}

/*
 * 길이 상한 — 서버 `EventSaveRequest`와 같은 값이다(ADR-0069 «길이 · 마크다운 한도는 관리자 페이지
 * 행사 저장과 같은 규칙»). 서버가 거절할 값은 화면도 저장 전에 거절한다.
 */
export const EVENT_TTL_MAX_LENGTH = 256;
export const PLC_NM_MAX_LENGTH = 100;
export const THMB_URL_MAX_LENGTH = 200;

/**
 * 잠긴 이유 → 안내 문장. 고치려면 누구에게 가야 하는지까지 한 번에 말한다.
 *
 * 프로그램 상태는 배지(«수료»·«폐지»)와 같은 말을 쓴다.
 */
export function eventPostLockText(reason: EventPostLockReason | null): string {
  switch (reason) {
    case "PROGRAM_COMPLETED":
      return "수료된 프로그램이라 소개 글을 고칠 수 없습니다. 고쳐야 하면 학술국장에게 문의해주세요.";
    case "PROGRAM_DISCONTINUED":
      return "폐지된 프로그램이라 소개 글을 고칠 수 없습니다. 고쳐야 하면 학술국장에게 문의해주세요.";
    case "RECRUITMENT_CLOSED":
    default:
      // 서버가 이유 없이 잠갔으면 가장 흔한 사유인 접수 종료로 말한다(잠금 자체는 `isEditable`이다)
      return "접수가 끝나 소개 글을 고칠 수 없습니다. 고쳐야 하면 학술국장에게 문의해주세요.";
  }
}
