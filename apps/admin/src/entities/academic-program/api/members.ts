import type { PtcpChgPathSeCd, PtcpSttsCd } from "@/shared/config/codes";
import { apiFetch } from "@/shared/lib/api/client";
import type { AcademicProgramMemberHistory, RecruitmentTeamMember } from "../model/types";

/*
 * 팀원 명단·명단 변경 이력 조회 (#742 · ssccops-server#138 · #612).
 *
 * 프로그램 상세의 «팀원» 절이 쓴다 — 그전까지 어드민에는 팀원 명단을 늘 보는 곳이 없었다(모집
 * 관리의 «현재 팀원 명단»은 선발 저장 응답으로만 찼다). **조회만이다** — 팀원을 넣고 빼는 것은
 * 스터디장이 LMS에서 한다(server#612 · 2026-09-30 결정). 학술국장도 같은 API로 고칠 수 있어,
 * 필요해지면 버튼만 더하면 된다(후속).
 *
 * 명단 한 줄의 응답 모양(`AcademicProgramMemberResponse`)은 선발 저장 응답(`recruitment.ts`)과
 * 같아 변환을 여기 한 벌로 두고 그쪽이 가져다 쓴다. 명단 응답에 줄마다 실리는 `isEditable`
 * (server#612)은 이 화면이 조회만이라 옮기지 않는다.
 *
 * ── 인가 ────────────────────────────────────────────────────
 *  - GET .../members          — 가입한 회원이면 누구나(인증만).
 *  - GET .../members/history  — 스터디장 본인 또는 학술국장(서비스가 판정 · 403 `FORBIDDEN`).
 */

/** `AcademicProgramMemberResponse` — 명단 한 줄. 선발 저장(`recruitment/select`) 응답도 같은 모양이다 */
export interface AcademicProgramMemberResponse {
  eventPtcpId: number;
  mbrId: number | null;
  mbrNm: string | null;
  ptcpSttsCd: PtcpSttsCd;
  isLeader: boolean;
  joinedAt: string | null;
}

/** `AcademicProgramMemberHistoryResponse` — 명단 이력 한 줄 (server#612 · event_ptcp_stts_hstry) */
interface AcademicProgramMemberHistoryResponse {
  historyId: number;
  eventPtcpId: number;
  mbrId: number | null;
  mbrNm: string | null;
  /** 처음 명단에 오른 줄이면 null */
  bfrPtcpSttsCd: PtcpSttsCd | null;
  aftrPtcpSttsCd: PtcpSttsCd;
  chgPathSeCd: PtcpChgPathSeCd;
  prfmrId: number | null;
  prfmrNm: string | null;
  chgDt: string | null;
}

export function toTeamMember(res: AcademicProgramMemberResponse): RecruitmentTeamMember {
  return {
    eventParticipantId: res.eventPtcpId,
    memberId: res.mbrId ?? null,
    // 빈 이름을 "-"로 채우는 것은 표시 규칙이라 뷰가 정한다 — 변환기는 "값이 없다"만 남긴다
    memberName: res.mbrNm ?? "",
    ptcpSttsCd: res.ptcpSttsCd,
    isLeader: res.isLeader,
    joinedAt: res.joinedAt,
  };
}

function toMemberHistory(res: AcademicProgramMemberHistoryResponse): AcademicProgramMemberHistory {
  return {
    historyId: res.historyId,
    eventParticipantId: res.eventPtcpId,
    memberId: res.mbrId ?? null,
    memberName: res.mbrNm ?? "",
    beforeSttsCd: res.bfrPtcpSttsCd ?? null,
    afterSttsCd: res.aftrPtcpSttsCd,
    changePath: res.chgPathSeCd,
    performerId: res.prfmrId ?? null,
    performerName: res.prfmrNm ?? "",
    changedAt: res.chgDt,
  };
}

/**
 * GET /v1/academic-programs/{id}/members — 팀원 명단 전부(확정·대기·취소).
 *
 * 상태로 거르지 않는다 — 화면이 확정·대기와 제외(취소)를 나눠 그린다. 페이징 없이 배열이다
 * (활동당 팀원이 적다).
 */
export async function fetchAcademicProgramMembers(
  academicProgramId: number,
): Promise<RecruitmentTeamMember[]> {
  const res = await apiFetch<AcademicProgramMemberResponse[] | null>(
    `/v1/academic-programs/${academicProgramId}/members`,
  );
  return (res ?? []).map(toTeamMember);
}

/**
 * GET /v1/academic-programs/{id}/members/history — 명단 변경 이력(최신순).
 *
 * 모집 선발 · 행사 참가자 API · 팀원 관리(LMS) 세 경로의 줄이 전부 온다. 이력은 server#612(V28)
 * 이후의 변경부터라 그 전에 오른 팀원은 줄이 없을 수 있다.
 */
export async function fetchAcademicProgramMemberHistory(
  academicProgramId: number,
): Promise<AcademicProgramMemberHistory[]> {
  const res = await apiFetch<AcademicProgramMemberHistoryResponse[] | null>(
    `/v1/academic-programs/${academicProgramId}/members/history`,
  );
  return (res ?? []).map(toMemberHistory);
}
