<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

SSCC(숭실컴퓨팅클럽) 운영 시스템의 웹 — **pnpm workspace + Turborepo 모노레포**(앱 3 · 패키지 9).
Next.js 16 App Router / React 19 / TypeScript 5 / Tailwind v4. 백엔드는 별도 저장소
**`ssccops-server`**(Spring Boot), 인증은 Supabase Auth(Google OAuth), 배포는 **prod = Vercel
Hobby(`main`) · dev = 동아리방 Coolify 컨테이너(GHCR 이미지, `develop`)** — 아래 «배포» 절.

## 영역 — 앱 3 · 패키지 9

영역 고유 규칙(화면·인증 방식·주요 결정·함정)은 **각 영역의 `AGENTS.md`가 정본**이다(ssccops#349 —
서버가 도메인별로 한 것과 같다). 여기서는 가리키기만 하고 `@`로 끌어오지 않는다 — 끌어오면 분리한
이유가 사라진다. 이 파일에 남은 것은 세 앱에 **함께** 적용되는 규칙뿐이다.

| 영역 | 한 줄 | 정본 |
|---|---|---|
| `apps/admin` | 운영진 어드민 — 회원·업무·회의·승인함·폼·행사·학술·공유 링크·OAuth 동의. **유일하게 401·403 리다이렉트를 끝내고 `SessionGuard`를 주는 앱** | [apps/admin/AGENTS.md](apps/admin/AGENTS.md) |
| `apps/www` | 공개 웹사이트 — 행사·콘텐츠 다섯 축(익명 · ADR-0038)·신청(가입 임베드)·내 활동 `/me`·공개 폼 `/f`·공유 착지 `/s`. 전 화면 SSR, 리다이렉트 없음 | [apps/www/AGENTS.md](apps/www/AGENTS.md) |
| `apps/lms` | 학술 공개 앱 — 스터디장 스튜디오·기획안·내 신청. 로그인 필수, 역할별 상단 바, 공유 링크 발급(착지는 www) | [apps/lms/AGENTS.md](apps/lms/AGENTS.md) |
| `packages/ui` | 세 앱 공용 표시 요소·테마·배포 표식(`deployMarks`)·`BrandMark` — 둘 이상이 실제로 쓰던 것만 | [packages/ui/AGENTS.md](packages/ui/AGENTS.md) |
| `packages/auth` | Supabase 클라이언트·세션 갱신(`updateSession` + 앱이 주입하는 `SessionGuard`)·`?next=` 검증·OAuth 목적지 쿠키 | [packages/auth/AGENTS.md](packages/auth/AGENTS.md) |
| `packages/signup` | www·lms가 함께 쓰는 가입 화면 한 벌(`SignupStep`·`MemberLinkStep`) — 전송 계층은 `apiFetch`로 받는다(#664) | [packages/signup/AGENTS.md](packages/signup/AGENTS.md) |
| `packages/form-renderer` | 폼 문항 렌더링·응답 검증 — 전송 계층을 모른다 | [packages/form-renderer/AGENTS.md](packages/form-renderer/AGENTS.md) |
| `packages/share-meta` | 공유 카드 문구·공유 대상 → 착지 앱 규칙(ADR-0017) | [packages/share-meta/AGENTS.md](packages/share-meta/AGENTS.md) |
| `packages/codes` | admin·lms가 함께 쓰는 서버 표준코드·표시명(계약) | [packages/codes/AGENTS.md](packages/codes/AGENTS.md) |
| `packages/date` | 서버 일시 문자열 → 표기(잘라 쓴다 · `todayInSeoul`) | [packages/date/AGENTS.md](packages/date/AGENTS.md) |
| `packages/content` | 콘텐츠 페이지 카탈로그 — www 라우트 슬러그 표와 어드민 페이지 목록이 같은 표(#534) | [packages/content/AGENTS.md](packages/content/AGENTS.md) |
| `packages/pwa` | 서비스워커 소스(`buildServiceWorker`)·등록·푸시 구독·설치·오프라인 훅·알림 목록 UI(`@ssccops/pwa/ui`) — ADR-0045 · #604. Workbox·next-pwa 없음 | [packages/pwa/README.md](packages/pwa/README.md) |

> 위의 `nextjs-agent-rules` 블록은 `next dev`가 스스로 써넣는다. 지우면 uncommitted 변경으로
> 되살아나므로 **그대로 두고 그 바깥에** 쓴다. 개인 로컬 메모(포트·`.env.local`·증상별 원인
> 판별 등)는 git에 올리지 않는 `CLAUDE.local.md`에 둔다 — 이 파일은 팀이 공유하는 규약만 담는다.

**커밋하지 않는 작업 파일은 `private-workspace/`에 둔다** — 화면정의서·시안 원본, 공유 전
초안, 개인 스크립트 같은 것들이다. `.gitignore`의 `### Private files & Artifacts ###` 절이
디렉터리째 막고 있으며, 이름과 위치는 `ssccops`·`ssccops-server`와 같다. 저장소를 오가며
"여기선 어디였더라"를 기억할 일이 없어야 한다.

`CLAUDE.local.md`와 나누는 기준은 단순하다 — **읽는 메모는 `CLAUDE.local.md`, 파일은
`private-workspace/`.**

## 검증 — CI와 같은 순서로 돌린다

```bash
pnpm install --frozen-lockfile
pnpm exec next typegen     # ← 빠뜨리기 쉬운 단계
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

- **`pnpm lint`만 돌리면 타입 오류를 CI에서 처음 만난다.** ESLint는 타입 검사를 하지 않는다.
- `next typegen`이 먼저인 이유: `PageProps`·`LayoutProps` 같은 전역 타입은 Next가 `.next/types`
  아래에 생성하고 `next-env.d.ts`가 그것을 참조한다. 새로 체크아웃한 트리에는 `.next`가 없어
  `tsc`가 `Cannot find name 'PageProps'`로 죽는다(`integrate.yml`의 lint job과 같은 순서다).
- **테스트 러너는 아직 없다.** CI의 test job은 `src` 아래에 `*.test.*`·`*.spec.*`가 있을 때만
  돈다. 테스트를 처음 추가하는 사람이 러너와 `test:coverage` 스크립트를 함께 붙인다.
- **SonarQube Analyze job의 상태가 곧 Quality Gate 결과다**(#516 · ssccops#377). 게이트
  ERROR면 `sonar-report.sh`가 1로 끝나 job이 빨갛고, 깨뜨린 조건마다 `::error` 주석이 실행
  화면 Annotations에 뜬다. 그전(ssccops#231)에는 게이트가 무엇이든 초록이었다 — 결과가 요약·
  로그에만 있어 열어 보기 전에는 아무도 몰랐다. **분석이 PR에서 돌지 않으므로 이 실패가 막는
  머지는 없다**(ADR-0018 그대로 · build와 별도 job) — develop 커밋의 상태가 사실을 말할 뿐이며
  게이트 조건·임계값은 여전히 ssccops#235의 문제다. 토큰이 없으면 `sonar-preflight` job이
  판정해 Analyze를 **통째로 건너뛴다(회색)** — `secrets`는 job `if`에서 못 읽어 앞 job의
  output으로 넘긴다. 예전엔 step마다 가드가 붙어 step은 건너뛰고 job은 초록이었다. 세 상태
  (통과·실패·건너뜀)가 세 색이어야 한다.
  - 설정은 **저장소 루트의 `sonar-project.properties`**에 있고 워크플로에는 토큰·호스트만
    남는다. 프로젝트 키를 `vars.SONAR_PROJECT`로 받던 때가 있었는데 **그 변수가 등록된 적이
    없어 빈 키로 돌 뻔했다**(없으면 실패하지 않고 조용히 빈다).
  - **`sonar.sources`에 앱을 나열하지 않는다.** 루트(`.`) 전체를 대상으로 두고 제외 목록만
    관리한다 — 나열하던 시절 `apps/lms`가 통째로 빠져 있었다(ssccops#190). 검증 명령을 전부
    루트 turbo로 도는 것과 같은 이유다.
  - **`develop` 푸시에서만 돈다**(ssccops#238). 이 서버는 SonarQube **Community Build**이고
    브랜치 플러그인이 없어(ssccops#234) 스캐너가 `sonar.branch.name`을 선언하지 못한다 —
    선언하면 업그레이드하라는 오류로 분석이 죽는다. 그래서 **모든 분석이 프로젝트 기본
    브랜치 한 자리를 덮어쓴다.** PR마다 돌리면 그 자리가 PR 내용으로 바뀌어 "지금 develop이
    어떤 상태인가"를 아무도 알 수 없고, 그러면 게이트를 잠글 기준을 만들 수 없다.
  - **같은 이유로 리포트 질의에 `branch` 파라미터를 넣지 않는다.** 제출할 때 브랜치를 밝히지
    않았으므로 조회에서 무엇을 하든 같은 데이터를 되읽으며, `&branch=`는 **없는 브랜치를
    묻는 것**이라 빈 응답이 온다. 리포트가 "조회 실패"·"없음"·실제 값 셋을 구별하는 것은
    그 종류의 오류가 조용히 0%로 보고된 이력 때문이다(ssccops-web#306).
  - **리포트는 job 요약과 job 로그(stdout) 양쪽에 남는다.** job 요약은 UI에서만 보이고
    Actions API로는 읽히지 않아, 로그에 없으면 기준선 숫자를 사람이 브라우저를 열어 옮겨
    적기 전에는 아무도(자동화 포함) 볼 수 없다. 규칙별 상위 15개도 같은 자리에 함께 찍는데
    **그 표가 검증 수단이다** — `java:` 규칙이 섞여 나오면 프로젝트 필터가 또 빠진 것이고,
    server 쪽 결함(`projectKeys`)이 드러난 방식이 정확히 이것이었다.
- Prettier 단계는 없다(의존성도 설정 파일도 없다 — 도입하려면 둘을 먼저 추가하고 워크플로에
  단계를 되살린다).

## 아키텍처 — FSD

```
app → views → features → entities → shared     (단방향)
```

- 같은 레이어의 슬라이스끼리 참조하지 않는다. 여러 엔티티를 함께 바꾸는 로직은 `features`에 둔다.
- `views`가 FSD의 pages 레이어다(Next.js 예약어 충돌 회피). widgets 레이어는 생략했다.
- `app/`은 라우팅 전용 — 각 `page.tsx`는 `views`를 얇게 감싼다. 라우트 그룹·공개 경로는 앱마다
  다르다(각 앱 `AGENTS.md`). 세 앱 모두 `version/`(배포 이력 확인용 `GET /version`)과
  `auth/`(OAuth 콜백)를 가진다.
- 슬라이스 내부: `entities/<slice>/{api,model}` · `features/<slice>/{model,ui}` · `views/<slice>/ui`.
- 화면 경로를 문자열로 적지 않고 `shared/config/routes.ts`의 `ROUTES`를 쓴다.
- **FSD 레이어는 앱마다 갖는다** — 앱끼리 소스를 공유하지 않는다. 둘 이상이 같은 것을 쓰게 되면
  `packages/`로 올린다(«둘 이상» 규칙 — `packages/ui/AGENTS.md`). 사본을 두면 갈린 것을 타입도
  린트도 못 잡는다.

## 서버 연동 규약

- 모든 응답은 `{ success, code, message, data }` 봉투다. `apiFetch`가 벗겨 `data`만 돌려주고,
  실패는 전부 `ApiError`(`code` + `status`)로 통일된다. **호출부는 `message`가 아니라 `code`로
  분기한다** — 문구는 서버에서 바뀌지만 코드는 계약이다.
- 커서 페이징 목록은 `page` 봉투가 함께 오므로 `apiFetchList`(배열 + `page`)를 쓴다(admin·lms).
  페이지 번호는 없고 `nextCursor`·`hasNext`로 이어 받는다 — 페이지네이터를 그리지 않고 «더 보기».
  파일 업로드는 admin `apiUpload`, 이미지·인증사진은 presigned PUT.
- **401·403의 처리는 앱마다 다르다.** admin의 `apiFetch`만 401(재로그인)·403 `SIGNUP_REQUIRED`
  (가입 화면)의 리다이렉트까지 끝낸다. www·lms는 밀어낼 로그인 화면이 없어 오류로 올려 보내고
  화면이 안내로 그린다 — 미가입은 같은 자리에서 가입 폼을 연다(www #451 · lms #453). 남은
  403은 어느 앱이든 화면이 문구로 안내한다.
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
| 코드값 | **코드로 비교한다** — 한글 표시 문자열 비교 금지 (`@ssccops/codes` + 앱 `shared/config/codes.ts`) |
| 날짜·일시 | 일자 `YYYY-MM-DD` · 일시 ISO-8601 |
| 불리언 | `*Yn` 접미사 |

D-day·마감 임박·진행률은 **저장하지 않고 파생한다**. 서버 데이터의 기준일은 `@ssccops/date`의
`todayInSeoul()`이다 — PoC 시절의 고정 기준일을 쓰면 이미 지난 마감이 미래로 보인다.

## 인증 — 세 앱이 같은 것과 다른 것

- 세션 갱신 코드는 `@ssccops/auth`(ssccops-web#329) 한 벌이고 각 앱 `src/middleware.ts`가 부른다.
  Next 16의 컨벤션은 `proxy.ts`지만 `@opennextjs/cloudflare`가 아직 인식하지 못해 빌드가 깨진다 —
  **함부로 옮기지 말 것**(admin이 한 번 옮겼다 되돌렸다). 매처는 좁게 잡는다(요청마다 Supabase
  왕복이 붙는다).
- **`updateSession`은 기본이 갱신기다.** 미인증을 로그인으로 밀어내는 `SessionGuard`를 주는 앱은
  **admin 하나**이고, www·lms는 로그인이 지금 보고 있는 화면 위에서 시작한다. 공개 경로 목록
  (`PUBLIC_PATHS`)은 admin의 값이지 공유 규칙이 아니다 — 자세한 것은 `packages/auth/AGENTS.md`.

| | admin | www | lms |
|---|---|---|---|
| 미들웨어 | 가드 + 갱신, 정적 자산만 제외 | 갱신만, 세 경로만 매치 | 갱신만, 정적 자산만 제외 |
| 401·403 | `apiFetch`가 리다이렉트 | 오류 → 화면 안내 | 오류 → 화면 안내 |
| 미가입 | `/signup` 화면 | 같은 자리 `SignupStep` | 같은 자리 `SignupRequiredNotice` |
| 권한 | `useCan(CAPABILITY.X)` — 서버 `capabilities` 배열만 본다 | 회원 여부만 | 스터디장 여부(서버 `mine=leader`) |

권한 판정 규칙(역할 서열·묶음 코드·조회/쓰기 분리·승인 자격)은 `apps/admin/AGENTS.md`에 있다.

## 화면 문구 (#117 · ssccops#356)

화면에 노출되는 문구는 운영진이 읽는 1차 문서다. 2026-09-17 운영진이 «문구가 AI스럽다»고 했고,
실측하니(ssccops#356) 어휘가 아니라 **틀**이 문제였다 — 오류 343건이 같은 «원인 — 행동» 공식이고,
안내 208건이 정책의 이유를 두 문장으로 강의하고 있었다. 그 틀은 이 절의 옛 규칙(«오류는 원인 +
다음 행동, 부연은 대시로»)이 만든 것이라 규칙부터 고쳤다. 말투의 기준은 사람이 보낸 공지 쪽이다
(레포 밖 `document/copy-voice-profile.md`) — 짧게 끊고, 사실만, 이유는 뒤에 한 번.

**자리마다 모양이 다르다.**

| 자리 | 모양 | 예 |
|---|---|---|
| 오류 토스트 · 오류 매핑(`*-error.ts`) | **한 줄.** «무엇이 안 되나 — 무엇을 하면 되나». 이유 없음 | `업무가 없습니다 — 목록을 새로고침해주세요` |
| 권한 오류 | `X할 권한이 없습니다 — 권한명(CODE) 권한이 필요합니다` | `업무를 등록할 권한이 없습니다 — 업무 관리(WORK_MANAGE) 권한이 필요합니다` |
| 빈 상태(`EmptyState`) | 사실 한 줄 + (있으면) 다음 행동. 부연 없음 | `없는 업무입니다. 목록으로 돌아가주세요.` / `아직 회의가 없습니다.` |
| 안내 문단 · 헬퍼 · 툴팁 | **문장으로.** 대시 없음, 2~3문장, 한 문장에 한 가지. 이유는 뒤에 짧게 또는 `title`로 | `내가 담당인 것만 보입니다. 등록만 한 건은 빠집니다.` |
| PageHeader 부제 | 한 구. «A · B · C» 3항 나열 금지 | `승인을 기다리는 하위 업무` |
| placeholder · 라벨 | 명사문. 필수는 `(필수)` | `반려 사유(필수)` |

**쓰지 않는 것.**

- **화면이 원인을 추측하지 않는다** — «이미 삭제됐을 수 있습니다» «그 사이 상태가 바뀌었을 수
  있으니» 같은 «~일 수 있습니다». 화면이 아는 것은 «없다»와 «지금은 안 된다»뿐이다. 추측 절은
  지우고 사실 + 행동만 남긴다.
- **서버 사정을 말하지 않는다** — «서버가 결과를 돌려주지 않았습니다» «서버 기준 코드와
  다릅니다». 사용자가 할 수 있는 일은 새로고침 하나라 그 말만 한다: `저장됐습니다 — 새로고침하면
  반영됩니다` · `선택지가 바뀌었습니다 — 새로고침해주세요`.
- **정책의 이유를 강의하지 않는다** — «정족수는 승인자를 대체하지 않습니다. 찬성이 모여도 최종
  승인은 승인자가 합니다.»는 «완료 승인은 승인자가 합니다.» 한 문장이다. 이유가 꼭 필요하면
  `title`(마우스를 올리면)이나 안내서로 보낸다. 화면은 «무엇이 되나/안 되나 + 무엇을 하면 되나».
- **개발 용어를 쓰지 않는다** — 테이블·컬럼명(`sub_work`·`mtg_dtl`), env 이름, «전이»·«실행 단위»·
  «보유»·«확장 속성», `@RequireAuthority`·PK·API·인가·도메인. 뜻은 유지하되 사용자의 말로.
- **사물을 움직이지 않는다** — «놓입니다·넘어갑니다·붙습니다·건넵니다·나눕니다·살아 있습니다».
  «표시됩니다·있습니다·됩니다·합니다»로. 사람이 주어면 «합니다»(«착수는 담당자가 합니다»).
- **«할 수 있습니다»는 권한·상태 안내에만** — 기능 설명에는 동사 직접(«체크·해제만 됩니다»,
  «비우면 본인이 담당자가 됩니다»).
- **같은 상황에 다른 문장을 만들지 않는다** — 404는 `X가 없습니다 — 목록을 새로고침해주세요`,
  재시도는 «새로고침해주세요»(«다시 불러와주세요»·«다시 불러옵니다» 아님), 네트워크·5xx만
  «잠시 후 다시 시도해주세요». 한 입력의 placeholder·검증·오류가 어미만 다른 세 문장이 되지
  않게 — placeholder 하나, 나머지는 같은 문구.
- **요구 권한은 이름으로 밝히고 역할 서열로 설명하지 않는다** — «운영진 권한이 필요합니다»·
  «회장·부회장·총무만»은 막힌 사람도 권한을 주려는 사람도 무엇이 필요한지 모른다. 화면과 오류
  매핑이 같은 권한을 다른 이름으로 부르지 않게(«업무 관리(WORK_MANAGE) 권한» 한 가지).

**표기.**

- **존댓말·평서형**, 느낌표와 이모지는 쓰지 않는다. 오류·토스트는 -습니다 고정. 안내 문단은
  «~됩니다/~입니다/명사문»을 섞어도 된다 — 어미 하나로 여섯 문장이 이어지면 기계가 읽는 소리가
  난다.
- **마침표**: 대시로 행동을 잇는 한 줄은 찍지 않고, 문장으로 쓴 안내는 찍는다. 제목(`title`·
  `EmptyState` 첫 줄)은 어느 쪽이든 찍지 않는다(#343).
- **보조용언은 붙여 쓴다** — `시도해주세요`·`로그인해주세요`(`시도해 주세요` 아님). 둘 다 맞지만
  한쪽으로 못 박은 것이다(#343 · #492에서 42건 치환).
- 버튼·칩·표 헤더는 좁은 화면(375px)에서 깨지므로 길이를 늘리지 않는다. 문구를 고칠 때도
  **원문보다 길어지지 않게**.
- **코드 표시명은 문구가 아니라 계약이다** — 서버 시드(`V3__seed_reference_data.sql`)와 글자까지
  맞춰져 있어 여기서 다듬으면 화면이 조용히 빈 라벨로 깨진다(`packages/codes/AGENTS.md`).
  `FIELD_LABEL`의 데이터사전 표기(`유형_명`)도 같다 — 폼 라벨에서만 쓰고 오류 문장에 끌어오지
  않는다(«업무_ID를 돌려주지 않았습니다» 같은 자리가 그렇게 생겼다).
- 서버가 내려주는 문구(권한명·경고)는 서버 소관이라 화면에서 고치지 않는다.

## 결정 기록 (ADR)

되돌리기 어려운 결정 — 여러 컴포넌트에 걸치거나 운영·보안에 영향을 주는 것 — 은 기획 저장소의
**[`ssccops/docs/decisions/`](https://github.com/SoongSilComputingClub/ssccops/tree/main/docs/decisions)**
에 한 장씩 남긴다. 목차와 쓰는 법은 그 저장소의 `AGENTS.md`에 있다.

**논의는 `[DECISION]` 이슈에서, 확정은 ADR 파일로.** 이슈는 ADR 링크 없이 닫지 않는다.

이 저장소의 판단 중 ADR로 올라갈 것과 여기 남을 것을 가른다 — **ADR은 '왜', 코드 주석은
'어떻게'**다. 주석에서 ADR을 가리키면(`ADR-0003 참고`) 둘이 갈라지지 않는다. 아래 절들은
여전히 이 저장소의 규칙이며 ADR로 옮기지 않는다.

## 배포 — dev는 컨테이너, prod는 Vercel ([ADR-0030](https://github.com/SoongSilComputingClub/ssccops/blob/develop/docs/decisions/0030-prod-web-on-vercel-hobby-dev-on-cloudflare-free.md) · dev 절반은 [ADR-0051](https://github.com/SoongSilComputingClub/ssccops/blob/develop/docs/decisions/0051-dev-web-moves-to-coolify-containers.md)이 대체)

| | dev | prod |
|---|---|---|
| 플랫폼 | **동아리방 Coolify 컨테이너**(GHCR 이미지 · 루트 `Dockerfile`) | Vercel Hobby |
| 브랜치 | `develop` 푸시 → CI → **`deploy-dev.yml`이 앱마다 이미지를 빌드해 GHCR에 올리고 Coolify 배포 웹훅을 부른다**(ADR-0050) — Coolify는 받아 띄우기만 한다 | `main` 푸시 → Production. **Production Branch를 `main`으로 명시**했다 — 레포 기본 브랜치가 `develop`이라 기본값이 틀리고, 실제로 develop이 prod로 나간 뒤 잡았다 |
| 빌드 변수 | **GitHub Environment `dev`의 Variables가 정본**(`NEXT_PUBLIC_*`는 이미지에 굳는다) — 값을 바꾸면 Coolify Redeploy가 아니라 **Deploy Dev를 다시 돌린다** | 프로젝트 Environment Variables(Production). **두 곳을 같이 고친다** — 릴리스 «배포 시 주의»에 대조 항목 |
| 도메인 | `dev.{admin,www,lms}.sscc-ssu.com` — Cloudflare 시절 주소를 그대로 옮겼다(ADR-0051) | 각 Vercel 프로젝트 |
| 리전 | 동아리방(서울) | 서울. 미들웨어가 Supabase·API를 왕복하므로 기본값(미국)이면 요청마다 두 번 건넌다 |
| 로그 | Coolify Runtime Logs | Vercel 런타임 로그 **1시간** 보존 — 장애는 그 안에 본다 |

**dev가 Cloudflare Workers였던 동안의 제약은 사라졌다** — 요청당 CPU 10ms 한도(`1102`)와 R2 캐시 부재가 그것이며, 그것을 감수하기로 한 것이 ADR-0030이었다. prod를 Vercel로 옮긴 판단(2026-09-13 실측 — 무료 Workers에서 성공 요청 CPU P50 20ms·콜드 스타트 200~600ms·prod에서 1102)은 **그대로 유효하다.** 옛 dev 워커 셋은 Git 연결을 끊고 남겨 두었다(ADR-0051 · 롤백용).

**그래도 코드는 플랫폼에 중립이어야 한다** — Vercel에만 있는 기능을 쓰면 dev에서 못 보는 버그가 생기고, **prod 롤백용 워커가 여전히 `main`에서 OpenNext로 빌드된다**(ADR-0051 «뒤집는다면»). 즉 아래 규칙이 완화된 것이 아니다:

- ISR(`revalidate`)·`use cache`·PPR **금지** — 롤백 경로인 Workers에 R2 캐시가 없어 매번 렌더하고, 지금 구조(정적 셸 + 브라우저 fetch)가 세 플랫폼에서 같은 뜻이다.
- `middleware.ts`를 `proxy.ts`로 바꾸지 않는다(«인증 · 권한» 절).
- `next/image` 최적화에 기대지 않는다 — `<img>` + 직접 URL.
- 미들웨어에 Node 전용 API를 쓰지 않는다(Workers 런타임에 없다).
- OpenNext 파일(`wrangler.jsonc`·`open-next.config.ts`)은 **롤백용 워커가 읽으므로** 지우지 않는다(ADR-0051 — dev가 컨테이너로 옮긴 뒤에도 그렇다). Vercel·컨테이너 빌드는 `next build`만 돌리므로 있어도 무방하다.
- **컨테이너로도 띄울 수 있다 — 루트 `Dockerfile` 하나**(#653 · ssccops#471). `--build-arg APP=admin|www|lms`로 어느 앱을 만들지 고르고 `output: "standalone"` 산출물만 담는다(이미지 180 MB대 · 런타임 메모리 60 MB대 실측). **이것이 지금 dev의 배포 산출물이다**(`SSCCOps / dev`의 admin·www·lms · ADR-0051 — 처음에는 `test.*` 시험 환경용이었다) 그리고 **Cloudflare·Vercel은 이 파일을 읽지 않는다** — prod는 ADR-0030 그대로다. 이미지는 **`deploy-dev.yml`이 Actions에서 앱마다 빌드해** GHCR(`ssccops-web-{app}` · 태그 `dev`·`sha-<7>`)에 올리고 Coolify는 받아 띄우기만 한다(#694 · ssccops#515). `NEXT_PUBLIC_*`는 이미지에 굳어 Coolify에 넣어도 효과가 없으므로 **정본은 GitHub Environment `dev`의 Variables**다 — 값을 바꾸면 Redeploy가 아니라 Deploy Dev를 다시 돌린다. 함정 둘: ① `initOpenNextCloudflareForDev()`는 가드가 `globalThis.AsyncLocalStorage` 하나뿐이라 **`next build`에서도 돌아** wrangler/workerd를 띄운다(alpine에서는 그 spawn이 빌드를 죽인다) — 그래서 `NODE_ENV === "development"`로 감쌌다. ② **turbo 2는 기본이 strict 환경 모드**라 `turbo.json`의 `build.env`에 없는 변수는 태스크에 닿지 않는다 — 커밋 sha를 넘기는 `SOURCE_COMMIT`을 그 목록에 함께 적어야 `/version`이 `unknown`이 되지 않는다.
- **라우트 핸들러에서 `new URL(request.url).origin`으로 자기 주소를 만들지 않는다 — `requestOrigin(request)`(`@ssccops/auth`)를 쓴다**(#696). Vercel·Cloudflare는 `request.url`에 공개 도메인을 넣지만 컨테이너의 standalone 서버는 **자기가 듣는 주소**(`HOSTNAME=0.0.0.0`·`PORT=3000`)로 만들고 스킴만 `x-forwarded-proto`를 따른다 — 그래서 세 앱의 로그인 콜백이 `https://0.0.0.0:3000/…`으로 튕겼고, OG 라우트는 폰트·마크를 받지 못해 **오류 없이** 기본 글꼴·글자 상자로 그렸다. 두 플랫폼에서는 재현되지 않아 컨테이너에 올리고서야 드러났다. 미들웨어 리다이렉트는 Next가 상대 경로로 바꿔 주므로 괜찮고, `searchParams`를 읽는 데는 `request.url`을 그대로 써도 된다 — 틀리는 것은 **오리진**뿐이다.
- **Cloudflare 워커 여섯을 롤백용으로 남겨 둔다** — prod 셋은 DNS 롤백용(ADR-0030), dev 셋은 Git 연결을 끊은 채(ADR-0051). 지우려면 그 ADR들의 «뒤집는다면»을 뒤집는 결정이 먼저이며, 판단 시점은 ADR-0030의 «한 달 뒤 재검토»(2026-10 중순)와 함께다(ssccops#517 ④).
- **배포 이력은 `deploy-history.yml`이 남긴다**(ssccops#340 · ssccops#344 · #442 · #445) — 릴리스 게시(prod)·`develop` 푸시(dev)마다 세 앱의 `GET /version`(`{version, sha, builtAt}` — `next.config.ts`가 빌드 때 인라인, `middleware.ts` 매처에서 제외)을 폴링해(상한 `VERIFY_TIMEOUT_SECONDS` **40분** · job `timeout-minutes` 50이 그보다 커야 한다 — #700 · server#583) **메타 레포(`ssccops`) orphan 브랜치 `deploy-history`**의 `web-prod.jsonl`·`web-dev.jsonl`에 한 줄 append([ADR-0033](https://github.com/SoongSilComputingClub/ssccops/blob/develop/docs/decisions/0033-deploy-history-in-meta-repo-via-app-token.md) — 서버는 같은 브랜치의 `server-*.jsonl`, 조회는 서버 레포 `scripts/deploy-history.sh current web prod`). 쓰기 토큰은 조직 GitHub App `sscc-devops`의 설치 토큰(`actions/create-github-app-token`, `repositories: ssccops`)이고 같은 토큰이 **private 메타 레포의 sub-issue Parent도 읽어** `parent_issue`·`adr_refs`가 직접 채워진다(PR 본문의 «근거» `ssccops#N`·`ADR-NNNN`은 fallback이자 `pr-guard.yml` 검사 대상으로 남는다). 이 레포에는 쓰지 않는다(`permissions.contents: read`). 도메인·앱 정보는 **조직 변수·시크릿**에서만 온다 — `SSCCOPS_DEPLOY_HISTORY_APP_ID` · `SSCCOPS_DEPLOY_HISTORY_APP_KEY` · `SSCCOPS_DEPLOY_HISTORY_ENV`(.env 모양 여러 줄, 이 레포는 `WEB_{DEV,PROD}_{ADMIN,WWW,LMS}_URL` 여섯 개만 읽는다). URL이 없으면 그 앱은 `unverified`, 앱 변수·시크릿이 없으면 워크플로가 실패한다(자기 레포에 쓰는 fallback을 두면 «두 곳» 상태로 돌아간다). **창이 10분이던 동안 dev가 «실제로 떴는데 `unverified`»였다**(#700) — 컨테이너 전환 뒤 푸시부터 세 앱이 새 sha를 내기까지 실측 9분 34초에 여유가 1분뿐이었고 두 번은 넘겼다. 갈리는 것은 Coolify pull·기동(3~6분)이며 **`unverified`가 늘면 이 값이 아니라 실제 배포 소요부터 다시 잰다.**

## 함정

- **공유 패키지를 새로 만들면 세 앱의 `globals.css`에 `@source`를 더한다.** Tailwind v4는
  선언된 경로만 훑어 클래스를 만들고, **없는 클래스는 조용히 건너뛴다** — 타입·린트·빌드가
  전부 통과하는데 화면만 무너진다. `packages/ui`를 만들면서(#243) 이 줄을 빠뜨려 카드 여백·
  배지·마크다운 리듬이 세 앱에서 사라진 적이 있다(#316). `packages/form-renderer` 선례가 바로
  옆에 있었는데도 놓쳤다. **패키지가 스스로 선언할 방법은 없다** — `@source`는 CSS 안에서만
  해석되는데 패키지는 CSS를 내보내지 않고, 내보내게 바꿔도 앱이 `@import` 한 줄을 적어야 하는
  것은 같아서 잊을 위험이 줄지 않는다.
- **공유 패키지에만 있는 클래스는 admin에서 우연히 살아남는다.** admin(450파일)은 같은 클래스를
  앱 어딘가에서 또 쓰는 일이 많아 덜 깨져 보인다. **admin이 멀쩡한 것은 근거가 되지 않는다** —
  확인은 앱이 작은 www·lms에서 한다.
- **`CLAUDE.md`와 `AGENTS.md`의 자동 생성 블록은 `next dev`가 다시 써넣는다.** diff에서 지워도
  되살아나므로 그대로 두고 커밋한다.
- **서버 표준코드가 바뀌면 `@ssccops/codes`와 각 앱 `shared/config/codes.ts`를 함께 본다** —
  표시명은 서버 시드와 글자까지 계약이다(`packages/codes/AGENTS.md`).
- **`.env*`는 통째로 ignore되고 `.env.example`만 예외다.** `NEXT_PUBLIC_*`은 빌드 타임에
  인라인되므로 **값을 바꾸면 `pnpm dev`를 재시작해야** 반영된다.
- **측정은 Vercel에서만 실린다**(#600 · ssccops#443 → #705 · ssccops#524). `@vercel/analytics`(쿠키 없는 방문 통계 · Hobby 월 5만 이벤트)와 **`@vercel/speed-insights`(실사용자 Web Vitals · 30일 1만 이벤트를 프로젝트들이 나눈다)를 이제 세 앱 모두** 싣는다 — 루트 레이아웃(서버 컴포넌트)이 `ON_VERCEL`(`shared/lib/vercel.ts` = `process.env.VERCEL === "1"`)로 가른다. dev(Coolify 컨테이너 · ADR-0051)에는 `/_vercel/insights`·`/_vercel/speed-insights` 경로가 없어 404 소음이고, `VERCEL`은 `NEXT_PUBLIC_`이 아니라 브라우저 번들엔 없으니 판정은 서버에서만 된다 — **측정은 prod에서만 모인다.** **Speed Insights를 www에만 두지 않은 이유**: 아껴서 빼 두면 어드민이 성능 신호 없이 남고(운영진이 매일 쓰는 앱이고 목록·표가 가장 무거운데 느려지는 것을 알아차릴 방법이 없다), 무엇이 얼마나 먹는지는 켜 봐야 안다. **할당을 넘기면 만지는 순서는 ① 무거운 페이지에서 빼기 ② `sampleRate` 낮추기**다 — 표본율을 먼저 내리면 30일 창은 그대로인데 데이터만 얇아져 «어디가 문제인가»를 답할 수 없다. 페이지별로 빼려면 그 라우트 그룹 레이아웃으로 마운트를 내린다(장치를 미리 만들어 두지 않았다 — 뺄 페이지가 정해지면 그때다). 대시보드 «Enable»은 사람이 켠다(**세 앱 Analytics · 세 앱 Speed Insights**). www `/privacy` «6. 쿠키»가 이 통계를 말한다. **Lighthouse는 `.github/workflows/lighthouse.yml`** — 매일 04:30 KST + 수동, **dev www 6경로 · lms 홈 · admin 공개 2경로(`/login`·`/offline`)**, `treosh/lighthouse-ci-action` 리포트만(게이트 아님 · 기준선은 ssccops#443). **어드민·LMS의 로그인 뒤 화면은 재지 않는다** — 워크플로에 세션을 넣으면 토큰 보관·회전이 붙고 그 값이 Actions 로그로 새는 경로가 생긴다. 내부 화면 성능은 Speed Insights가 답한다.
- **`NEXT_PUBLIC_DEPLOY_ENV`는 dev 이미지를 만드는 `deploy-dev.yml`이 `dev`로 못 박는다**(#413 · ADR-0051 — Cloudflare 빌드 변수였던 자리다). 없으면
  prod — 잊으면 dev가 prod 아이콘·제목으로 보일 뿐 반대는 없다. 판정(`deployMarks`)은
  `@ssccops/ui`에 있지만 **`process.env.NEXT_PUBLIC_DEPLOY_ENV`는 각 앱 `layout.tsx`·`manifest.ts`가
  글자 그대로 읽어 넘긴다** — 패키지 안에서 읽으면 인라인을 못 받아 빈 값이 된다. 아이콘
  파일은 `pnpm icons`(`scripts/icons/generate-icons.py`)의 산출물이라 손으로 고치지 않는다.
- **서버와 버전을 맞춰 띄워야 채워지는 화면이 있다.** 서버가 옛 버전이면 나중에 추가된 응답
  필드만 조용히 빈다. 값 하나가 안 보이면 서버 브랜치를 먼저 확인할 것.

## 커밋 · 브랜치 · PR

`.github/workflows/`가 강제하는 것과 사람이 지켜야 하는 규칙이 나뉜다.

- **base 브랜치는 `develop`이다** — `main`은 릴리스 전용이고 직접 커밋하지 않는다.
  **서버 레포(`ssccops-server`)도 같다.** 두 저장소 모두 기본 브랜치가 `develop`이고,
  `main`으로 가는 것은 릴리스 PR뿐이다.
- 브랜치: 이슈를 열면 `issue-branch-creator.yml`이 제목 앞 태그(`[FEAT]`/`[FIX]`/`[REFACTOR]`/
  `[CHORE]`)를 읽어 **`{type}/#{이슈번호}`**로 만들어 준다(#561 · ssccops#419). **슬러그는 없다** —
  예전의 `-{영문 슬러그}`는 LibreTranslate 컨테이너가 한글 제목을 번역해 만들었는데 그 단계가
  워크플로의 병목이었고, 사람·스크립트가 로컬에서 먼저 딴 이름과 봇의 이름이 달라 원격 브랜치가
  둘이 되는 일이 되풀이됐다(2026-09-20 #547~#552 전부). 이름이 번호로 결정적이라 이제 누가 먼저
  만들든 같은 브랜치다. 옛 `{type}/#N-슬러그`는 pr-guard가 계속 받는다. 문서·테스트·CI 작업은
  `[CHORE]`로 연다 — **세부 종류를 라벨로 가르지 않는다**(#244, 아래). 직접 만들어야 한다면
  같은 형식을 따르며, **남의 작업 브랜치가 아니라 `develop`에서 딴다** — 서버 레포에서
  작업 중이던 다른 브랜치 위에서 갈라져 나온 PR이 문서 한 줄을 고치면서 남의 61개 파일을
  함께 머지한 적이 있다(`ssccops-server#235`).
- 커밋 메시지: 이슈가 있으면 `#{이슈번호} {type}({scope}): 설명`, 없으면 `{type}({scope}): 설명`.
  타입은 `feat`/`fix`/`refactor`/`design`/`style`/`docs`/`test`/`chore`/`init`/`rename`/
  `remove`/`cicd`. **커밋 타입과 이슈 유형은 다른 어휘다**(#244) — 커밋 타입은 위 열둘
  그대로이고, **이슈 유형은 `feat`·`fix`·`refactor`·`chore` 네 가지가 전부다**(아래).
  커밋에는 `docs(agents):`라고 적으면서 그 작업의 이슈는 `[CHORE]`인 것이 정상이다.
  **PR의 타입 라벨은 연결된 이슈의 라벨에서만 온다**(`pr-labeler.yml`) —
  커밋 표기는 라벨에 아무 영향을 주지 않으므로, 표기를 지키는 이유는 `git log`가 읽히기
  때문이다. 이슈를 연결하지 않은 PR에는 타입 라벨이 붙지 않는다.
  (`/commit-message` 스킬이 이 형식을 만들어 준다.)
- **이슈 유형은 `feat`·`fix`·`refactor`·`chore` 네 가지뿐이다**(#244). 이슈 템플릿이 주는 것이
  정본이며 라벨과 브랜치 접두어가 여기서 나온다. 문서·테스트·스타일·CI 작업의 이슈는 전부
  `[CHORE]`다 — `[DOCS]`·`[CICD]` 같은 옛 태그로 열어도 `issue-labeler`·`issue-branch-creator`가
  `chore`로 받는다. 예전에 쓰던 `docs`·`test`·`style`·`cicd`·`design`·`remove` 라벨은
  **저장소에서 지웠다**(남겨 두면 화면 목록에서 고를 수 있어 다시 붙는다). 넷으로 못 박는
  이유는 이 표가 `issue-labeler`·`issue-branch-creator`·`pr-labeler`·`pr-guard` 네 워크플로에
  흩어져 있어 한 곳만 고치면 갈라지기 때문이다.
- PR 제목은 `[#이슈번호] 총 작업 내용` — **Squash merge 시 그대로 커밋 제목이 되므로** 형식을
  지킨다. (`/create-pr` 스킬) **저장소 설정이 `squash_merge_commit_title = PR_TITLE`이라
  커밋이 하나뿐인 PR에서도 PR 제목이 이긴다**(#244) — 기본값(`COMMIT_OR_PR_TITLE`)이던 동안에는
  단일 커밋 PR에서 커밋 메시지가 제목이 되어, PR 제목을 통제해도 `git log`에는 다른 것이 박혔다.
  **`pr-guard.yml`이 제목·브랜치명·두 번호의 일치·그 이슈의 실재를 검사해 어기면 실패시킨다**(#244)
  — `develop → main` 릴리스 PR과 dependabot만 면제다.
- **릴리스에는 버전을 먼저 올린다**(ssccops#229). `develop`에 버전 커밋을 넣고 **그다음에**
  `develop → main` 릴리스 PR을 연다 — 릴리스 PR 안에서 올리면 두 브랜치가 같아진 뒤에도
  develop에 버전이 없는 순간이 생긴다. 고치는 파일은 **넷**이다: 루트 `package.json` +
  `apps/admin`·`apps/www`·`apps/lms`. **`packages/*`는 올리지 않는다** — workspace 내부
  의존이라 외부 배포를 하지 않고, 올리면 매 릴리스마다 고칠 파일만 늘고 그 숫자를 아무도
  보지 않는다. 그 뒤 태그(`v0.2.1`)와 GitHub 릴리스를 만든다.
  - **서버(`ssccops-server`)도 같은 시점에 같은 숫자로 오른다.** 두 레포가 함께 배포되므로
    한쪽만 올리면 "어느 쪽이 맞는 버전인가"가 갈린다.
  - 버전은 `next.config.ts`가 `package.json`에서 주입한다(어드민 사이드바 · 세 앱 `/version`) —
    **따로 넣을 것이 없다.**
  - `v0.1.0`·`v0.1.1`·`v0.2.0` 세 번은 **태그만 오르고 `package.json`은 `0.1.0`에 머물렀다.**
    이 절이 없어서 세 번을 놓쳤다.
- **머지 전략은 둘이다.** 기능·수정 PR은 **Squash and merge**로 develop에 한 커밋으로 들어가고,
  **`develop → main` 릴리스 PR은 일반 merge commit**이다 — 그쪽을 squash 하면 develop 전체가
  main에서 커밋 하나로 뭉개져 릴리스에 무엇이 들어갔는지 사라진다. 그래서 `allow_merge_commit`은
  켜 둔 것이며 끄지 말 것. `allow_rebase_merge`는 두 전략 어디에도 쓰이지 않아 껐다.
- `main`·`develop`으로 향하는 PR은 `integrate.yml`(Lint → Test → Analyze/Build)이 돌고,
  `pr-guard.yml`(컨벤션)과 `pr-labeler.yml`(크기·타입 라벨)이 함께 돈다.
  **`pr-approval-check.yml`은 없다** — 예전에 이 자리에 적혀 있었으나 `.github/workflows/`에
  그런 파일이 존재한 적이 없다(#244에서 확인). 리뷰 승인을 강제하려면 워크플로가 아니라
  브랜치 보호 규칙이 필요하다.
