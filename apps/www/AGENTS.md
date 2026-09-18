<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# apps/www — 공개 웹사이트 (행사 · 신청 · 공개 폼 · 공유 착지)

**이 파일이 www 규칙의 정본이고 루트 `AGENTS.md`는 링크만 든다**(ssccops#349). 세 앱 공통은 루트에.

**부원과 외부인이 보는 앱이다.** 행사 목록·상세는 로그인 없이 열리고(wave2 D1 — 비로그인 완전 공개), 신청·내 신청·공개 폼 응답만 로그인이 필요하다. 이 앱이 아는 남의 오리진은 **lms 하나**(`shared/config/lms-routes.ts` — 학술 공유 착지가 사람을 보낼 곳)다. 어드민 오리진(`NEXT_PUBLIC_ADMIN_ORIGIN`)은 #451에서 걷어냈다 — 부원에게 나가는 화면이 운영 도메인을 가리키지 않는다.

## 화면과 경로

| 경로 | 무엇 | 인증 |
|---|---|---|
| `/` · `/events/{id}` | 행사 목록(SSR, 필터 칩용 전체 조회를 나란히 한 번 더)·상세(OG 카드) | 익명 |
| `/events/{id}/apply` | 신청 흐름 — **미가입이면 같은 자리에서 가입**(`features/signup` · #154 · 기존 회원 연결 #364) → 신청서 | 로그인 |
| `/my-applications` | 내 신청·낸 폼(SSR). 미로그인·미가입 모두 **이 화면 안에서** 안내하고 가입도 여기서(`InlineSignup` · #451) | 로그인 |
| `/f/{ref}` · `/f/{ref}/done` | 공개 폼 응답(어드민에서 옮겨 옴 · ssccops#214) — 응답자는 전원 회원. **`ref`는 폼 키(UUID) 또는 예전 숫자 id** (ADR-0036 · ssccops#359): 서버가 둘 다 받고, 화면은 새 주소를 응답의 `formKey`로만 만든다(`ROUTES.publicForm(form.formKey ?? form.formId)`). 모양 판정은 `entities/form`의 `isFormRef` 한 곳. 숫자 주소의 카드 미리보기는 지금 접수 중인 폼만 뜬다(서버 정책) | 로그인 |
| `/s/{token}` | 공유 링크 착지 — 크롤러에는 OG, 사람은 클라이언트에서 lms 상세로(ADR-0016·0017) | 익명 |
| `/auth/callback` · `/version` | OAuth 콜백 · 배포 이력 확인 | — |

경로는 `shared/config/routes.ts`의 `ROUTES`로만 쓴다.

## 규칙

- **전 화면이 서버 컴포넌트다**(#141). 사용자 토큰이 필요한 화면도 SSR로 그린다 — 세션 쿠키는 서버에서 읽을 수 있고(`@supabase/ssr`) 그러면 토큰이 브라우저 코드에 실리지 않고 로딩 상태 훅도 필요 없다. **예외는 브라우저에서 저장·제출해야 하는 화면**(신청서 작성·재제출) — 그때만 `shared/api/browser-client.ts`(Supabase 브라우저 세션에서 토큰)를 쓴다. 토큰을 꺼내는 통로만 다르고 봉투·오류는 같다.
- **리다이렉트를 하지 않는다.** `apiFetch`(익명 전용 `client.ts`)·`authed-client.ts`·`browser-client.ts` 어느 것도 401·403에 이동을 걸지 않는다 — 이 앱에는 밀어낼 로그인 화면이 없고(로그인은 지금 보고 있는 화면 위에서 `SignInButton`으로 시작한다) 서버 컴포넌트에서 `window.location`을 만질 수도 없다. 401·403은 오류로 올려 보내고 화면이 안내로 그린다. 판정은 `shared/api/auth-error.ts`(`isUnauthenticated`·`isSignupRequired`) 한 벌.
- **미들웨어는 갱신기이고 매처가 좁다** — `["/my-applications", "/events/:eventId/apply", "/f/:formId"]`. `updateSession`에 가드를 주지 않고(`@ssccops/auth`), `PUBLIC_PATHS` 같은 목록 자체가 없다. **매처를 넓히면 `/s/{token}`이 조용히 깨진다** — 크롤러는 정의상 미인증이다.
- **`/v1/auth/session`은 미가입자에게도 200을 준다.** 가입 안내를 오류(403)로 배우지 않고 세션 조회와 목록 조회를 나란히 보내 세션이 먼저 답하게 한다(`my-applications-page.tsx`).
- **가입은 화면을 옮기지 않는다.** `SignupStep`은 신청 흐름 안에 임베드되고(#154) 등급은 요청에 없다 — 서버가 TEMP로 고정한다. 학번이 이미 명부에 있으면 `MemberLinkStep`이 같은 자리에서 연결을 끝낸다(#364). 회원 생성은 되돌릴 수 없으므로 `pending` 외에 ref로 한 번 더 잠근다.
- **응답 → 도메인 변환에서 없는 값을 만들어 내지 않는다**(루트 규칙) — `@ssccops/date`·`@ssccops/share-meta`도 같은 선을 긋는다.

## 공유 카드(OG) — 한 번 굳는다

- 메신저는 OG를 한 번 캐싱하면 갱신하지 않는다. **접수 상태·마감일·잔여 정원은 담지 않는다**(ssccops#194 제약 ②) — 행사 상세는 기간·장소·본문 요약만, 공개 폼은 제목·안내 문구만. 문구 변환은 `@ssccops/share-meta`의 `toShareDescription`.
- 공개 폼 카드는 익명 메타 경로 `/public/v1/forms/{formId}/meta`(ssccops-server#247)로 읽는다 — 응답자용 조회는 인증이 필요해 크롤러가 못 읽는다. 조회 실패·접수를 연 적 없는 폼은 **기본 메타로 조용히 떨어진다**(카드가 밋밋한 것과 페이지가 안 뜨는 것은 무게가 다르다).
- `/s/{token}` 착지는 **서버 `redirect()`를 쓰지 않는다** — 307이면 크롤러가 OG 담긴 HTML을 못 받는다. HTML을 한 번 그리고 이동은 브라우저가. 아무 내용도 그리지 않으므로 인증 없이 열려 있어도 새는 것이 없다 — 토큰은 미리보기 권한까지다(ADR-0016).

## 함정

- **어드민이 멀쩡한 것은 근거가 되지 않는다** — 공유 패키지 클래스가 빠지는 사고(#316)는 앱이 작은 www·lms에서 먼저 드러난다. `globals.css`의 `@source` 목록을 확인한다.
- 조회 실패를 던지지 않고 화면 안에서 안내로 그린다 — 서버가 잠깐 닿지 않을 때 공개 도메인이 통째로 오류 화면이 되는 편보다 낫다.
- www 고유 날짜 표기(행사 기간)는 `shared/lib/date.ts`에 남아 있다 — 세 앱이 같던 것만 `@ssccops/date`로 올라갔다.
