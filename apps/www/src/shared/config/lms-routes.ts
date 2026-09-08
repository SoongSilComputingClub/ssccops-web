/*
 * **남의 앱(lms)의 주소** — 공유 링크 착지가 사람을 보낼 곳 (ssccops#253 · ADR-0017).
 *
 * ── 왜 이 파일이 따로 있는가 ────────────────────────────────
 * 2026-09-06 판단은 *"공개 앱에 착지를 두면 그쪽이 어드민의 URL 구조를 알아야 한다"*였고,
 * ADR-0017은 그 대가를 **눈 뜨고 치르기로** 정했다(결합 ⓐ). 치르는 대가는 감춰 두지 않고 한
 * 파일에 모아 둔다 — lms가 주소를 바꾸면 고칠 곳이 여기 하나이고, 여기 말고 다른 곳에서
 * 남의 앱 주소를 조립하고 있다면 그것이 규칙 위반이다.
 *
 * `shared/config/routes.ts`와 나눈 것도 그래서다. 저쪽은 **이 앱의** 주소이고 이 파일은
 * 이 앱이 통제하지 못하는 주소다 — 섞어 두면 `ROUTES`를 고치듯 고쳐도 되는 것처럼 보인다.
 */

/**
 * lms 오리진.
 *
 * ── 왜 새 변수인가 (`NEXT_PUBLIC_ADMIN_ORIGIN`을 쓰지 않는다) ──
 * 이 앱에는 이미 남의 앱 오리진이 하나 있다 — 어드민(`signupUrl()`). 그것을 재사용하면 lms
 * 링크가 어드민으로 간다. **재사용이 성립하는 조건은 "값이 같은 오리진"이고**(ADR-0017이
 * `NEXT_PUBLIC_PUBLIC_FORM_ORIGIN`을 학술 발급에 재사용한 근거가 그것이다 — 둘 다 www다),
 * 어드민과 lms는 배포가 다른 앱이라 값이 갈린다. 이름이 쓰임새보다 좁아지는 빚을 지느니
 * 변수를 하나 더 둔다.
 *
 * **값이 비면 `null`이다.** 착지 화면은 그때 자동 이동을 걸지 않고 안내만 그린다 — 죽은
 * 주소로 사람을 던지는 것보다 낫다(폼 상세가 `publicFormUrl()`에서 내린 판단과 같다).
 */
export function lmsOrigin(): string | null {
  return process.env.NEXT_PUBLIC_LMS_ORIGIN?.replace(/\/+$/, "") || null;
}

/**
 * 학술 프로그램(활동) 상세 — lms `/studio/programs/{id}`.
 *
 * lms `shared/config/routes.ts`의 `studioProgramDetailUrl`과 **같은 값을 두 곳에 적는 것이
 * 맞다.** 두 앱은 소스를 공유하지 않고(FSD 레이어는 앱마다 갖는다 · AGENTS.md), 이 값을
 * `@ssccops/share-meta`로 올리면 그 패키지가 "어느 앱의 어느 화면"까지 알게 되어 표가 앱의
 * 내부 구조에 묶인다 — 착지 앱이 어디인지만 정하는 표라는 성격이 무너진다.
 *
 * 링크를 받은 사람이 그 활동의 스터디장·팀원이 아니면 이 화면은 "활동을 찾을 수 없습니다"로
 * 떨어진다. **그것이 맞다** — 토큰이 주는 것은 미리보기까지이고(ADR-0016), 상세는 종전대로
 * 권한 검사를 지나야 열린다.
 */
export function lmsProgramDetailPath(academicProgramId: number): string {
  return `/studio/programs/${academicProgramId}`;
}

/**
 * 회차 하나 — lms `/studio/sessions/{sessionId}`.
 *
 * ── 이 주소는 **해석기**이지 화면이 아니다 ───────────────────
 * lms에는 회차 상세 화면이 없다(회차는 활동 상세의 "회차 이력" 안에서 보인다). 이 주소는 회차
 * id 하나를 받아 `GET /v1/academic-sessions/{sessionId}`로 활동 id를 얻은 뒤
 * `/studio/programs/{활동}#session-{회차}`로 넘겨 주는 자리다.
 *
 * ── 왜 그 조회를 이 앱(www)에서 하지 않는가 ──────────────────
 * **그 조회는 인증 경로이고, 필요한 인증은 lms의 것이다.** 이 앱의 `/s/{token}` 착지는 설계상
 * 익명이다(크롤러가 닿아야 해서 미들웨어 매처에도 없다). 거기서 인증 경로를 부르면 두 갈래로
 * 다 깨진다 — 서버 컴포넌트에서 부르면 크롤러가 401을 받고, 브라우저에서 부르면 **www에
 * 로그인하지 않은 사람**이 401을 받는다. www와 lms는 오리진이 달라 세션이 따로 놀므로, lms를
 * 쓰는 부원이 www에는 로그인하지 않은 상태가 오히려 흔하다.
 *
 * 목적지가 어차피 로그인이 필요한 화면이므로 **해석을 목적지 앱에 맡긴다.** lms는 모든 경로에서
 * 세션 쿠키를 갱신하고 미로그인이면 그 화면 위에서 로그인시킨다 — 로그인 뒤 이 주소가 다시
 * 그려지면 그때 해석이 끝난다. 그 대가로 이 앱은 **비동기 조회도 인증도 없이** 주소 한 줄만
 * 조립하면 되고, 착지 표(`DETAIL_HREF`)가 동기로 남는다.
 *
 * 크롤러는 이 주소를 따라가지 않는다 — 카드는 `/public/v1/share/{token}`이 이미 만들었다.
 */
export function lmsSessionPath(sessionId: number): string {
  return `/studio/sessions/${sessionId}`;
}
