<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# apps/lms — 학술 공개 앱 (스터디 · 프로젝트 · 기획안)

**이 파일이 lms 규칙의 정본이고 루트 `AGENTS.md`는 링크만 든다**(ssccops#349). 세 앱 공통은 루트에. 이 앱은 학술관리 담당 팀원의 영역이다 — 규칙의 출처는 대부분 코드 주석이며 여기는 그 목차다.

**전 화면이 로그인 필수인 부원용 앱이다**(#169). 스터디장·팀장은 자기 프로그램을 운영하고(`/studio/*` — 대시보드·회차 기록·출석·팀원), 일반 회원은 기획안을 내고 상태를 본다(`/proposals/new` · `/my/applications`). **참여(모집) 신청 화면은 없다** — 2026-08-28 확정으로 시스템 폼(www의 공개 폼)이 맡는다. 학술 공유 링크는 여기서 **발급**하고 착지는 www가 받는다(ADR-0017).

**학술은 lms, 요약은 www `/me`**(ssccops#386 · www#518). www `/me`가 «내가 이끄는 스터디·프로젝트»를 `GET /v1/academic-programs?mine=leader`로 요약해 보여주고 카드는 이 앱의 `/studio/programs/{id}`로 온다 — 회차·출석·팀원·기획안은 여전히 여기서만 한다. `/my/applications`(내 신청)는 그대로 둔다(첫 화면 카드 구조 #228 불변).

## 화면과 역할

- 첫 화면 `/`(#228): 스터디장은 `redirect`로 `/studio`를 지나가고, 남은 사람에게는 «무엇을 하러 왔는지» 고르는 카드 둘(기획안 제출·내 신청). 뷰 안에 역할 조건문을 흩지 않는다.
- 상단 바 목차는 `app/_shell/nav-links.ts` **한 벌**을 데스크톱·드로어가 함께 쓴다. 역할 필터는 `visibleNavLinks`(#224) — 근거는 `GET /v1/academic-programs?mine=leader`가 한 건이라도 주는가(`fetchIsAcademicLeader`, 루트 레이아웃이 서버에서 한 번). `leadrMbrId === 내 mbrId`를 웹에서 다시 계산하지 않는다 — 판정은 서버.
- **계정 메뉴 절 ④ «홈페이지»는 `shared/config/site-links.ts`다**(#577 · ssccops#430 → #614) — www 오리진은 공유 링크가 이미 쓰는 `NEXT_PUBLIC_PUBLIC_FORM_ORIGIN`이고 비면 항목이 없다. 목차(`nav-links.ts`)에 섞지 않는 것은 역할·`isActive`가 없는 외부 앱이라서다. `features/auth`의 `accountApps()`가 `AccountMenuLink`로 바꿔 넘긴다. 새 env 없음.
- **«내 정보»(`/my` · `views/my-account`)와 «알림»(`/notifications` · `views/notification-list`)도 목차 밖이다**(#606) — 역할과 무관한 화면이라 묶음에 자리가 없다. 진입은 상단 바의 종(로그인한 사람에게만 · `AuthNav`의 `signedInSlot`)과 계정 메뉴 절 ② «내 정보»(`ACCOUNT_LINKS` · `features/auth`)다. «기획안 제출 현황»의 `isActive`는 `/my` 접두가 아니라 `/my/applications` 경로만 본다 — `/my`에서 그 탭이 켜지지 않게.
- **셸의 유틸리티는 계정 메뉴 하나, 종만 밖에**(#614 · ssccops#452 규칙 표가 정본). 상단 바는 `[☰(lg 미만)][브랜드][1차 메뉴(lg)]──[종][계정 메뉴]`(`app/layout.tsx` — 오른쪽 끝은 `AuthNav`가 `UtilityCluster`로), 모바일 드로어는 왼쪽에서 열리고(☰이 왼쪽으로 갔다) 목차 + `AccountSections`(②~⑥ 인라인)이며 로그인 전이면 «로그인» 하나. 메뉴 절은 ① 구글 계정 이름·이메일(`useAuthSession` — 세션의 `user_metadata`, 서버 안 부름) ② «내 정보» ③ 테마 ④ «홈페이지» ⑤ 홈 화면에 추가(`@ssccops/pwa/ui` `InstallMenuItem`) ⑥ 로그아웃. 로그인 판정은 `features/auth` `useAuthSession` 한 벌을 `AuthNav`·`MobileNav`가 각자 부른다(로컬 쿠키 — 왕복 없음, `onAuthStateChange`로 둘이 같이 바뀐다). **테마 라디오·«홈페이지 ↗»·«내 정보»·«로그아웃»·설치 항목을 상단 바나 드로어 발치에 다시 세우지 않는다.** `shared/ui`의 `ThemeToggle` shim은 쓰는 곳이 없어 지웠다.
- 경로는 `shared/config/routes.ts`의 `ROUTES`로만. 어드민의 `/academic-programs` 계열과 주소가 겹치지 않는다(소스를 공유하지 않는다).

## 규칙

- **조회는 서버 컴포넌트로 그린다**(www와 같은 규약 · #131·#172). `features/*/model/load-*.ts`가 SSR 로더이고 훅이 아니다 — 쿠키의 세션을 서버에서 읽어 토큰을 브라우저에 싣지 않고, 읽기 전용 화면에 상태 기계를 들이지 않는다. **브라우저에서 저장·제출해야 하는 것만** `shared/api/browser-client.ts`를 탄다: 기획안 자동 저장·제출(`use-proposal-form.ts`), 재제출, 회차 기록·출석, 공유 링크 발급·폐기.
- **리다이렉트를 하지 않는다.** `shared/api/client.ts`는 www에서 옮겨 온 것에 커서 페이징 봉투(`apiFetchList` — 어드민의 401 갱신·재로그인 리다이렉트는 함께 옮기지 않았다)만 더했다. 401·403은 오류로 올려 보내고 화면이 안내로 그린다. 미들웨어는 갱신기(가드 없음)이고 매처는 정적 자산·`auth/`·`version`만 뺀 전 경로다.
- **미가입(`SIGNUP_REQUIRED`) 안내는 `features/signup`의 `SignupRequiredNotice`다**(#453) — www의 `SignupStep`(기존 회원 연결 포함)을 가져와 같은 자리에서 가입하고 `router.refresh()`. 어드민 `/signup`으로 보내던 `signupUrl()`·`NEXT_PUBLIC_ADMIN_ORIGIN`은 없다. 문구는 자리마다 다르므로 제목·설명은 부모가 준다(`ProgramSignupNotice`는 그 래퍼).
- **로딩 완료 전에는 폼을 마운트하지 않는다** — 그러면 `useState` 초깃값이 곧 폼 초깃값이라 동기화용 `useEffect`가 없다(admin의 수정 화면과 같은 규칙).
- **검증은 `@ssccops/form-renderer`가 한다.** 필수·정규식·최대 선택 수·분기를 화면에서 한 줄이라도 다시 판정하면 서버 `ResponseAnswerValidator`와 맞춰 둔 규칙이 두 벌이 된다. 자동 저장 경로에는 검증을 걸지 않는다(작성 중 필수가 빈 것이 정상) — '다음'과 '제출'에서만.
- **기획안 자동 저장**(#185): 공개 폼의 초안 경로(`GET`·`PUT /v1/forms/{formId}/responses/draft`)를 쓴다. 저장·제출은 한 프라미스 체인에 줄 세우고, «더러움» 플래그 대신 보낼 본문의 직렬화 문자열과 마지막 저장 성공 본문을 비교하며, 보내는 순간의 본문은 최신 스냅샷에서 읽는다(디바운스 700ms · 재시도 1.5/3/6/12s). 재제출(#171)은 전체 본문 재전송이라 초안이 없다.
- **파일 형식·용량을 웹에서 판정하지 않는다**(출석 인증사진 #128) — 허용 목록과 상한은 서버에만 있고, 업로드는 presigned PUT이며 최종 판정은 업로드 응답 코드로 안내한다.
- **부분 갱신과 재조회를 가른다**(admin과 같은 규칙) — 출석은 해당 회차만 부분 갱신, 전이는 재조회.
- **화면 문구**는 루트 규칙 + #343(lms 전수 확인으로 세운 것): 대시 문장은 마침표 없음, 보조용언 붙여쓰기(`시도해주세요`).
- **학술 어휘는 한 벌이다**(#592 · ssccops#439 어휘 표 · ADR-0043). 스터디·프로젝트·트랙 묶음은 «학술 프로그램», 그 하나는 «프로그램» — 상단 바·페이지 제목·메타 설명은 «내 프로그램»·«프로그램 상세»·«프로그램 선택»이고 오류 문구는 «프로그램이 없습니다 — 내 프로그램 목록을 새로고침해주세요»다. «학술 활동»·«내 활동»은 쓰지 않는다 — 유형을 나열할 때만 «스터디·프로젝트·트랙». «회차»·«회차 기록»·«출석»은 프로그램 안의 일이라 그대로다. 주소(`/studio/programs`)·식별자는 그대로다.
- 오류 코드 → 문구는 `entities/*/api/error-codes.ts`·`features/*/model/*-error.ts`가 맡고 화면은 `ApiError.code`로만 분기한다(#29).
- **검색엔진에는 전부 닫혀 있다**(#602 · ssccops#444) — `app/robots.ts`가 `Disallow: /`, 루트 `metadata.robots`가 noindex. 전 화면 로그인 필수라 검색에 잡힐 화면이 없고, 검색으로 올 사람은 www `/academic`이 받는다. 공유 카드(OG)는 그대로다 — 메신저 크롤러는 robots.txt를 보지 않는다.
- **공유 카드(OG 이미지)는 `GET /og?card=…` 한 라우트가 그린다**(#556 · ssccops#418 — www 폼 카드 `f/[formId]/og`와 같은 뼈대, 1200×630, 마크 + 제목 + 부제). 카드는 `shared/config/og-cards.ts`의 허용 목록(`default` «SSCC 학술» · `proposal` «기획안 제출»)에서만 고르고 **쿼리의 문자열을 그대로 그리지 않는다** — 모르는 키는 기본 카드. 루트 레이아웃이 기본 카드를, `/proposals/new`가 기획안 카드를 `openGraph.images`에 건다. og:image는 절대 주소여야 하는데 `metadataBase`가 없어(dev·prod 도메인이 다르다) `shared/lib/og-image-url.ts`가 요청 헤더로 origin을 만든다(서버 전용 — 배럴에 싣지 않는다). 접수 기간처럼 시간에 따라 변하는 값은 담지 않는다(ssccops#194). 폰트는 `public/fonts`의 Pretendard를 자기 origin에서 fetch(ADR-0030 · 매처의 `otf` 제외가 그 짝).

## PWA — 서비스워커·푸시·설치 (#606 · ssccops#448 · ADR-0045)

1차(#169)는 manifest·아이콘까지였고 2차가 서비스워커·표준 Web Push(VAPID)·오프라인·설치 항목을 얹었다. 공통 코드는 `@ssccops/pwa`(규칙·함정은 `packages/pwa/README.md`)이고 어드민(#604)이 먼저 꽂은 모양을 그대로 따른다 — 여기에는 lms가 어디에 무엇을 꽂았고 어드민과 무엇이 다른지만 적는다.

- **서비스워커는 `app/sw.js/route.ts`가 문자열로 내준다** — `public/sw.js` 파일이 없다. `cacheVersion`은 `NEXT_PUBLIC_GIT_SHA`, `apiOrigin`은 `NEXT_PUBLIC_API_BASE_URL`의 오리진, `app: "LMS"`, `appOrigins`는 `site-links.ts`의 `appOrigins()` — **ADMIN은 이 앱의 새 env `NEXT_PUBLIC_ADMIN_ORIGIN`**(dev·prod 빌드 변수에 넣는다 · 비면 워커는 자기 `/notifications`로 연다), WWW는 `NEXT_PUBLIC_PUBLIC_FORM_ORIGIN`. `NEXT_PUBLIC_ADMIN_ORIGIN`은 #453이 걷어낸 이름이 **알림 용도로만** 돌아온 것이다 — 화면 링크에는 여전히 쓰지 않는다.
- **`/sw.js`·`/offline`은 미들웨어 매처에서 뺐다.** 이 앱은 리다이렉트하지 않아 등록이 막힐 일은 없지만 비밀이 없는 정적 응답에 Supabase 왕복을 붙이지 않는다. `/offline`은 루트 레이아웃 안에 그려진다(어드민은 셸 밖) — 이 앱의 셸은 세션 조회 실패를 `false`로 삼켜 오프라인에서도 선다. 등록은 루트 레이아웃의 `ServiceWorkerRegister`(`@ssccops/pwa/ui`), 띠는 `OfflineBanner`(같은 곳) — **개발 모드(`next dev`)에서는 등록되지 않는다.** 확인은 dev 배포에서 DevTools «Application › Service Workers».
- **로그아웃이 캐시를 비운다** — `useAuthSession().signOut`(#614 전에는 `AuthNav.signOut`)이 `signOut()` 성공 뒤 `clearServiceWorkerCache()`(`CLEAR_CACHE`)를 보내고 `router.refresh()`.
- **푸시 스위치는 «알림 설정» 카드 — `/my`(«내 정보» — #606에서 새로 둔 화면 · 로그인 계정 + 카드)와 `/notifications` 맨 위, 카드는 `@ssccops/pwa/ui` `NotificationSettingsCard` 한 벌**(#634 · ssccops#461 — `features/pwa` `NotificationSettings`는 `entities/push` `pushApi`(`browser-client` · `app: "LMS"`)·`notificationApi.sendTest`를 꽂는 배선뿐이고, 여기 있던 `PushToggleCard`·`usePushToggle` 사본은 지웠다). `/notifications`에서는 헤더 오른쪽 ⚙ «설정»(`NotificationSettingsButton`)으로 펼치고 절은 **스위치가 `off`·`denied`·`unsupported`면 펼친 채, `on`이면 접힌 채로** 시작한다(`useNotificationSettingsDisclosure` — localStorage 없음, 상태가 규칙). 로그인 게이트·가입 안내가 보일 때는 버튼도 절도 없다. 빈 목록에는 «푸시를 켜면 새 알림이 이 기기로 옵니다» + «설정 열기»(켜져 있으면 없음). 상태 문구는 `@ssccops/pwa`의 `pushStateDescription` 한 벌(어드민과 같은 글자 — 알림은 회원 단위라 어느 앱에서 켜든 같은 것이 온다). `DELETE`는 `data` 없는 200이라 `apiFetchAuthedNullableFromBrowser`, 404는 성공으로 삼킨다. **기기마다 따로 켠다.** 스위치가 켜져 있을 때만 카드 아래 **«테스트 알림 보내기»**(`@ssccops/pwa/ui` `PushTestButton` · ssccops#454 · #616 — `entities/notification` `notificationApi.sendTest` → `POST /v1/notifications/test {app: "LMS"}`, 링크는 `/my`, 1분 3회 넘기면 429). `Toggle`은 #616에서 `@ssccops/ui`로 올라갔고 `shared/ui/toggle.tsx`는 재export.
- **종은 `features/notification` `NotificationBell`** — 상단 바, 로그인한 사람에게만(`AuthNav`가 `signedInSlot`으로 받는다 — `features/auth`가 같은 레이어의 `features/notification`을 임포트하지 않으려고 조립은 `app/layout.tsx`). 배지 값은 `@ssccops/pwa`의 `useUnreadCount` 스토어(zustand 없음)이고 듣는 곳은 `UnreadCountSync` 하나(같은 slot — 진입·`visibilitychange`마다 `GET /v1/notifications/unread-count`, 실패는 조용).
- **`/notifications`는 `@ssccops/pwa/ui`의 `NotificationList`를 그린다** — 어드민과 같은 컴포넌트라 목록 모양을 여기서 고치지 않는다. 훅 `useNotifications`는 어드민 것과 같은 모양이되 **이 앱의 규약대로** 401·403을 상태(`unauthenticated`·`signup-required`)로 올려 화면이 `LoginGate`·`SignupRequiredNotice`를 그리고, «모두 읽음» 실패는 토스트가 없어 목록 위 한 줄(`actionError`)이다. **클라이언트 화면이다**(이 앱의 다른 조회는 SSR 로더) — 읽음 처리·«더 보기»가 브라우저 상태이고 종 배지와 같은 값을 그 자리에서 맞춰야 한다. 이동 규칙(`notificationTarget`)은 워커와 같다 — `app`이 LMS면 라우터, ADMIN·WWW면 `appOrigins()`의 오리진으로 전체 이동, 없으면 머문다(글자만).
- **«홈 화면에 추가»는 계정 메뉴 절 ⑤ — `@ssccops/pwa/ui` `InstallMenuItem`**(#614 · ssccops#452 — 이 앱의 `features/pwa` `InstallItem` 사본은 지웠다). `beforeinstallprompt`를 받은 브라우저에만 항목, iPhone·iPad는 «홈 화면에 추가는 공유 버튼에서 합니다» 한 줄, 설치된 창에서는 없다. 데스크톱에서도 계정 메뉴 안에 있다 — 상단 바가 꽉 차서 못 두던 자리 문제가 메뉴로 사라졌다.
- **lms 고유 사건(기획안 검토 결과·회차 승인 알림)은 없다**(ssccops#448 «1차 밖») — 지금 오는 알림은 어드민과 같은 셋(승인 요청·결과·마감)이고 운영진이 이 앱에서 구독했을 때의 이야기다. 서버 계약은 ssccops#446 표 그대로이고 어드민 `entities/notification/api`·`entities/push/api`와 같은 모양이다 — 서버 DTO를 대조할 때 두 앱을 함께 본다.

## 공유 링크 발급 (`entities/share/api/share-links.ts`)

서버는 URL이 아니라 **토큰**을 주고 조립은 웹이 한다. **이 앱이 발급하는 대상은 전부 www가 받는다** — 갈래가 하나뿐이고 그 사실을 타입(`ShareTargetOf<"www">`)으로 적어 두었다. 오리진은 `NEXT_PUBLIC_PUBLIC_FORM_ORIGIN`(www). 익명 미리보기는 읽지 않는다(착지 화면의 일). 토큰은 미리보기 권한까지다(ADR-0016).

## 함정

- **어드민이 멀쩡한 것은 근거가 되지 않는다** — 공유 패키지 클래스가 빠지는 사고(#316)는 앱이 작은 www·lms에서 먼저 드러난다.
- 다크모드·테마 토글은 `@ssccops/ui`의 `useTheme`·`ThemeToggle`(#341)이고 색은 토큰 이름으로만(`text-on-solid` 등 — admin과 같은 팔레트). 토글이 그려지는 자리는 계정 메뉴 절 ③뿐이다(#614).
- 반응형은 `lg` 하나(admin과 같다). 입력란 글자는 좁은 화면에서 16px 아래로 내리지 않는다(#105).
- `shared/config/codes.ts`는 `@ssccops/codes`를 재export 한다 — 표시명은 서버 시드와 글자까지 계약.
