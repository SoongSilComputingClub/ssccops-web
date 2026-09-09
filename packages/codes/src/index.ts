/*
 * @ssccops/codes — 서버 표준코드와 그 표시명.
 *
 * **여기 있는 값은 문구가 아니라 계약이다.** 표시명은 서버 `data.sql` 시드와 글자까지 맞춰져
 * 있어 여기서 다듬으면 화면이 조용히 빈 라벨로 깨진다. 바꾸려면 서버 시드와 함께 바꾼다.
 *
 * ── 왜 패키지로 나왔나 ──────────────────────────────────────
 * `apps/admin`과 `apps/lms`가 같은 코드값을 **각자 들고 있었다**(ssccops#243). lms 쪽 주석이
 * 그 사실을 알고도 감수하고 있었다 — *"두 앱은 소스를 공유하지 않으므로, 서버 표준코드가
 * 바뀌면 두 곳을 함께 본다."* 그런데 각 앱의 AGENTS.md는 정반대를 못 박고 있었다:
 * *"한글 표시명은 이 파일에서만 만든다."* **서버가 바뀔 때 한 곳만 고쳐도 아무도 모르는
 * 상태**라, 규약이 지켜지려면 파일이 하나여야 한다.
 *
 * ── 무엇을 올리고 무엇을 두었나 ──────────────────────────────
 * **두 앱이 실제로 함께 쓰는 것만** 올렸다. admin에만 있는 코드값(회원 등급·업무 상태·행사
 * 분류 등 70여 개)은 admin에 그대로 둔다 — 한 앱만 쓰는 것까지 올리면 이 패키지가 admin의
 * 사본이 되고, 그러면 무엇이 정말 공유되는지 알 수 없다.
 *
 * 앱은 `shared/config/codes.ts`에서 이것을 재export 한다. 그래서 화면 코드는 종전대로
 * `@/shared/config/codes`를 부르면 되고, 앱 전용 코드값과 공유 코드값이 한 자리에서 온다.
 */

/** 표시명 맵의 key를 코드 배열로 (선언 순서 유지) */
function codesOf<T extends string>(nameMap: Record<T, string>): readonly T[] {
  return Object.keys(nameMap) as T[];
}

/* ── 응답_상태 (form_rspns_hstry.rspns_stts_cd) · DB 명시 ───── */

export type RspnsSttsCd =
  | "DRAFT"
  | "SUBMITTED"
  | "CHANGES_REQUESTED"
  | "ACCEPTED"
  | "REJECTED";

/**
 * 작성 중(DRAFT)의 표시명에 "미제출"을 붙여 둔다.
 *
 * 폼_상태의 DRAFT("작성 중")와 글자가 같은데 의미가 전혀 다르다 — 폼의 작성 중은 운영자가
 * 편집 중인 폼이고, 응답의 작성 중은 **제출자가 아직 내지 않은 답안**이다. 목록에서 이 둘을
 * 같은 문구로 보여 주면 운영자가 "제출된 응답"으로 오해하고 심사하게 된다.
 *
 * 수정요청(CHANGES_REQUESTED)은 ssccops-server #141에서 더해졌다. 선언 순서를 서버
 * `ResponseStatus` enum과 맞춰 둔다 — 이 순서가 곧 필터 칩의 순서라, 심사가 진행되는 차례
 * (제출 → 수정요청 → 결론)대로 놓여야 목록에서 읽기 쉽다.
 */
export const RSPNS_STTS_NM: Record<RspnsSttsCd, string> = {
  DRAFT: "작성 중(미제출)",
  SUBMITTED: "제출",
  CHANGES_REQUESTED: "수정요청",
  ACCEPTED: "승인",
  REJECTED: "반려",
};

export const RSPNS_STTS_CDS = codesOf(RSPNS_STTS_NM);

/**
 * 결론이 난 상태 — 승인 · 반려. 되돌릴 수 없다 (ssccops-server #141).
 *
 * 화면이 검토 패널을 잠글 기준이라 코드 사전이 갖는다. 뷰마다 `=== "ACCEPTED" || === "REJECTED"`를
 * 적으면 서버가 종결 어휘를 늘렸을 때 어느 화면은 잠그고 어느 화면은 열어 두게 된다.
 */
export const RSPNS_STTS_TERMINAL_CDS = [
  "ACCEPTED",
  "REJECTED",
] as const satisfies readonly RspnsSttsCd[];

export function isRspnsSttsTerminal(cd: RspnsSttsCd): boolean {
  return (RSPNS_STTS_TERMINAL_CDS as readonly RspnsSttsCd[]).includes(cd);
}

/* ── 검토_처리_구분 (form_rspns_rvw_hstry.rvw_prcs_se_cd) · DB 명시 ─ */

/**
 * 검토자가 그때 무엇을 했는가를 말하는 어휘 (ssccops-server #141).
 *
 * 예전 이름은 `RspnsPrcsSeCd`(`RSPNS_` 접두사)였다. 그것은 명명 규칙이 아니라 **서버의 이름
 * 충돌을 화면이 떠안은 우회**였다 — 회의 안건이 `prcs_se_cd`라는 일반명을 먼저 차지해서,
 * 뒤에 온 이쪽이 접두사를 붙여 피할 수밖에 없었다. 서버가 두 컬럼에 각자 한정어를 붙이며
 * (`agnd_` · `rvw_`) 그 우회를 걷어냈으므로 여기도 서버 이름을 그대로 쓴다 (ssccops#159).
 *
 * **응답_상태와 1:1이 아니다.** 제출(SUBMIT)은 결과 상태가 SUBMITTED로 같지만 검토자가 아니라
 * 응답자가 한 일이고, 재제출까지 세면 한 응답에 여러 번 나타난다 — 상태는 "지금 어디에 있는가",
 * 처리 구분은 "그때 무슨 일이 있었는가"다.
 */
export type RvwPrcsSeCd = "SUBMIT" | "ACCEPT" | "REQUEST_CHANGES" | "REJECT";

export const RVW_PRCS_SE_NM: Record<RvwPrcsSeCd, string> = {
  SUBMIT: "제출",
  ACCEPT: "승인",
  REQUEST_CHANGES: "수정요청",
  REJECT: "반려",
};

export const RVW_PRCS_SE_CDS = codesOf(RVW_PRCS_SE_NM);
