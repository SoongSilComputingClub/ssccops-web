/*
 * 표준코드·표시명 (#171) — 이 앱에 처음 생기는 코드 사전이다.
 *
 * lms는 지금까지 학술 회차·팀원처럼 서버 enum을 raw로 받아 `entities/<slice>/model/display.ts`
 * 에서 표시명을 만들었고(코드 사전이 필요 없었다), 응답 상태(`form_rspns_hstry.rspns_stts_cd`)는
 * 기획안 재제출 화면이 처음 쓴다. 어드민 `shared/config/codes.ts`의 응답 관련 블록만 옮겨 왔다 —
 * 두 앱은 소스를 공유하지 않으므로, 서버 표준코드가 바뀌면 두 곳을 함께 본다.
 *
 * **코드로 비교한다** — 한글 표시명 직접 비교 금지(AGENTS.md · 데이터사전). 표시명은 서버
 * `data.sql` 시드와 글자까지 맞춰진 계약이라 여기서 다듬지 않는다.
 */

/** 표시명 맵의 key를 코드 배열로 (선언 순서 유지) */
function codesOf<T extends string>(nameMap: Record<T, string>): readonly T[] {
  return Object.keys(nameMap) as T[];
}

/* ── 응답_상태 (form_rspns_hstry.rspns_stts_cd) ─────────────── */

export type RspnsSttsCd =
  | "DRAFT"
  | "SUBMITTED"
  | "CHANGES_REQUESTED"
  | "ACCEPTED"
  | "REJECTED";

/**
 * 작성 중(DRAFT)에 "미제출"을 붙여 둔다 — 폼_상태의 DRAFT("작성 중")와 글자가 같지만 뜻이
 * 다르다(그쪽은 운영자가 편집 중인 폼, 이쪽은 제출자가 아직 내지 않은 답안).
 *
 * 선언 순서를 서버 `ResponseStatus` enum과 맞춰 둔다 — 심사가 진행되는 차례(제출 → 수정요청
 * → 결론)대로 놓여야 타임라인·목록에서 읽기 쉽다.
 */
export const RSPNS_STTS_NM: Record<RspnsSttsCd, string> = {
  DRAFT: "작성 중(미제출)",
  SUBMITTED: "제출",
  CHANGES_REQUESTED: "수정요청",
  ACCEPTED: "승인",
  REJECTED: "반려",
};

export const RSPNS_STTS_CDS = codesOf(RSPNS_STTS_NM);

/** 결론이 난 상태 — 승인 · 반려. 되돌릴 수 없다(서버 #141) */
export const RSPNS_STTS_TERMINAL_CDS = [
  "ACCEPTED",
  "REJECTED",
] as const satisfies readonly RspnsSttsCd[];

export function isRspnsSttsTerminal(cd: RspnsSttsCd): boolean {
  return (RSPNS_STTS_TERMINAL_CDS as readonly RspnsSttsCd[]).includes(cd);
}

/* ── 응답_처리_구분 (form_rspns_rvw_hstry.prcs_se_cd) ────────── */

/**
 * 처리 이력 한 줄이 "그때 무슨 일이 있었는가"를 말하는 어휘 (서버 #141).
 *
 * **응답_상태와 1:1이 아니다** — 제출(SUBMIT)은 결과 상태가 SUBMITTED로 같지만 검토자가 아니라
 * 응답자가 한 일이고, 재제출까지 세면 한 응답에 여러 번 나타난다.
 *
 * **이름의 `RVW_`는 검토(rvw)다** — 서버 컬럼 `form_rspns_rvw_hstry.rvw_prcs_se_cd`에서 왔다.
 * 예전 이름은 `RspnsPrcsSeCd`(`RSPNS_` 접두사)였는데 그것은 명명 규칙이 아니라 **서버의 이름
 * 충돌을 피하려던 우회**였다 — `prcs_se_cd`라는 일반명을 회의 안건이 먼저 가져가 폼 검토 쪽이
 * 접두사를 붙였다. 서버가 양쪽에 각자 이름을 주면서(ssccops#159) 그 우회가 필요 없어졌으므로
 * 되돌리지 말 것.
 */
export type RvwPrcsSeCd = "SUBMIT" | "ACCEPT" | "REQUEST_CHANGES" | "REJECT";

export const RVW_PRCS_SE_NM: Record<RvwPrcsSeCd, string> = {
  SUBMIT: "제출",
  ACCEPT: "승인",
  REQUEST_CHANGES: "수정요청",
  REJECT: "반려",
};

export const RVW_PRCS_SE_CDS = codesOf(RVW_PRCS_SE_NM);
