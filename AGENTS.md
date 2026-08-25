<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

SSCC(숭실컴퓨팅클럽) 웹 — **pnpm workspace + Turborepo 모노레포**. 앱은 둘이다.

| 앱 | 워크스페이스 | 무엇 |
| --- | --- | --- |
| `apps/admin` | `@ssccops/admin` | 운영관리 어드민 — 로그인·권한이 있는 내부 화면 |
| `apps/www` | `@ssccops/www` | 공개 웹사이트 — **로그인 없이** 보는 행사 목록·상세 (#141) + 본인만 보는 '내 신청' (#150) + 참가 신청 (#154). 동아리 소개 등 공식 홈페이지 역할을 함께 맡는다(#160에서 `apps/events`에서 개명) |

둘 다 Next.js 16 App Router / React 19 / TypeScript 5 / Tailwind v4이고 같은 디자인 토큰
(Toss 라이트 · Pretendard)을 쓴다. `packages/*`에는 공유 패키지가 하나 있다 —
**`packages/form-renderer`**(`@ssccops/form-renderer` · #152). 토큰·`apiFetch`·행사 타입은
아직 두 앱에 각각 있고, 추출은 후속 이슈다. 백엔드는 별도 저장소
**`ssccops-server`**(Spring Boot), 인증은 Supabase Auth(Google OAuth · 두 앱이 **같은
프로젝트**를 쓴다 — 공개 앱은 '내 신청' 한 화면에만 붙어 있다), 배포는
Cloudflare Workers(OpenNext).

**아래 문서는 별도로 밝히지 않는 한 `apps/admin` 이야기다.** 공개 앱만의 규약은
「공개 웹사이트(`apps/www`)」 절에 모아 두었다.

> 위의 `nextjs-agent-rules` 블록은 `next dev`가 스스로 써넣는다. 지우면 uncommitted 변경으로
> 되살아나므로 **그대로 두고 그 바깥에** 쓴다. 개인 로컬 메모(포트·`.env.local`·증상별 원인
> 판별 등)는 git에 올리지 않는 `CLAUDE.local.md`에 둔다 — 이 파일은 팀이 공유하는 규약만 담는다.

## 검증 — CI와 같은 순서로 돌린다

```bash
pnpm install --frozen-lockfile   # 반드시 워크스페이스 루트에서 (락파일은 루트 하나)
pnpm typecheck                   # turbo run typecheck — typegen 을 선행 태스크로 물고 있다
pnpm lint
pnpm build
```

셋 다 `turbo run …` 위임이라 **앱 전부**를 돈다. 한 앱만 돌리려면 그 앱 디렉터리에서
`pnpm exec next typegen && pnpm exec tsc --noEmit && pnpm lint` 순서를 지킨다(typegen 이 먼저다).
CI(`integrate.yml`)도 같은 루트 명령을 쓴다 — 앱을 새로 추가해도 워크플로를 고칠 일이 없게
한 것이므로, 검증 단계에 앱 이름을 다시 적어 넣지 말 것.

- **`pnpm lint`만 돌리면 타입 오류를 CI에서 처음 만난다.** ESLint는 타입 검사를 하지 않는다.
- `next typegen`이 먼저인 이유: `PageProps`·`LayoutProps` 같은 전역 타입은 Next가 `.next/types`
  아래에 생성하고 `next-env.d.ts`가 그것을 참조한다. 새로 체크아웃한 트리에는 `.next`가 없어
  `tsc`가 `Cannot find name 'PageProps'`로 죽는다(`integrate.yml`의 lint job과 같은 순서다).
- Turborepo 기본 env 모드는 strict다 — 빌드가 새 환경변수를 읽게 되면 `turbo.json`의
  `build.env`(현재 `NEXT_PUBLIC_*`)에 선언해야 태스크에 전달되고 캐시 키에도 반영된다.
- **테스트 러너는 아직 없다.** CI의 test job은 `apps/*/src` 아래에 `*.test.*`·`*.spec.*`가
  있을 때만 돈다. 테스트를 처음 추가하는 사람이 러너와 `test:coverage` 스크립트를 함께 붙인다.
- SonarQube 분석은 토큰이 있을 때만 돌고 build를 막지 않는다. Prettier 단계는 없다(의존성도
  설정 파일도 없다 — 도입하려면 둘을 먼저 추가하고 워크플로에 단계를 되살린다).

## 아키텍처 — FSD

```
app → views → features → entities → shared     (단방향)
```

- 같은 레이어의 슬라이스끼리 참조하지 않는다. 여러 엔티티를 함께 바꾸는 로직은 `features`에 둔다.
- `views`가 FSD의 pages 레이어다(Next.js 예약어 충돌 회피). widgets 레이어는 생략했다.
- `app/`은 라우팅 전용 — 각 `page.tsx`는 `views`를 얇게 감싼다. 라우트 그룹은 `(admin)`(운영
  화면) · `(auth)`(로그인·가입) · `(public)`(공개 폼) · `auth/`(OAuth 콜백 라우트 핸들러)다.
- 슬라이스 내부: `entities/<slice>/{api,model}` · `features/<slice>/{model,ui}` · `views/<slice>/ui`.
- 화면 경로를 문자열로 적지 않고 `shared/config/routes.ts`의 `ROUTES`를 쓴다.

두 앱이 같은 레이어 이름을 쓰지만 **소스를 공유하지 않는다** — 각자 `src/` 아래에 자기
`shared`·`entities`를 갖는다. 한쪽에서 고친 것이 다른 쪽에 저절로 반영되지 않으므로, 토큰·
행사 타입처럼 겹치는 것을 고칠 때는 두 곳을 함께 본다. 예외는 아래 공유 패키지뿐이다.

## 공유 패키지 (`packages/*`) — #152

**`packages/form-renderer` (`@ssccops/form-renderer`)** 하나가 있다. 두 앱이 `workspace:*`로
소비하고, 어드민의 응답자 화면(`/f/{formId}`)에서 뽑아 왔다.

- **왜 뽑았나.** 공개 앱에 신청 흐름(EV-006)이 붙으면 같은 폼을 그려야 하는데, 렌더러를
  복사하면 **클라이언트 검증 규칙이 두 벌이 된다.** 필수 판정·정규식·최대 선택 수·분기
  (`branchMap`) 계산은 서버 `ResponseAnswerValidator`와 한 벌로 맞춰 둔 규칙이라, 한쪽만
  고쳐지면 "웹은 통과시키는데 서버가 거절하는" 폼이 생긴다.
- **무엇이 들어 있나.** 폼/응답 도메인 타입(`Qitem`·`QitemCpstCn`·`FormPage`·`RspnsCn`) ·
  문항 유형 코드(`QitemTypeCd`·`isChoiceQitemType`·`isTextQitemType`) · 답 다루기
  (`toggleOption`·`toRspnsCn`) · 분기 경로(`nextPageSeq`·`reachedPageSeqs`) · 검증
  (`validateAnswers`·`validatePageAnswers`) · 문항 유형별 렌더링(`QitemCard`).
- **무엇이 안 들어 있나.** HTTP 호출과 자동 저장·제출 훅(`usePublicForm`), 화면 셸, 권한
  게이트. 어드민 `apiFetch`는 401·403에 리다이렉트까지 걸지만 공개 앱은 일부러 걸지 않아
  (돌아올 화면이 없다), 전송 계층을 함께 옮기면 두 앱 중 한쪽에서 반드시 틀린다.
- **빌드 단계가 없다 — 소스를 그대로 export 한다.** 앱이 `transpilePackages`로 컴파일한다
  (`next.config.ts`). 패키지에 번들 단계를 두면 앱을 고칠 때마다 패키지를 먼저 빌드해야 하고,
  그 순서를 잊으면 옛 산출물이 조용히 쓰인다.
- **Tailwind는 이 패키지를 자동으로 훑지 않는다.** 각 앱 `globals.css`의
  `@source "../../../../packages/form-renderer/src";`가 그것을 시킨다 — 패키지는 pnpm 심링크로
  `node_modules` 아래에 보이고 자동 탐색은 거기를 건너뛴다. 지우면 문항 카드가 클래스 이름만
  있고 스타일이 없는 채로 뜬다.
- **검증 규칙을 앱에 다시 적지 않는다.** 어드민 `shared/config/codes.ts`의 문항 유형 블록과
  `entities/form`·`entities/response`의 타입 export는 **재export일 뿐** 정의가 아니다
  (임포트 경로를 지키려고 남긴 것이다).

## 공개 웹사이트 (`apps/www`) — #141 · #150 · #154

로그인 없이 누구나 보는 행사 목록(`/`)·상세(`/events/{eventId}`)와, 로그인한 본인만 보는
참가 신청(`/events/{eventId}/apply`)·'내 신청'(`/my-applications`)이다. wave2 결정
D1(비로그인 완전 공개) · D7(SSR/OG) · D12(md 안전 렌더링) · D2(회원만 신청) · D3(폼이
접수 중일 때만) · D15(공개 앱 안에서 작성) · D10(능동 통보 없이 '내 신청'에서 결과 확인)을
그대로 구현한 것이라, 아래는 취향이 아니라 결정 사항이다.

- **본체는 여전히 익명이고, 로그인은 신청·'내 신청' 두 화면에만 붙어 있다**(#150 · #154).
  목록·상세는 토큰 없이 그리고, `shared/api/client.ts`는 **봉투 벗기기와 `ApiError`만** 남긴
  익명 전용 구현 그대로다. 인증 호출은 옆에 **더한** 두 파일이 맡는다 —
  서버 컴포넌트용 `shared/api/authed-client.ts`와 브라우저용 `shared/api/browser-client.ts`.
  둘의 차이는 **토큰을 어디서 꺼내는가** 하나뿐이고(쿠키 vs Supabase 브라우저 세션), 봉투·오류
  변환은 둘 다 `apiFetch`를 통과하며 오류 코드·판정은 `shared/api/auth-error.ts` 한 벌을 본다.
  `authed-client`가 `next/headers`를 타므로 **클라이언트 컴포넌트에서 임포트하면 빌드가 깨진다**
  — 그래서 코드값만 따로 뽑아 둔 것이다.
- **인증 실패에 리다이렉트를 걸지 않는다.** 이 앱에는 로그인 화면이 없다(로그인은 지금 보고
  있는 화면 위에서 시작한다). 401은 화면 안의 로그인 유도로, 미가입은 **신청 흐름 안의 간편
  가입 폼**으로 그린다 — 어드민의 `apiFetch`처럼 리다이렉트를 옮겨 오면 되돌아올 곳이 없어
  왕복만 도는 길이 생긴다.
- **신청 흐름은 한 주소 안에서 끝난다**(#154 · §8-4). 로그인 → (미가입이면) 간편 가입 → 폼
  작성 → 제출이 `/events/{id}/apply` 하나에서 일어난다. 네 단계로 화면을 나누면 리다이렉트
  왕복마다 이탈이 생기고 돌아올 곳을 단계 수만큼 관리해야 한다 — 이 구간의 이탈이 가장 크다는
  것이 §8-4의 판단이다. 가입 폼은 **최소 필드**다(어드민 가입 화면에서 기수를 뺐다). 조건부
  필수 규칙(재학이면 학번·학과·학년)은 서버 `MemberSignupRequest`·`AcademicProfilePolicy`와
  같은 것을 보고, **등급은 서버가 TEMP로 고정**하므로 요청에 싣지 않는다.
- **미들웨어 매처는 `/my-applications`와 `/events/:eventId/apply` 둘이다.** 하는 일도 세션
  쿠키 갱신뿐이고 가드가 아니다(`shared/lib/supabase/proxy.ts`). **행사 상세는 매처에 없다** —
  `/events/:path*`로 넓히면 공유 링크로 들어오는 익명 조회마다 Supabase 왕복이 붙는다.
- **전 화면이 서버 컴포넌트다** — 예외는 로그인 상태를 쥐어야 하는 `features/auth`의 두
  컴포넌트(`AuthNav`·`SignInButton`)와 **신청 흐름의 작성 화면**이다(`features/signup` ·
  `features/apply` · `views/event-apply`의 클라이언트 부분). 뒤쪽이 예외인 이유는 답을 고칠
  때마다 초안을 저장하고 제출까지 해야 해서 서버 렌더만으로는 그릴 수 없기 때문이다 — 대신
  **행사가 신청을 받는가·이 사람이 회원인가는 서버에서** 판정하고 결과만 넘긴다.
  상세를 SSR로 그리는 이유가 OG 메타태그이고
  (카카오톡·에타 크롤러는 자바스크립트를 돌리지 않는다), '내 신청'도 같은 규약을 따라 SSR로
  그린다 — 쿠키의 Supabase 세션을 서버에서 읽으면 토큰이 브라우저 코드에 실리지 않고 이 앱에
  데이터 페칭 상태 기계를 들이지 않아도 된다. 헤더의 로그인 상태만 클라이언트에서 보는 것은,
  거기서 쿠키를 읽으면 익명 공개인 목록·상세 렌더에까지 세션 조회가 끼어들기 때문이다.
- **본문 Markdown은 원시 HTML을 해석하지 않는다**(D12). `react-markdown`의 기본 동작이 그것이고,
  안전장치는 **`rehype-raw`를 쓰지 않는 것** 하나다. 표·체크박스가 필요해 플러그인을 더할 일이
  생기면 sanitize를 함께 걸 것.
- **공개 분류 목록 엔드포인트가 없다.** 필터 칩은 게시된 행사들이 실제로 쓰는 분류에서 뽑는다
  (`toClassifications`) — 그래서 목록을 두 번 조회한다(필터 건 것 + 칩용 전체). 행사가 없는
  분류는 칩에도 서지 않는데, 눌러도 빈 목록만 나올 칩을 세울 이유가 없다.
- **없는 행사와 아직 공개하지 않은 행사를 화면이 가르지 않는다.** 둘 다 404(`not-found.tsx`)로
  보낸다 — 문구로 가르면 게시 전 행사의 존재가 주소만으로 새어 나간다.
- 코드값 표시명은 `entities/<slice>/model/display.ts` 한 곳에서 만든다(행사 배지는
  `entities/event`, 신청 상태 배지는 `entities/application`). 어드민과 어휘가 갈리는 자리가
  있다(`ACCEPTING` → 어드민 '접수중' · 공개 '모집 중'). 화면이 보는 사람이 다르므로 일부러
  다르게 둔 것이고, 코드값 자체는 어느 쪽에도 노출하지 않는다.
- **대기 순번을 말하지 않는다**(D5 — 비공개). 서버가 순번을 내려주지 않기도 하지만, 없는 값을
  "곧 차례가 옵니다" 식으로 짐작해 쓰면 그것대로 약속이 된다. 신청 상태 문장(`display.ts`의
  `note`)이 D10의 전부이므로 여기에 순번을 암시하는 말을 넣지 말 것.
- 일시는 서버가 준 문자열을 **잘라 쓴다**(`shared/lib/date.ts`). `new Date(...)`로 파싱해 로컬
  시간대로 그리면 서울 밖에서 연 사람에게 다른 시각이 보인다.
- **신청 버튼이 열리는 조건은 둘이다**(D3 · #154): 연결된 폼이 모집 중(`ACCEPTING`)이고
  상세 응답에 `formId`가 있어야 한다. 접수 상태만 보고 열면 폼을 가리키지 못하는 행사에서
  신청 화면이 "신청서를 찾을 수 없습니다"로 끝난다. **모집 중이 아니어도 버튼 자리를 감추지
  않는다** — 감추면 신청 방법이 없는 공지형 행사와 구별되지 않으므로 잠근 채로 사유를 적는다.
  - **`formId`는 상세에만 오고 목록에는 오지 않는다.** 공개 목록 DTO가 일부러 뺐다.
  - 서버가 아직 상세 응답에 `formId`를 싣지 않는 배포에서는 값이 비고, 그때 화면은 버튼을
    열지 않는다(옵셔널로 받아 null로 굳힌다) — 없는 값을 만들어 내지 않는 규칙의 한 자리다.
- **신청서 문항은 `@ssccops/form-renderer`가 그린다.** `features/apply`의 훅에 있는 것은
  전송 계층(조회·자동 저장·제출)뿐이고, 필수 판정·형식·최대 선택 수·페이지 분기는 전부 패키지
  함수를 부른다 — 한 줄이라도 여기서 다시 판정하면 서버 `ResponseAnswerValidator`와 맞춰 둔
  규칙이 두 벌이 된다. **자동 저장 디바운스(700ms)와 재시도는 웹 책임**이고 훅이 갖는다.
  자동 저장 경로에는 검증을 걸지 않는다(작성 중에 필수가 비어 있는 것이 정상이다).
- '내 신청'은 이미 낸 신청을 **보여 주기만** 한다. 제출 완료 화면도 결과 통보를 약속하지 않고
  그 화면을 가리킬 뿐이다(D10).
- **본인 철회(응답 철회·대기 이탈)는 일부러 만들지 않았다.** 허용 범위 결정이
  SoongSilComputingClub/ssccops#138 에서 미결이다 — 결정 전에 버튼을 세우면 되돌릴 화면을
  먼저 짓는 셈이다. 결정이 나면 '내 신청' 카드에 붙인다.
- Supabase Redirect URLs 에 **공개 앱 오리진을 따로 등록**해야 한다(`.env.example` 참고).
  어드민 오리진만 등록돼 있으면 여기서 시작한 로그인이 어드민 도메인에서 끝나고 조용히
  실패한다 — 어드민이 ssccops#84 로 실제로 밟은 함정이고, 오리진이 늘어난 지금 다시 밟기 쉽다.
- 배포 설정 파일(`open-next.config.ts`·`wrangler.jsonc`)은 어드민과 같은 방식으로 준비만 해 뒀다.
  **Cloudflare 리소스 생성과 Workers Builds 연결은 아직 안 돼 있다**(후속).
- 개발 서버 포트는 **3001**로 박아 뒀다(`next dev -p 3001`). 루트 `pnpm dev`는 두 앱을 함께
  띄우는데, 둘 다 기본 포트를 쓰면 나중에 뜬 쪽이 매번 다른 포트로 밀려 주소가 흔들린다.

## 서버 연동 규약

- 모든 응답은 `{ success, code, message, data }` 봉투다. `apiFetch`가 벗겨 `data`만 돌려주고,
  실패는 전부 `ApiError`(`code` + `status`)로 통일된다. **호출부는 `message`가 아니라 `code`로
  분기한다** — 문구는 서버에서 바뀌지만 코드는 계약이다.
- 커서 페이징 목록은 `page` 봉투가 함께 오므로 `apiFetchList`(배열 + `page`)를 쓴다. 페이지
  번호는 없고 `nextCursor`·`hasNext`로 이어 받는다. 파일 업로드는 `apiUpload`.
- 401(재로그인)·403 `SIGNUP_REQUIRED`(가입 화면)는 `apiFetch`가 리다이렉트까지 끝낸다 —
  화면이 다시 다루지 않는다. 남은 403은 화면이 문구로 안내한다.
- `NEXT_PUBLIC_API_BASE_URL` 미설정은 `CLIENT_CONFIG_MISSING`, 서버에 닿지 못한 요청은
  `CLIENT_NETWORK_ERROR`로 온다(CORS 미등록도 같은 코드로 보인다 — 서버가 꺼진 것과 증상이 같다).

### 신규 도메인을 연동할 때의 패턴

1. `entities/<slice>/api/*.ts` — `apiFetch` 호출 · 서버 응답 타입(`*Response`) 정의 ·
   도메인 타입으로 옮기는 `to*` 함수.
2. `entities/<slice>/model/types.ts` — 화면이 쓰는 도메인 타입.
3. `features/<slice>/model/use-*.ts` — 로딩·오류·재조회 상태를 쥐는 훅.
4. `features/<slice>/model/*-error.ts` — `ApiError.code` → 화면 문구 매핑. 화면은 이 함수만 부른다.
5. mock JSON과 zustand 스토어는 **제거한다**(폼 도메인이 처음 밟은 경로).

**응답 → 도메인 변환에서 없는 값을 만들어 내지 않는다.** 빈 이름을 `"-"`로 채우는 것은 표시
규칙이고, 그것은 그리는 쪽(뷰)이 정한다. 변환기가 채워 버리면 "값이 없다"와 "서버가 `-`를
줬다"를 구별할 수 없다.

## 데이터 표기 — 데이터사전을 따른다

| 항목 | 규칙 |
| --- | --- |
| 필드 | DB 컬럼ID의 lowerCamelCase (`mbr_id` → `mbrId`) |
| 타입명 | 테이블ID의 PascalCase (`sub_work_aprv` → `SubWorkAprv`) |
| 식별자 | `number` 단일 PK. URL도 숫자 (`/members/1`) |
| 코드값 | **코드로 비교한다** — 한글 표시 문자열 비교 금지 (`shared/config/codes.ts`) |
| 날짜·일시 | 일자 `YYYY-MM-DD` · 일시 ISO-8601 |
| 불리언 | `*Yn` 접미사 |

D-day·마감 임박·진행률은 **저장하지 않고 파생한다**(`shared/lib/date.ts`). 서버 데이터의
기준일은 `todayInSeoul()`이다 — PoC 시절의 고정 기준일을 쓰면 이미 지난 마감이 미래로 보인다.

## 인증 · 권한

- 세션 갱신·가드는 `src/middleware.ts`가 한다. Next 16의 컨벤션은 `proxy.ts`지만
  `@opennextjs/cloudflare`가 아직 인식하지 못해 빌드가 깨진다 — **함부로 옮기지 말 것**
  (한 번 옮겼다 되돌린 이력이 있다). 매처는 좁게 잡는다(요청마다 Supabase 왕복이 붙는다).
- 권한은 서버가 `GET /v1/auth/session`의 `member.capabilities` 배열로 내려준다. 화면이 권한을
  묻는 **유일한 통로는 `useCan(CAPABILITY.X)`**다.
- **역할 이름·서열(`indct_seqno`)·권한 트리 펼침을 웹에서 다시 계산하지 않는다.** 판정 규칙은
  서버 `AuthorityPolicy` 한 곳에만 있고 웹은 배열에 코드가 있는지만 본다(규칙이 두 벌이 되어
  실제 버그가 났던 전례가 있다).
- **묶음 코드로 판정하지 않는다.** 어떤 역할에 `FORM_WRITE`만 직접 부여하면 그 회원의 배열에
  `FORM_MANAGE`는 없다 — 화면이 묶음 코드를 찾으면 서버가 허용하는 버튼을 감춘다.
- **조회 권한과 쓰기 권한이 갈린 자리가 있다**(서버 #101): `WORK_READ`/`WORK_MANAGE` ·
  `MEETING_READ`/`MEETING_MANAGE` · `MEETING_AGENDA_WRITE` · `SUB_WORK_TYPE_READ`/`_MANAGE`.
  자리마다 **서버가 그 엔드포인트에 요구하는 코드**를 본다. 예: 회의 상세에서 개회·종료·취소는
  `MEETING_MANAGE`지만 안건 추가·수정·철회는 `MEETING_AGENDA_WRITE`다(국원도 갖는다).
- **승인·투표 자격도 권한이다**(서버 #123 — 직위 코드 `role_pstn_cd`와 웹의 `AUTZR_ROLE_NM`
  하드코딩은 사라졌다). 투표는 `useCan(CAPABILITY.APPROVAL_VOTE)`로 사전 잠금하고, 승인·반려는
  유형마다 요구 결재 권한이 달라 지금처럼 서버가 건별로 내려주는 `canApprove`·`canReject`를
  쓴다. 승인자 **표시명**은 응답의 `authorizerAuthorityName`(권한 이름 — 운영 데이터)이고,
  유형 폼의 선택지는 `GET /v1/sub-work-types/authorizer-authorities`가 준다 — 코드 → 이름
  사전을 웹에 다시 만들지 말 것.
- **이동은 감추고, 동작은 잠근다.** 사이드바 메뉴는 권한이 없으면 감추고(갈 수 없는 곳을
  목차에 남기면 목차 전체를 믿을 수 없다), 화면 안의 버튼은 남긴 채 잠그고 사유를 `title`로
  붙인다(이미 그 화면을 보고 있는 사람에게서 버튼만 소리 없이 사라지면 기능이 없어진 것인지
  권한 문제인지 알 수 없다).
- 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 —
  `syncSessionOnForbidden`으로 세션을 다시 맞춘다.

## 화면 문구 (#117)

화면에 노출되는 문구는 운영진이 읽는 1차 문서다. 새 화면을 만들 때 아래를 지킨다.

- **요구 권한은 이름으로 밝힌다** — `업무를 등록할 권한이 없습니다 — 업무 관리(WORK_MANAGE) 권한이 필요합니다`. "운영진 권한이 필요합니다"처럼 뭉뚱그리면 막힌 사람도, 권한을 주려는 사람도 무엇이 필요한지 모른다.
- **역할 서열로 설명하지 않는다** — "국장 이상"은 시스템에 없는 판정이다(서열이 아니라 권한 보유로 판정한다). 부회장에게 그 권한을 직접 부여한 경우를 설명하지 못하고, 읽는 사람은 권한이 아니라 직책을 옮겨야 하는 것으로 이해한다.
- **개발 용어를 쓰지 않는다** — `@RequireAuthority`·PK·API·인가·도메인은 화면을 보는 사람에게 아무 뜻도 전하지 않는다. 뜻은 유지하되 사용자의 말로 쓴다.
- **오류는 원인 + 다음 행동** 순서로, 부연은 대시(`—`)로 잇는다. 같은 상황에는 같은 문구를 쓴다(도메인마다 404·403 문구가 갈리지 않게).
- **존댓말·평서형**, 느낌표와 이모지는 쓰지 않는다. 버튼·칩·표 헤더는 좁은 화면(375px)에서 깨지므로 길이를 늘리지 않는다.
- **`shared/config/codes.ts`의 표시명은 문구가 아니라 계약이다** — 서버 `data.sql` 시드와 글자까지 맞춰져 있어 여기서 다듬으면 화면이 조용히 빈 라벨로 깨진다. 바꾸려면 서버 시드와 함께 바꾼다. `FIELD_LABEL`의 데이터사전 표기(`유형_명`)도 같다.
- 서버가 내려주는 문구(권한명·경고)는 서버 소관이라 화면에서 고치지 않는다.

## 주요 결정 (왜 그렇게 돼 있는가)

- **버튼은 '지금 할 수 있는 전이' 하나만 그린다.** 두 단계를 건너뛰려고 요청을 이어 보내면
  앞만 성공한 채 끊겼을 때 사용자가 누른 적 없는 상태로 남는다. 스테퍼가 가리키는 단계와
  버튼이 언제나 같은 것을 말하게 한다.
- **권한과 선행 조건을 나눠서 본다.** 서버가 주는 `canApprove`·`canReject`는 **권한만** 답한다.
  누를 수 있는지는 업무 상태·완료 점검 목록·정족수로 화면이 따로 판단한다 — 섞으면 정족수가
  모자란 승인자와 권한이 아예 없는 사람이 같은 대접을 받아 승인자에게도 버튼이 사라진다.
- **정족수 투표는 하위 업무 상세에서 한다**(#82). 승인함(`/approvals`)은 서버가 `WORK_MANAGE`로
  좁혔는데 투표 자격은 그보다 넓어, 국원은 자격만 갖고 투표할 화면이 없었다. 두 화면의 찬반
  버튼은 같은 훅(`useApprovalDecisions`)을 쓴다. **정족수는 승인자를 대체하지 않는다** — 표가
  다 모여도 완료는 승인자가 누르고, 승인자라도 정족수 전에는 누를 수 없다.
- **부분 갱신과 재조회를 가른다.** 응답이 바뀐 값을 **다시 세어** 주면 그것만 갈아 끼우고
  (완료 점검 체크), 화면이 그리는 다른 값까지 함께 움직이면 통째로 다시 부른다(상태 전이·투표).
  전이 응답으로 부분 갱신하면 반려 직후 화면에 이전 반려 사유가 남는다.
- **서버의 PATCH는 대개 전체 교체다.** 선택 입력도 생략하면 지운 것으로 본다 — 화면은 현재
  값을 전부 입력란에 채워 보여주고 부분 입력 폼을 만들지 않는다.
- **단건 수정은 등록 화면을 재사용하지 않고 `views/<slice>-edit`로 따로 둔다.** 등록 화면은
  여러 종류를 한 상태 기계로 다뤄, 수정을 얹으려면 그 분기 속에 '종류 고정·기존 값 불러오기·
  제출 대상 교체'를 끼워 넣어야 한다. 상세 조회가 `ready`가 되기 전에는 폼을 마운트하지 않는다
  — 그러면 `useState` 초깃값이 곧 폼 초깃값이라 동기화용 `useEffect`가 필요 없다.
- **하위 업무 유형은 수정 화면에서 바꿀 수 없다.** 바뀌면 승인 필요 여부·승인자·정족수·완료
  점검 항목이 통째로 달라지는데 그 값들은 등록 시점에 이미 복사돼 있고(소급 금지) 재지정을
  반영할 방법이 없다. 서버 요청도 이 값을 받지 않는다.
- **화면에 없는 입력란은 만들지 않는다.** 서버가 받지 않는 값(하위 업무 유형의 기준 금액 등)에
  입력란만 두면 사용자가 넣은 값이 저장 없이 사라진다.
- **끌 수 있는 기준정보는 꺼진 것도 관리 목록에 싣는다**(취소선). 안 그러면 끈 것을 되돌릴 길이
  없다. 반대로 **등록 폼의 선택지에는 켜진 것만** 싣는다 — 목록에 있던 것을 골랐을 뿐인데
  400이 나면 사용자는 이유를 알 수 없다.
- **목록은 커서 페이징이라 '더 보기'가 붙는다.** 페이지 번호가 없으므로 페이지네이터를 그리지
  않는다.
- **반응형은 `lg`(1024px) 한 경계로만 가른다**(#85). 예전에는 데스크톱 전용이었고
  `body { min-width: 1024px }`가 그것을 강제했다 — 그 값을 그대로 브레이크포인트로 삼았으므로
  **`lg` 이상은 정의상 예전과 같은 화면**이다. 새 화면을 만들 때도 기본값을 모바일로,
  `lg:`를 데스크톱으로 쓰고, 기존 클래스를 지우는 대신 `lg:`를 덧붙인다.
  - 관리자 셸은 `lg` 미만에서 사이드바 대신 드로어를 쓴다(`_shell/mobile-nav.tsx`).
    메뉴 목차·권한 판정은 `_shell/use-shell-nav.ts`, 마크업은 `_shell/nav-panel.tsx`
    **한 벌뿐이다** — 사이드바에만 메뉴를 더하면 드로어에서 빠진다.
  - `GridTable`은 `lg` 미만에서 카드로 바뀐다. 열이 많아 카드가 길어지면 `mobileHide`,
    제목 줄을 바꾸려면 `mobilePrimary`를 열에 붙인다(기본은 첫 열이 제목).
  - **입력란 글자는 좁은 화면에서 16px 아래로 내리지 않는다**(#105). iOS Safari는 16px
    미만인 `input`·`textarea`·`select`에 포커스하면 화면을 자동 확대하고 **그 확대는 스스로
    돌아오지 않는다** — 첫 칸에 입력하는 순간 폼 전체가 커진 채로 남는다. 미관이 아니라
    동작 문제이므로 `text-[16px] lg:text-[원래값]` 형태로 쓴다. 공용 입력은
    `shared/ui/field.tsx`의 `INPUT_BASE`·`SelectField`와 `shared/ui/search-input.tsx`에
    이미 걸려 있다 — 새 입력 컴포넌트를 만들 때 이 규칙을 빠뜨리기 쉽다.
  - **아직 전 화면이 대응된 것은 아니다.** `min-width` 제거로 드러난 나머지 화면은 후속
    이슈로 남아 있다 — 좁은 폭에서 깨지는 화면을 만나면 그것부터 확인할 것.

## 함정

- **`CLAUDE.md`와 `AGENTS.md`의 자동 생성 블록은 `next dev`가 다시 써넣는다.** diff에서 지워도
  되살아나므로 그대로 두고 커밋한다.
- **`.env*`는 통째로 ignore되고 `.env.example`만 예외다.** env 파일은 앱 디렉터리
  기준이다 — `apps/admin/.env.local`·`apps/www/.env.local`처럼 앱 안에 각각 둔다
  (루트에 하나 두면 Next가 읽지 않는다 — 두 앱을 함께 띄울 때 빠뜨리기 쉽다).
  `NEXT_PUBLIC_*`은 빌드 타임에 인라인되므로 **값을 바꾸면 `pnpm dev`를 재시작해야** 반영된다.
- **`README.md`에는 PoC 시절 서술이 남아 있다**("API 미연동 PoC", zustand 시드). 지금은 대부분의
  도메인이 서버 연동이고 목 스토어는 `features/approval/model/use-approval-actions.ts`(어디서도
  쓰지 않는다)에만 잔재로 남아 있다 — 승인함은 `useApprovalDecisions`를 쓴다.
- **서버와 버전을 맞춰 띄워야 채워지는 화면이 있다.** 서버가 옛 버전이면 나중에 추가된 응답
  필드만 조용히 빈다. 값 하나가 안 보이면 서버 브랜치를 먼저 확인할 것.
- **`shared/config/codes.ts`는 서버 표준코드와 함께 움직인다.** 서버가 코드를 추가하면 여기도
  더해야 하고, 한글 표시명은 이 파일에서만 만든다.

## 커밋 · 브랜치 · PR

`.github/workflows/`가 강제하는 것과 사람이 지켜야 하는 규칙이 나뉜다.

- **base 브랜치는 `develop`이다** — `main`은 릴리스 전용이고 직접 커밋하지 않는다.
  **서버 레포(`ssccops-server`)는 base가 `main`이라 다르다.** 두 레포를 오갈 때 주의할 것.
- 브랜치: 이슈를 열면 `issue-branch-creator.yml`이 제목 앞 태그(`[Feat]`/`[Fix]`/`[Refactor]`/
  `[Docs]`/`[Chore]`/`[Test]`)를 읽어 `{type}/#{이슈번호}-{영문 슬러그}`로 만들어 준다.
  직접 만들어야 한다면 같은 형식을 따른다.
- 커밋 메시지: 이슈가 있으면 `#{이슈번호} {type}({scope}): 설명`, 없으면 `{type}({scope}): 설명`.
  `pr-labeler.yml`이 커밋 첫 줄에서 타입을 파싱해 PR 라벨을 붙이므로 표기를 벗어나면 라벨이
  붙지 않는다 — `feat`/`fix`/`refactor`/`design`/`style`/`docs`/`test`/`chore`/`init`/`rename`/
  `remove`/`cicd`. (`/commit-message` 스킬이 이 형식을 만들어 준다.)
- PR 제목은 `[#이슈번호] 총 작업 내용` — **Squash merge 시 그대로 커밋 제목이 되므로** 형식을
  지킨다. 이 레포는 Squash and merge만 쓴다. (`/create-pr` 스킬)
- `main`·`develop`으로 향하는 PR은 `integrate.yml`(Lint → Test → Analyze/Build)과
  `pr-approval-check.yml`(리뷰 승인)이 함께 돈다.
