import type { PtcpChgPathSeCd } from "@/shared/config/codes";
import type {
  AcademicProgramMember,
  AcademicProgramMemberHistory,
  PtcpSttsCd,
} from "../model/types";

/*
 * 팀원 명단·이력 응답 → 도메인 (#131 · #742) — **순수 모듈**(전송 계층 무의존).
 *
 * 조회(`members.ts` · 서버 컴포넌트)와 쓰기·이력(`members-write.ts` · 브라우저)이 같은 응답
 * 모양을 받는다. 변환을 한 벌로 두려고 둘 다 이 파일을 쓴다 — `entities/academic-session`의
 * `response-mapping.ts`와 같은 자리다. 서버 응답의 모양을 아는 곳은 이 파일이고, 계약이 바뀌면
 * 고칠 곳은 아래 `to*` 둘이다.
 *
 * 일시는 서버가 Asia/Seoul 오프셋을 붙여 내려준다("2026-03-01T00:00:00+09:00").
 */

/** `AcademicProgramMemberResponse` — 명단 한 줄. 추가·상태 변경 응답도 같은 모양이다 */
export interface AcademicProgramMemberResponse {
  eventPtcpId: number;
  mbrId: number;
  mbrNm: string | null;
  ptcpSttsCd: PtcpSttsCd;
  isLeader: boolean;
  joinedAt: string | null;
  /** server#612 — 그 전 서버는 싣지 않는다(그때는 고칠 수 없는 것으로 굳힌다) */
  isEditable?: boolean;
}

/** `AcademicProgramMemberHistoryResponse` — 명단 이력 한 줄 (server#612) */
export interface AcademicProgramMemberHistoryResponse {
  historyId: number;
  eventPtcpId: number;
  mbrId: number;
  mbrNm: string | null;
  /** 처음 명단에 오른 줄이면 null */
  bfrPtcpSttsCd: PtcpSttsCd | null;
  aftrPtcpSttsCd: PtcpSttsCd;
  chgPathSeCd: PtcpChgPathSeCd;
  prfmrId: number;
  prfmrNm: string | null;
  chgDt: string | null;
}

export function toMember(res: AcademicProgramMemberResponse): AcademicProgramMember {
  return {
    eventPtcpId: res.eventPtcpId,
    memberId: res.mbrId,
    // 빈 이름을 "-"로 채우는 것은 표시 규칙이라 뷰가 정한다 — 변환기는 "값이 없다"만 남긴다
    memberName: res.mbrNm ?? "",
    ptcpSttsCd: res.ptcpSttsCd,
    isLeader: res.isLeader,
    joinedAt: res.joinedAt,
    isEditable: res.isEditable === true,
  };
}

export function toMemberHistory(
  res: AcademicProgramMemberHistoryResponse,
): AcademicProgramMemberHistory {
  return {
    historyId: res.historyId,
    eventPtcpId: res.eventPtcpId,
    memberId: res.mbrId,
    memberName: res.mbrNm ?? "",
    beforeSttsCd: res.bfrPtcpSttsCd ?? null,
    afterSttsCd: res.aftrPtcpSttsCd,
    changePath: res.chgPathSeCd,
    performerId: res.prfmrId,
    performerName: res.prfmrNm ?? "",
    changedAt: res.chgDt,
  };
}
