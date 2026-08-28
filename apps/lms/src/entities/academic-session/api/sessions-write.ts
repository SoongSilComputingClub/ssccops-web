"use client";

import { apiFetchAuthedFromBrowser } from "@/shared/api/browser-client";
import type { AcademicSessionDetail } from "../model/types";
import { toSessionDetail, type SessionDetailResponse } from "./response-mapping";

/*
 * 회차 기록 **제출·재제출** (#128 · ssccops-server#135) — 브라우저 전용.
 *
 * 답을 고쳐 가며 제출하는 클라이언트 화면(`views/session-record`)에서 일어나므로
 * `apiFetchAuthedFromBrowser`(Supabase 브라우저 세션 토큰)를 쓴다. 조회(`sessions-read.ts`)와
 * 갈리는 것은 **토큰을 어디서 꺼내는가** 하나뿐이고, 응답 → 도메인 변환(`toSessionDetail`)은
 * 두 파일이 `response-mapping.ts`를 함께 쓴다.
 *
 * ── 인가: 소유권 ────────────────────────────────────────────
 * `@RequireAuthority` 없이, 서비스의 `AcademicProgramOwnershipPolicy`가 "이 활동의 스터디장
 * 본인인가"로 끊는다(403 FORBIDDEN). 화면은 커리큘럼 항목의 `isEditable`(서버 판정)로 미리
 * 잠근다.
 */

/**
 * 회차 기록 제출·재제출 본문 (`SessionSubmitRequest`). POST·PUT이 같은 모양이다 — 재제출은
 * 부분 수정이 아니라 전체 교체라 본문이 다를 이유가 없다.
 *
 * `attendances`의 대상은 회원(`mbrId`)이 아니라 확정 팀원(`eventPtcpId`)이다 — 팀원 목록
 * (`GET .../members`)이 주는 값이며, 회원 식별자를 보내면 400 `INVALID_ATTENDANCE_TARGET`이다.
 * 빈 배열은 허용된다(확정 팀원이 아직 없는 첫 회차).
 */
export interface SessionSubmitBody {
  curriculumItemId: number;
  /** 실제 진행일 — YYYY-MM-DD (LocalDate) */
  actlYmd: string;
  /** 진행 내용 — 서버 @NotBlank */
  prgrsCn: string;
  /** 전달사항 — 선택. 비었으면 보내지 않는다(생략 = 없음) */
  ntcCn?: string;
  attendances: { eventPtcpId: number; atndYn: boolean }[];
}

/**
 * POST /v1/academic-programs/{id}/sessions — 신규 제출 (`NOT_SUBMITTED` 전용 · 201).
 *
 * 출석 배열을 함께 싣는다. 응답은 회차 상세이며, 인증사진은 이 요청에 없다 — 사진은 발급받은
 * `sessionId`로 `file-reference` 경로에 따로 올린다(#137, `file-reference.ts`).
 */
export async function submitAcademicSession(
  academicProgramId: number,
  body: SessionSubmitBody,
): Promise<AcademicSessionDetail> {
  const res = await apiFetchAuthedFromBrowser<SessionDetailResponse>(
    `/v1/academic-programs/${academicProgramId}/sessions`,
    { method: "POST", body: JSON.stringify(toRequestBody(body)) },
  );
  return toSessionDetail(res);
}

/**
 * PUT /v1/academic-programs/{id}/sessions/{sessionId} — 재제출 (`REVISION_REQUESTED` 전용 · 200).
 *
 * 전체 교체다 — 생략한 선택 필드(`ntcCn`)는 지운 것으로 본다. 그래서 화면은 현재 값을 전부
 * 채워 보여주고 부분 입력 폼을 만들지 않는다.
 */
export async function resubmitAcademicSession(
  academicProgramId: number,
  sessionId: number,
  body: SessionSubmitBody,
): Promise<AcademicSessionDetail> {
  const res = await apiFetchAuthedFromBrowser<SessionDetailResponse>(
    `/v1/academic-programs/${academicProgramId}/sessions/${sessionId}`,
    { method: "PUT", body: JSON.stringify(toRequestBody(body)) },
  );
  return toSessionDetail(res);
}

/**
 * 도메인 본문 → 서버 요청 JSON. 빈 전달사항은 키를 싣지 않는다 — 서버는 생략을 "없음"으로
 * 읽고(전체 교체), 빈 문자열을 보내면 재제출에서 "빈 값으로 덮어쓰기"가 된다.
 */
function toRequestBody(body: SessionSubmitBody): Record<string, unknown> {
  const ntcCn = body.ntcCn?.trim();
  return {
    curriculumItemId: body.curriculumItemId,
    actlYmd: body.actlYmd,
    prgrsCn: body.prgrsCn,
    ...(ntcCn ? { ntcCn } : {}),
    attendances: body.attendances,
  };
}
