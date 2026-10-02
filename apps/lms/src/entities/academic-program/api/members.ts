import { apiFetchAuthedNullable } from "@/shared/api/authed-client";
import { toQuery } from "@/shared/api/client";
import type { AcademicProgramMember, AcademicProgramMemberFilter } from "../model/types";
import { toMember, type AcademicProgramMemberResponse } from "./member-mapping";

/*
 * 학술 팀원 목록 조회 (#131 · ssccops-server#138 · GET /v1/academic-programs/{id}/members).
 *
 * 응답 → 도메인 변환은 `member-mapping.ts`에 있다 — 추가·상태 변경·이력(`members-write.ts` ·
 * 브라우저)이 같은 모양을 받아 두 파일이 함께 쓴다.
 *
 * ── 이 파일은 조회다 ─────────────────────────────────────────
 * 팀원 추가·제외는 #742(server#612)에서 열렸고 브라우저에서 일어나 `members-write.ts`에 있다.
 * 이 파일은 `next/headers`를 타는 서버 전용 조회라 배럴이 재export 해도 클라이언트 컴포넌트는
 * 값으로 가져가면 안 된다(아래 배럴 주석).
 *
 * ── 인가: 가입한 회원 ──────────────────────────────────────
 * `@RequireAuthority` 없이 로그인·가입만 요구한다 — 활동의 팀원 누구나 명단을 본다. 줄마다
 * 실리는 `isEditable`이 «요청자가 이 명단을 고칠 수 있는가»다(server#612 — 스터디장·학술국장 ×
 * 진행 중). 없는 활동은 404 `ACADEMIC_PROGRAM_NOT_FOUND`, 미가입이면 403 `SIGNUP_REQUIRED`다.
 *
 * ── 목록이지만 커서 페이징이 아니다 ──────────────────────────
 * `event_ptcp WHERE event_id`를 그대로 프록시하는 얇은 경로라 `page` 봉투 없이 배열만
 * 온다(활동당 팀원 수가 적다). 그래서 `apiFetchAuthedList`가 아니라 `apiFetchAuthed<T[]>`로
 * 받는다.
 *
 * 일시는 서버가 Asia/Seoul 오프셋을 붙여 내려준다("2026-03-01T00:00:00+09:00").
 */

/* ── 조회 ──────────────────────────────────────────────────── */

/**
 * GET /v1/academic-programs/{academicProgramId}/members — 팀원 목록 (#131).
 *
 * 서버 컴포넌트에서 부른다(이 앱은 조회 화면을 SSR로 그린다 — 토큰을 브라우저에 싣지 않고
 * 데이터 페칭 상태 기계를 들이지 않기 위해서다). `ptcpSttsCd`를 주면 그 상태만, 없으면
 * 전원(취소 포함)을 받는다.
 *
 * 정렬은 서버가 정한다 — 스터디장이 먼저 오도록 맞춰 두는 것은 서버 몫이고, 화면은 받은
 * 순서를 그대로 그린다(없는 정렬을 웹에서 다시 세지 않는다).
 */
export async function fetchAcademicProgramMembers(
  academicProgramId: number,
  filter: AcademicProgramMemberFilter = {},
): Promise<AcademicProgramMember[]> {
  const query = toQuery({ ptcpSttsCd: filter.ptcpSttsCd ?? undefined });
  const res = await apiFetchAuthedNullable<AcademicProgramMemberResponse[]>(
    `/v1/academic-programs/${academicProgramId}/members${query}`,
  );
  return (res ?? []).map(toMember);
}
