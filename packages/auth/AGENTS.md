# packages/auth — `@ssccops/auth`

**이 파일이 정본이고 루트 `AGENTS.md`는 링크만 든다**(ssccops#349). «왜 그 모양인가»는 `src/index.ts` 머리 주석에 있다 — 여기는 규칙만.

세 앱이 함께 쓰는 로그인 왕복·세션 유틸(ssccops-web#329). `next-path`(`?next=` 검증) · `oauth-next`(OAuth 목적지 쿠키) · `supabase/{client,server,proxy}`. **`supabase/*`는 배럴에서 내보내지 않는다** — `server.ts`가 `next/headers`를 끌어와 클라이언트 번들을 오염시키므로 진입점을 `@ssccops/auth/supabase/{client,server,proxy}`로 나눈다.

## 규칙

- **`updateSession`은 기본이 갱신기다.** 미인증 요청을 로그인으로 밀어내는 것은 두 번째 인자 `SessionGuard`를 줄 때뿐이고, **주는 앱은 admin 하나다**(`apps/admin/src/shared/lib/supabase/guard.ts`). www·lms에는 밀어낼 로그인 화면이 없어 인자를 비운다 — 로그인은 지금 보고 있는 화면 위에서 시작한다.
- **여기 없는 것**: `api/client.ts` 계열(admin만 401·403 리다이렉트까지 끝낸다) · 미들웨어 매처(앱마다 정반대 — www는 세 경로, lms·admin은 정적 자산만 제외) · `ROUTES`(앱마다 다른 화면 목차 — 그래서 함수가 기본 경로를 인자로 받는다) · `PUBLIC_PATHS`(admin의 값 — `/s` 착지가 크롤러를 통과시키려는 것이라 여기로 올리면 www·lms에 뜻 없는 예외가 생긴다).
- **요청의 공개 오리진은 `requestOrigin(request)`다**(#696) — `x-forwarded-host` → `host`, `x-forwarded-proto` → `request.url`의 스킴 순. `new URL(request.url).origin`은 컨테이너에서 `https://0.0.0.0:3000`이 된다. 헤더를 믿는 근거는 앞단 프록시(Coolify의 Traefik·Vercel)가 클라이언트가 보낸 `X-Forwarded-*`를 덮어쓴다는 실측이다 — 그렇지 않은 프록시 뒤에 둘 때는 이 가정부터 다시 잰다. 서버 전용 모듈을 부르지 않는 순수 함수라 배럴에서 내보낸다.
- `middleware.ts`를 `proxy.ts`로 바꾸지 않는다 — `@opennextjs/cloudflare`가 인식하지 못해 빌드가 깨진다(admin이 한 번 옮겼다 되돌렸다). 세 앱이 같은 이유로 구 컨벤션을 유지한다.
- **Tailwind `@source`는 필요 없다** — 마크업이 없다(전부 `.ts`). 컴포넌트를 더할 일이 생기면 그때 세 앱에 `@source` 한 줄씩을 함께 더한다.
- 합칠 때는 **앱마다 diff를 먼저 읽고 코드가 같은 것만** 올린다 — 한 PR이 세 앱의 인증 경로를 동시에 건드리면 로그인이 깨졌을 때 어느 변경 탓인지 가를 수 없다(#243이 인프라 계열을 남겨 둔 이유).
