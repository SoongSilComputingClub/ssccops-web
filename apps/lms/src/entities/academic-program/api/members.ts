import { apiFetchAuthed } from "@/shared/api/authed-client";
import { toQuery } from "@/shared/api/client";
import type {
  AcademicProgramMember,
  AcademicProgramMemberFilter,
  PtcpSttsCd,
} from "../model/types";

/*
 * 학술 팀원 목록 조회 (#131 · ssccops-server#138 · GET /v1/academic-programs/{id}/members).
 *
 * **서버 응답의 모양을 아는 곳은 이 파일 하나로 제한한다** — 폼·행사 도메인이 잡아 둔 규칙
 * 그대로다. 여기서 도메인 타입으로 옮기고 나면 계약이 바뀌었을 때 고칠 곳은 아래 `toMember`
 * 하나다.
 *
 * ── 조회 전용이다 ────────────────────────────────────────────
 * 팀원 추가·제외 API가 없다(#131 결정). 팀원은 학술국장의 선발(`recruitment/select`, #127)로만
 * 확정되므로 이 슬라이스에는 조회 함수 하나만 둔다. 프로토타입 헤더의 `+ 팀원 추가`는 선발
 * 권한이 스터디장에서 국장으로 정정되기(2026-08-23) 전의 시안이다.
 *
 * ── 인가: 인증만 ────────────────────────────────────────────
 * 이 엔드포인트는 `@RequireAuthority` 없이 로그인만 요구한다 — 활동의 팀원 누구나 명단을
 * 본다. 없는 활동은 404 `ACADEMIC_PROGRAM_NOT_FOUND`다.
 *
 * ── 목록이지만 커서 페이징이 아니다 ──────────────────────────
 * `event_ptcp WHERE event_id`를 그대로 프록시하는 얇은 경로라 `page` 봉투 없이 배열만
 * 온다(활동당 팀원 수가 적다). 그래서 `apiFetchAuthedList`가 아니라 `apiFetchAuthed<T[]>`로
 * 받는다.
 *
 * 일시는 서버가 Asia/Seoul 오프셋을 붙여 내려준다("2026-03-01T00:00:00+09:00").
 */

/**
 * 팀원 목록 API가 돌려주는 오류 코드.
 *
 * `AUTHORITY_REQUIRED`(AOP 403)는 이 엔드포인트에 애노테이션이 없어 나오지 않지만, 서버가
 * 소유권/가입 판정을 프록시 뒤에서 다르게 걸 가능성에 대비해 남겨 둔다 — 화면은 코드로
 * 분기하므로(#29) 없는 코드를 적어 두어도 해가 없다.
 */
export const ACADEMIC_PROGRAM_MEMBER_ERROR = {
  /** 없는 활동 (404) */
  ACADEMIC_PROGRAM_NOT_FOUND: "ACADEMIC_PROGRAM_NOT_FOUND",
  /** 커서·정렬 형식 오류 (400) — 이 화면은 필터가 상태 하나뿐이라 거의 나오지 않는다 */
  VALIDATION_FAILED: "VALIDATION_FAILED",
  /** 기준 코드에 없는 값 (400) — ptcpSttsCd 파라미터가 어긋났을 때 */
  INVALID_CODE_VALUE: "INVALID_CODE_VALUE",
} as const;

/* ── 서버 응답(Response DTO) ────────────────────────────────── */

interface AcademicProgramMemberResponse {
  eventPtcpId: number;
  mbrId: number;
  mbrNm: string | null;
  ptcpSttsCd: PtcpSttsCd;
  isLeader: boolean;
  joinedAt: string | null;
}

/* ── 응답 → 도메인 ─────────────────────────────────────────── */

function toMember(res: AcademicProgramMemberResponse): AcademicProgramMember {
  return {
    eventPtcpId: res.eventPtcpId,
    memberId: res.mbrId,
    // 빈 이름을 "-"로 채우는 것은 표시 규칙이라 뷰가 정한다 — 변환기는 "값이 없다"만 남긴다
    memberName: res.mbrNm ?? "",
    ptcpSttsCd: res.ptcpSttsCd,
    isLeader: res.isLeader,
    joinedAt: res.joinedAt,
  };
}

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
  const res = await apiFetchAuthed<AcademicProgramMemberResponse[] | null>(
    `/v1/academic-programs/${academicProgramId}/members${query}`,
  );
  return (res ?? []).map(toMember);
}
