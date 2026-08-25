import { apiFetchAuthed } from "@/shared/api/authed-client";
import type { ApplicationStatus, MyApplication } from "../model/types";

/*
 * 내 신청 조회 (인증 필요 · 권한 불필요).
 *
 * 응답의 실제 모양을 아는 곳은 이 파일 하나다. 지금은 서버 필드명과 도메인 타입이 1:1이라
 * 변환기가 이름을 바꾸는 일을 하지 않지만, **없는 값을 만들어 내지 않는 자리**로 남겨 둔다 —
 * 빈 장소를 "-"로 채우는 것은 표기 규칙이고 그것은 그리는 쪽이 정한다.
 */

interface MyApplicationResponse {
  eventId: number;
  eventTtl: string;
  eventClsfNm: string;
  eventBgngDt: string | null;
  eventEndDt: string | null;
  plcNm: string | null;
  applicationStatus: ApplicationStatus;
  formRspnsId: number | null;
  eventPtcpId: number | null;
  submittedAt: string | null;
}

function toMyApplication(response: MyApplicationResponse): MyApplication {
  return { ...response };
}

/**
 * 로그인한 본인의 신청 전부.
 *
 * 페이징이 없는 계약이다 — 한 사람이 학기 동안 내는 신청은 많아야 몇 건이라 전량을 한 번에
 * 받는다. 서버가 페이징을 붙이면 그때 화면이 함께 바뀐다.
 */
export async function fetchMyApplications(): Promise<MyApplication[]> {
  const applications =
    await apiFetchAuthed<MyApplicationResponse[]>("/v1/events/my-applications");
  return applications.map(toMyApplication);
}
