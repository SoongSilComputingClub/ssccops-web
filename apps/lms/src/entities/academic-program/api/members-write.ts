"use client";

import {
  apiFetchAuthedFromBrowser,
  apiFetchAuthedNullableFromBrowser,
} from "@/shared/api/browser-client";
import type {
  AcademicProgramMember,
  AcademicProgramMemberHistory,
  PtcpSttsCd,
} from "../model/types";
import {
  toMember,
  toMemberHistory,
  type AcademicProgramMemberHistoryResponse,
  type AcademicProgramMemberResponse,
} from "./member-mapping";

/*
 * 팀원 추가·상태 변경·이력 (#742 · ssccops-server#612) — 브라우저 전용.
 *
 * 스터디장이 «팀원 관리» 화면에서 누르는 동작이라 `apiFetchAuthedFromBrowser`(Supabase 브라우저
 * 세션 토큰)를 쓴다. 명단 조회(`members.ts`)와 갈리는 것은 **토큰을 어디서 꺼내는가** 하나뿐이고
 * 변환은 `member-mapping.ts`를 함께 쓴다(`entities/academic-session`의 read/write와 같은 판단).
 * 이력도 여기 있는 것은 «펼칠 때» 브라우저가 부르는 조회라서다.
 *
 * ── 자격: 스터디장 본인 또는 학술국장 ───────────────────────────
 * 서버가 활동 404 → 자격 403 `FORBIDDEN` → 종료·폐지 409 → 모집 시작 전 409
 * `RECRUITMENT_NOT_STARTED` → 대상·전이 순으로 끊는다. 화면은 명단 응답의 `isEditable`(서버
 * 판정)로 버튼을 미리 감춘다 — 여기까지 오는 오류는 화면을 열어 둔 사이 상태가 바뀐 경우다.
 *
 * **학술국장 승인 없이 바로 반영된다**(2026-09-30 결정) — 그 대신 이력이 남고 화면이 그것을
 * 보여 준다(ADR-0042: 자유도를 열면 이력을 붙인다).
 */

/**
 * POST /v1/academic-programs/{id}/members — 팀원 추가.
 *
 * 신청서 없이 **확정**으로 넣는다. 예전에 제외된 회원이면 같은 행이 되살아난다(재합류 — 지난
 * 출석이 이어진다). 새 행일 수도 옛 행일 수도 있어 서버는 201이 아니라 200으로 답한다.
 */
export async function addAcademicProgramMember(
  academicProgramId: number,
  memberId: number,
): Promise<AcademicProgramMember> {
  const res = await apiFetchAuthedFromBrowser<AcademicProgramMemberResponse>(
    `/v1/academic-programs/${academicProgramId}/members`,
    { method: "POST", body: JSON.stringify({ mbrId: memberId }) },
  );
  return toMember(res);
}

/**
 * PATCH /v1/academic-programs/{id}/members/{eventPtcpId} — 상태 변경.
 *
 * 다음 상태를 보낸다. 갈 수 있는 길은 서버 전이표의 넷뿐이다 — 대기 → 확정(승격) · 확정 → 대기
 * (강등) · 확정 → 취소(제외 · 행은 남고 지난 출석도 남는다) · 취소 → 확정(재합류). 그 밖은 400
 * `INVALID_PARTICIPANT_STATUS_TRANSITION`이다(대기에서 곧바로 제외하는 길은 없다).
 */
export async function changeAcademicProgramMemberStatus(
  academicProgramId: number,
  eventPtcpId: number,
  ptcpSttsCd: PtcpSttsCd,
): Promise<AcademicProgramMember> {
  const res = await apiFetchAuthedFromBrowser<AcademicProgramMemberResponse>(
    `/v1/academic-programs/${academicProgramId}/members/${eventPtcpId}`,
    { method: "PATCH", body: JSON.stringify({ ptcpSttsCd }) },
  );
  return toMember(res);
}

/**
 * GET /v1/academic-programs/{id}/members/history — 명단 변경 이력(최신순).
 *
 * 모집 선발 · 행사 참가자 API · 팀원 관리 세 경로가 남긴 줄이 전부 온다. 스터디장·학술국장만
 * 볼 수 있고, 종료·폐지된 활동도 볼 수 있다. 이력 테이블은 server#612(V28) 이후의 변경부터라
 * 그 전에 오른 팀원은 줄이 없을 수 있다.
 */
export async function fetchAcademicProgramMemberHistory(
  academicProgramId: number,
): Promise<AcademicProgramMemberHistory[]> {
  const res = await apiFetchAuthedNullableFromBrowser<AcademicProgramMemberHistoryResponse[]>(
    `/v1/academic-programs/${academicProgramId}/members/history`,
  );
  return (res ?? []).map(toMemberHistory);
}
