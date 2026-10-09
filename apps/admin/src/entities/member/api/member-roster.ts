import type { MbrSttsCd } from "@/shared/config/codes";
import { apiFetchFile, type ApiFile } from "@/shared/lib/api/client";

/*
 * 회원명부 내려받기 (#785 · 서버 #674 · 상위 ssccops#598).
 *
 * 동아리연합회 회원명부 양식을 채운 xlsx를 서버가 만들어 준다 — 화면은 연도·학기와 옵션 둘을
 * 넘기고 받은 파일을 저장할 뿐이다. 누구를 넣고 직책을 무엇으로 적을지, 제목과 파일 이름은
 * 전부 서버가 정한다. 화면이 그 규칙을 다시 만들면 두 벌이 된다.
 *
 * **성공 응답이 봉투가 아니라 파일이다** — 그래서 `apiFetch`가 아니라 `apiFetchFile`을 탄다.
 * 거절은 종전대로 상태 코드 + 봉투라 `ApiError`로 온다. 요구 권한은 CSV 회원 이관과 같은
 * `MEMBER_MANAGE`이고(클래스 레벨 `@RequireAuthority`), 서버가 내려받은 기록을 감사 로그에 남긴다.
 *
 * 회원 API(`members.ts`)와 파일을 나눈 것은 CSV 이관(`member-imports.ts`)과 같은 이유다 — 파일이
 * API 경계를 넘는 자리라 전송 경로가 다르다.
 */

/**
 * 직책 표기법 (서버 `RosterPositionNotation`).
 *
 * 회장·부회장은 어느 쪽이든 «회장»·«부회장»이고, 갈리는 것은 그 밖의 회원이다 — `FEDERATION`은
 * 전원 «정회원», `SSCC`는 그 회원의 대표 역할 이름(없으면 빈칸)이다.
 */
export type RosterPositionNotation = "FEDERATION" | "SSCC";

/** 학기 — 서버에는 학기 개념이 없어 이 값이 제목과 파일 이름에만 쓰인다 */
export type RosterSemester = 1 | 2;

/**
 * 회원명부 내려받기가 돌려주는 오류 코드 (서버 `MemberErrorCode`).
 *
 * 나머지 거절(`VALIDATION_FAILED`·`INVALID_CODE_VALUE`·`FORBIDDEN`)은 회원 API와 같은 문자열이라
 * `MEMBER_ERROR`에서 읽는다.
 */
export const MEMBER_ROSTER_ERROR = {
  /**
   * 오늘 기준으로 유효한 회장이 없다 (409). **옵션과 무관하다** — 어떤 상태·표기법을 골라도 같다.
   * 역할 관리에서 회장을 배정해야 풀린다. 부회장은 없어도 거절하지 않는다.
   */
  PRESIDENT_MISSING: "ROSTER_PRESIDENT_MISSING",
} as const;

export interface MemberRosterExportInput {
  /** 서버가 2000~2999만 받는다 — 화면은 올해 앞뒤 한 해만 내놓는다 */
  year: number;
  semester: RosterSemester;
  /**
   * 포함할 회원 상태. 서버는 비우면 재학(`ENROLLED`) 하나로 보지만 화면은 빈 채로 보내지 않는다 —
   * «아무것도 고르지 않았다»가 재학으로 바뀌면 화면이 말한 것과 파일이 다르다.
   *
   * 임시회원(`TEMP` 등급)은 어떤 상태를 골라도 들어가지 않고, 회장·부회장은 상태와 무관하게 늘
   * 들어간다 — 서버의 고정 규칙이라 여기 옵션이 없다.
   */
  mbrSttsCds: readonly MbrSttsCd[];
  positionNotation: RosterPositionNotation;
}

/**
 * GET /v1/members/roster-export — 회원명부 xlsx.
 *
 * 상태는 회원 목록 필터처럼 같은 이름(`mbrSttsCd`)을 **여러 번** 싣는다. 파일 이름은 응답의
 * `Content-Disposition`(`filename*`)이며 서버가 CORS로 노출한다.
 *
 * 거절: 400 `VALIDATION_FAILED`(연도·학기) · 400 `INVALID_CODE_VALUE`(모르는 상태·표기법) ·
 * 403 `FORBIDDEN` · 409 `ROSTER_PRESIDENT_MISSING`.
 */
export async function exportMemberRoster(input: MemberRosterExportInput): Promise<ApiFile> {
  const query = new URLSearchParams();
  query.set("year", String(input.year));
  query.set("semester", String(input.semester));
  for (const code of input.mbrSttsCds) query.append("mbrSttsCd", code);
  query.set("positionNotation", input.positionNotation);

  return apiFetchFile(`/v1/members/roster-export?${query.toString()}`);
}
