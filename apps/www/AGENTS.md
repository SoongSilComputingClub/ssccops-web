<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# apps/www — 공개 웹사이트 (행사 · 콘텐츠 · 신청 · 공개 폼 · 공유 착지)

**이 파일이 www 규칙의 정본이고 루트 `AGENTS.md`는 링크만 든다**(ssccops#349). 세 앱 공통은 루트에.

**부원과 외부인이 보는 앱이다.** 홈(#524)·행사 목록·상세와 콘텐츠(소개·운영진·활동 아카이브·모집·문의·법적 페이지 · #520 · ADR-0038)는 로그인 없이 열리고(wave2 D1 — 비로그인 완전 공개), 신청·내 활동(`/me`)·공개 폼 응답만 로그인이 필요하다. 이 앱이 아는 남의 오리진은 **lms 하나**(`shared/config/lms-routes.ts` — 학술 공유 착지가 사람을 보낼 곳)다. 어드민 오리진(`NEXT_PUBLIC_ADMIN_ORIGIN`)은 #451에서 걷어냈다 — 부원에게 나가는 화면이 운영 도메인을 가리키지 않는다.

## 화면과 경로

| 경로 | 무엇 | 인증 |
|---|---|---|
| `/` | **홈 «지금 SSCC»**(SSR · #524 · ssccops#385 · `views/home`) — 위에서 아래로 ① 배너 한 줄(페이지 `home-banner`가 게시 중일 때만 · 본문을 `Markdown`으로 — 링크 때문) ② hero(페이지 `home-intro`의 첫 `# `가 큰 문장, 아래 문단 · [활동 보기]→`/activities` [소개]→`/about` · **«지원하기» 없음**) ③ 다가오는 일정(**행사만** · #529 · ssccops#389 — 공개 목록에서 `eventPhase` `ONGOING`·`UPCOMING`을 시작일 순 다섯까지, 칩은 `eventPhaseBadge` · 비면 «예정된 행사가 없습니다» · «행사 전체 보기»→`/events`. #524에서는 접수 중 폼도 섞어 세웠는데 QA 폼까지 전부 떠서 뺐다 — 모집 안내는 배너의 자리) ④ 소개 4블록(`home-intro`의 `## 무엇을 하나` 절 `### 제목`+한 줄, 없으면 코드의 기본 문구 — `views/home/model/intro.ts`) ⑤ 최근 활동(포스트 최신 여섯 · `PostCard` · «전체 보기»→`/activities`). 재료 넷은 `Promise.allSettled` — 실패한 블록만 «—»(배너는 없음, hero는 기본 문구). 홈은 어느 축도 켜지 않는다 | 익명 |
| `/events` · `/events/{id}` | 행사 목록(SSR, 필터 칩용 전체 조회를 나란히 한 번 더 · **홈에서 이사** #524 — 화면은 그대로, 상단 바는 «활동»이 켜진다)·상세(OG 카드) | 익명 |
| `/events/{id}/apply` | 신청 흐름 — **미가입이면 같은 자리에서 가입**(`features/signup` · #154 · 기존 회원 연결 #364) → 신청서 | 로그인 |
| `/me` | 내 활동(SSR · #518 · ssccops#386) — 블록 셋: 신청한 행사(`/v1/events/my-applications`) · 낸 폼(`/v1/forms/responses/mine`, 기획안 폼 응답은 «기획안» 칩 — 시스템 폼 여부가 목록에 없어 `GET /v1/forms/system/PROPOSAL`의 `formId`와 견준다) · 내가 이끄는 스터디·프로젝트(`/v1/academic-programs?mine=leader`, 카드는 lms 상세로). 조회는 `Promise.allSettled` — 한 블록이 실패해도 그 블록만 안내로. 미로그인·미가입 모두 **이 화면 안에서** 안내하고 가입도 여기서(`InlineSignup` · #451). **옛 `/my-applications`는 `next.config.ts`의 permanent redirect**가 받는다(화면이 아니라 설정 — «리다이렉트를 하지 않는다»는 401·403 얘기다) | 로그인 |
| `/about` · `/about/history` · `/about/values` · `/operators` · `/operators/{기수}` · `/join` · `/join/faq` · `/join/history` · `/privacy` · `/photo-notice` · `/terms` | **게시된 페이지 한 장**(SSR · #520 · ssccops#382) — 전부 `views/content-page`의 `ContentPage`이고 경로 → 슬러그 표는 `shared/config/content-slugs.ts` 한 곳(`/operators/{기수}`는 `operators-{기수}`). 본문은 행사와 같은 `Markdown`(원시 HTML 해석 안 함). 게시본이 없으면 404가 아니라 **«준비 중» 한 줄**(주소가 상단 바에 걸려 있어 없는 주소가 아니다). `/join` 아래 «접수 중» 폼 블록(`OpenForms`)은 #529에서 **뺐다** — `/public/v1/forms/open`은 신입 모집 폼과 QA·행사 폼을 구별하지 않아 접수 중인 폼이 전부 떴다. 서버가 폼 용도를 주기 전에는 되살리지 않는다(`fetchOpenForms` 계약은 `entities/content`에 남아 있다 · ADR-0038). **본문은 절(`##`) 단위로 잘라 프리셋대로 놓는다**(`views/content-page/model/sections.ts` → `ui/content-body.tsx`) — 라우트가 `layout`으로 고른다: 소개·운영진·지난 모집 `prose`(기본 · `###` 소절 둘 이상이면 타일 격자) · 지원 안내 `steps`(번호 목록이 단계 원) · 핵심 가치 `cards`(절마다 카드 3열) · FAQ `faq`(`<details>` Q/A) · 처리방침·사진 게재 안내·약관 `legal`(목차+앵커) · 연혁 `timeline`. 첫 헤딩 앞 첫 문단은 리드(크고 옅게), 인용은 콜아웃, 표는 줄 사이 하늘선 — 규칙은 `globals.css` `.content-*` | 익명 |
| `/contact` | **문의**(SSR · #524 · `views/contact`) — 페이지 `contact`가 게시돼 있으면 그 본문을 위에(404면 건너뛴다), 아래에 문의처 블록(동아리방 · Instagram · GitHub · 메일은 `contact.ts`에 값이 생기면). `ContentPage`를 쓰지 않는 것은 게시본이 없어도 «준비 중»이 아니라 블록이 본체라서다. 푸터의 `#contact` 블록은 그대로 — 같은 `contact.ts`를 읽는다 | 익명 |
| `/activities` · `/activities/{category}` · `/activities/{category}/{slug}` · `/activities/{year}/{semester}` | **활동 아카이브**(`views/activities` · #520) — 목록은 분류 탭(`academic`·`event`·`news` ↔ 코드 표 `entities/content/model/category.ts`) · 표지 · 활동일 · 커서 «더 보기»(`?cursor=` **링크**, 다음 장을 새 화면으로). 상세는 본문 · 갤러리(`gallery[].imageUrl`) · `eventId` 있으면 행사 링크, 미게시·없음은 `notFound()`. 학기별 묶음은 서버에 학기가 없어 **웹이 활동일로 거른다** — `/activities/{a}/{b}` 한 라우트가 첫 조각 모양(네 자리 숫자 = 연도)으로 상세와 갈린다 | 익명 |
| `/f/{ref}` · `/f/{ref}/done` | 공개 폼 응답(어드민에서 옮겨 옴 · ssccops#214) — 응답자는 전원 회원. **`ref`는 폼 키(UUID) 또는 예전 숫자 id** (ADR-0036 · ssccops#359): 서버가 둘 다 받고, 화면은 새 주소를 응답의 `formKey`로만 만든다(`ROUTES.publicForm(form.formKey ?? form.formId)`). 모양 판정은 `entities/form`의 `isFormRef` 한 곳. 숫자 주소의 카드 미리보기는 지금 접수 중인 폼만 뜬다(서버 정책) | 로그인 |
| `/s/{token}` | 공유 링크 착지 — 크롤러에는 OG, 사람은 클라이언트에서 lms 상세로(ADR-0016·0017) | 익명 |
| `/auth/callback` · `/version` | OAuth 콜백 · 배포 이력 확인 | — |

경로는 `shared/config/routes.ts`의 `ROUTES`로만 쓴다.

## 규칙

- **전 화면이 서버 컴포넌트다**(#141). 사용자 토큰이 필요한 화면도 SSR로 그린다 — 세션 쿠키는 서버에서 읽을 수 있고(`@supabase/ssr`) 그러면 토큰이 브라우저 코드에 실리지 않고 로딩 상태 훅도 필요 없다. **예외는 브라우저에서 저장·제출해야 하는 화면**(신청서 작성·재제출) — 그때만 `shared/api/browser-client.ts`(Supabase 브라우저 세션에서 토큰)를 쓴다. 토큰을 꺼내는 통로만 다르고 봉투·오류는 같다.
- **리다이렉트를 하지 않는다.** `apiFetch`(익명 전용 `client.ts`)·`authed-client.ts`·`browser-client.ts` 어느 것도 401·403에 이동을 걸지 않는다 — 이 앱에는 밀어낼 로그인 화면이 없고(로그인은 지금 보고 있는 화면 위에서 `SignInButton`으로 시작한다) 서버 컴포넌트에서 `window.location`을 만질 수도 없다. 401·403은 오류로 올려 보내고 화면이 안내로 그린다. 판정은 `shared/api/auth-error.ts`(`isUnauthenticated`·`isSignupRequired`) 한 벌.
- **미들웨어는 갱신기이고 매처가 좁다** — `["/me/:path*", "/events/:eventId/apply", "/f/:formId"]`. `/my-applications`는 redirect 응답이라 매처에 없다(#518). `updateSession`에 가드를 주지 않고(`@ssccops/auth`), `PUBLIC_PATHS` 같은 목록 자체가 없다. **매처를 넓히면 `/s/{token}`이 조용히 깨진다** — 크롤러는 정의상 미인증이다.
- **`/v1/auth/session`은 미가입자에게도 200을 준다.** 가입 안내를 오류(403)로 배우지 않고 세션 조회와 목록 조회를 나란히 보내 세션이 먼저 답하게 한다(`views/me/ui/me-page.tsx`).
- **홈은 세션을 보지 않는다**(#524 · ssccops#385). 로그인 여부가 렌더에 들어오면 익명 공개 렌더마다 세션 왕복이 붙고 `Cache-Control`도 걸 수 없다 — 부원의 «내 것»은 `/me`, 진입은 헤더 `AuthNav`의 «내 활동» 하나. 재료는 전부 익명 API(`/public/v1/pages·posts·forms/open·events`)이고 숫자 블록(부원 n명)·«이번 학기»는 2026-09-19에 뺐다. **행사 목록이 첫 화면이던 시절(#141)을 되돌리지 않는다** — 학기 중 대부분의 날에 첫 화면이 «공개된 행사가 없습니다» 한 줄이었다. hero·소개 블록 문구는 페이지 `home-intro`에서 줄 단위(`#`·`##`·`###`)로만 읽고 **강조·링크 문법은 해석하지 않는다**(`views/home/model/intro.ts` — AST 파서는 큰 문장 하나·블록 넷에 과하다). 배너만 `Markdown`으로 그린다(링크가 살아야 한다). 일정의 진행 중·예정 판정은 서버의 `eventPhase`다(#529 — #524에서는 웹이 «시작 ≥ 오늘»으로 걸렀다).
- **하위 내비는 페이지 제목 아래 탭 줄**(#524 · `shared/config/section-tabs.ts` → `views/content-page/ui/section-tabs.tsx`). SSCC(소개·연혁·핵심 가치) · 운영진(지금·역대) · 모집(안내·FAQ·지난 모집) — 라우트가 `ContentPage`에 `tabs={{ axis, pathname }}`로 넘기고, 법적 페이지는 넘기지 않는다. 활동 축은 분류 탭이 이미 있다. 상단 바 드롭다운은 기각 — 드로어에 2단 상태가 생기고 데스크톱에서는 올려 보기 전엔 하위가 있는지 모른다. «역대»는 `OPERATOR_COHORTS`(`content-slugs.ts` · 지금 `[44]`)의 첫 기수로 간다 — 게시된 페이지 목록 API가 없어 손으로 적는 표이고, 기수를 게시하면 한 줄 더한다.
- **학술은 lms, 요약은 www `/me`**(ssccops#386). 회차·출석·팀원·기획안 작성은 lms의 화면이고 `/me`는 «내가 맡은 활동이 무엇이고 어디까지 왔는가»까지만 그린 뒤 lms로 보낸다(`shared/config/lms-routes.ts` — 남의 앱 주소는 그 파일에서만 조립). 홈(`/`)에는 «내 것» 블록을 얹지 않는다(위 «홈은 세션을 보지 않는다»). 로그인한 사람의 진입은 헤더 `AuthNav`(클라이언트에서 세션 판정)의 «내 활동» 하나. 별도 앱도 아니다(세 앱이 이미 셋). 팀원으로 참여한 활동(`mine=member` 없음)·출석 요약은 서버에 없어 그리지 않는다 — 없는 데이터는 블록을 빼고 메타 이슈에 남긴다.
- **커서 페이징 봉투(`page`)** — `apiFetchList`·`apiFetchAuthedList`는 `/me`의 학술 활동 목록을 위해 lms에서 봉투 처리만 옮겨 왔다(#518). 공개(익명) 목록 중에는 포스트 목록(`/public/v1/posts` · #520)만 커서 계약이라 `apiFetchList`를 쓰고, 행사 목록은 여전히 `apiFetch`.
- **학기는 웹의 규칙이다**(#520) — 1학기 = 3~8월, 2학기 = 9월~이듬해 2월(`entities/content/model/semester.ts`). 학사 학기가 아니라 방학을 앞 학기에 붙인 것이다 — 방학 중 활동을 «어느 학기»라고 물으면 사람들은 직전 학기라고 답한다. 서버에는 활동일(`actv_ymd`)만 있어 학기 필터 API가 없고, `fetchPublicPostsInSemester`가 활동일 역순 목록을 학기 시작일 앞까지 읽어 거른다(페이지 상한 20). 행사는 전량 조회 뒤 `eventBgngDt`로 거른다.
- **익명 콘텐츠 화면의 `Cache-Control`은 `next.config.ts` `headers()`가 건다**(#520 · ADR-0038) — 서버 익명 응답의 `public, s-maxage=300, stale-while-revalidate=600`을 «그대로 전달»하려 했으나 서버 컴포넌트는 응답 헤더를 만질 수 없고 `apiFetch`도 `data`만 돌려준다. 그래서 같은 값을 `/`·`/events`(정확히 그 주소 — `/events/:path*`면 신청 화면까지 걸린다)·`/about|operators|join|contact|privacy|photo-notice|terms|activities/**`에 정적으로 건다(Next는 이미 있는 `Cache-Control`을 덮어쓰지 않는다 · 홈·`/events`·`/contact`는 #524). **세션을 보는 경로(`/me`·`/f`·`/events/{id}/apply`)로 넓히지 않는다** — 남의 세션 화면이 CDN에 남는다. 서버가 값을 바꾸면 `PUBLIC_CACHE_CONTROL`도 함께. «준비 중»을 그린 200 응답도 같은 5분 남는다.
- **상단 바는 여섯 항목**(SSCC · 운영진 · 활동 · 행사 · 모집 · 문의 · `app/_shell/nav-links.ts`)이고 **«지원하기» CTA는 없다**(ssccops#382) — 모집 때는 홈 배너(페이지 `home-banner` · #524)가 안내한다. «행사»는 #520에서 «활동» 축이 품었는데 행사 목록으로 가는 길이 홈의 «행사 전체 보기» 하나뿐이라 #529에서 항목으로 세웠다(`/events`·`/events/{id}`에서 «행사»가 켜진다). «문의»는 `/contact` 화면이다(#524 — #520에서는 푸터 블록 `#contact`로 가는 앵커였는데 켜지지도 않고 공유할 주소도 없었다). 푸터의 문의 블록은 그대로 두고 두 자리가 같은 `shared/config/contact.ts`를 읽는다 — **메일은 옛 사이트에도 없어 null**이고 정해지면 거기 한 줄. 404 화면은 홈·활동 두 링크(#524).
- **포스트 분류는 코드테이블이 아니라 고정 enum**(`ACADEMIC`·`EVENT`·`NEWS`)이라 행사 분류처럼 목록에서 뽑지 않고 `entities/content/model/category.ts` 표로 둔다. 표에 없는 코드가 오면 카드를 그리지 않는다(죽은 주소로 보내지 않는다).
- 화면 규칙(토큰·간격·칩·카드·타임라인)은 [`docs/design-system.md`](docs/design-system.md).
- **가입은 화면을 옮기지 않는다.** `SignupStep`은 신청 흐름 안에 임베드되고(#154) 등급은 요청에 없다 — 서버가 TEMP로 고정한다. 학번이 이미 명부에 있으면 `MemberLinkStep`이 같은 자리에서 연결을 끝낸다(#364). 회원 생성은 되돌릴 수 없으므로 `pending` 외에 ref로 한 번 더 잠근다.
- **응답 → 도메인 변환에서 없는 값을 만들어 내지 않는다**(루트 규칙) — `@ssccops/date`·`@ssccops/share-meta`도 같은 선을 긋는다.

## 공유 카드(OG) — 한 번 굳는다

- 메신저는 OG를 한 번 캐싱하면 갱신하지 않는다. **접수 상태·마감일·잔여 정원은 담지 않는다**(ssccops#194 제약 ②) — 행사 상세는 기간·장소·본문 요약만, 공개 폼은 제목·안내 문구만, 페이지·포스트(#520)는 제목·요약(`smry` 없으면 본문 앞부분)·표지만 — **활동일·게시일 같은 시간값은 싣지 않는다.** 문구 변환은 `@ssccops/share-meta`의 `toShareDescription`.
- 공개 폼 카드는 익명 메타 경로 `/public/v1/forms/{formId}/meta`(ssccops-server#247)로 읽는다 — 응답자용 조회는 인증이 필요해 크롤러가 못 읽는다. 조회 실패·접수를 연 적 없는 폼은 **기본 메타로 조용히 떨어진다**(카드가 밋밋한 것과 페이지가 안 뜨는 것은 무게가 다르다).
- `/s/{token}` 착지는 **서버 `redirect()`를 쓰지 않는다** — 307이면 크롤러가 OG 담긴 HTML을 못 받는다. HTML을 한 번 그리고 이동은 브라우저가. 아무 내용도 그리지 않으므로 인증 없이 열려 있어도 새는 것이 없다 — 토큰은 미리보기 권한까지다(ADR-0016).

## 함정

- **어드민이 멀쩡한 것은 근거가 되지 않는다** — 공유 패키지 클래스가 빠지는 사고(#316)는 앱이 작은 www·lms에서 먼저 드러난다. `globals.css`의 `@source` 목록을 확인한다.
- 조회 실패를 던지지 않고 화면 안에서 안내로 그린다 — 서버가 잠깐 닿지 않을 때 공개 도메인이 통째로 오류 화면이 되는 편보다 낫다.
- www 고유 날짜 표기(행사 기간)는 `shared/lib/date.ts`에 남아 있다 — 세 앱이 같던 것만 `@ssccops/date`로 올라갔다.
- **`NEXT_PUBLIC_API_BASE_URL`은 빌드에 인라인된다** — `next start`에 env를 다르게 주어도 `.next`에 박힌 값이 나간다. 다른 서버로 눌러 보려면 그 값으로 다시 `next build`(#520에서 dev API로 확인할 때 걸린 함정).
- `/activities/{a}/{b}`는 라우트 하나다 — Next는 같은 자리에 이름이 다른 동적 세그먼트 둘(`[category]`·`[year]`)을 두지 못한다. 분류 조각은 알파벳뿐이라 연도와 겹치지 않는다.
