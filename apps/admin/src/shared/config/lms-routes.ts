/*
 * **남의 앱(lms)의 주소** — 시스템 폼 상세가 사람을 보낼 곳 (#553 · ssccops#415).
 *
 * ── 왜 이 파일이 따로 있는가 ────────────────────────────────
 * `shared/config/routes.ts`는 **이 앱의** 주소이고 이 파일은 이 앱이 통제하지 못하는 주소다 —
 * 섞어 두면 `ROUTES`를 고치듯 고쳐도 되는 것처럼 보인다. www가 같은 이름의 파일
 * (`apps/www/src/shared/config/lms-routes.ts`)로 같은 판단을 먼저 했고, 두 앱은 소스를 공유하지
 * 않으므로(FSD 레이어는 앱마다 갖는다 · AGENTS.md) 여기에도 한 벌을 둔다. lms가 주소를 바꾸면
 * 고칠 곳은 이 파일 하나이고, 여기 말고 다른 곳에서 lms 주소를 조립하고 있다면 그것이 규칙 위반이다.
 *
 * 지금 이 앱이 lms를 가리키는 자리는 하나다 — 시스템 폼(기획안)의 상세가 공개 링크 대신 «응답
 * 받는 곳»을 안내하면서 LMS 기획안 제출 화면으로 보낸다. 상세의 공개 링크(`publicFormUrl`)는
 * www 공개 폼이라 시스템 폼에서는 그리지 않는다(운영진이 그 링크로 www에서 기획안에 응답한 일이
 * ssccops#415다).
 */

/**
 * lms 오리진.
 *
 * ── 왜 새 변수인가 ──────────────────────────────────────────
 * 이 앱에는 남의 앱 오리진이 하나 있다 — www(`NEXT_PUBLIC_PUBLIC_FORM_ORIGIN`). 그것을 재사용하면
 * lms 링크가 www로 간다. **재사용이 성립하는 조건은 "값이 같은 오리진"이고**(ADR-0017이 그 변수를
 * 학술 발급에 재사용한 근거가 그것이다 — 둘 다 www다), www와 lms는 배포가 다른 앱이라 값이 갈린다.
 * 이름은 www와 같은 `NEXT_PUBLIC_LMS_ORIGIN`이다 — 배포 설정에서 두 앱이 같은 이름으로 같은 값을 갖는다.
 *
 * **값이 비면 `null`이다.** 상세 화면은 그때 버튼을 그리지 않고 문구만 남긴다 — 죽은 주소로 사람을
 * 던지는 것보다 낫다(`publicFormUrl()`이 내린 판단과 같다).
 */
export function lmsOrigin(): string | null {
  // `/\/+$/`는 되돌아가는 정규식이지만 입력이 배포 설정값이라 닿을 일이 없다 (#401 · S8786)
  return process.env.NEXT_PUBLIC_LMS_ORIGIN?.replace(/\/+$/, "") || null;
}

/** 기획안 제출 — lms `ROUTES.proposalNew`와 같은 값. 바뀌면 여기도(www의 `LMS_PROPOSAL_NEW_PATH`와 같은 값) */
export const LMS_PROPOSAL_NEW_PATH = "/proposals/new";

/**
 * LMS 기획안 제출 화면의 절대 URL — 오리진이 비어 있으면 `null`이라 부르는 쪽이 버튼 자리를 감춘다.
 *
 * `ROUTES`에 두지 않는 것은 `publicFormUrl`과 같은 이유다 — 이 앱의 화면이 아니라 내부 이동에
 * 쓰이면 404가 된다(이 앱의 기획안 주소는 검토 화면 `ROUTES.proposalReviews`뿐이다).
 */
export function lmsProposalNewUrl(): string | null {
  const origin = lmsOrigin();
  return origin ? `${origin}${LMS_PROPOSAL_NEW_PATH}` : null;
}
