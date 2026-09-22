# ssccops-web

[![Integrate](https://github.com/SoongSilComputingClub/ssccops-web/actions/workflows/integrate.yml/badge.svg?branch=develop)](https://github.com/SoongSilComputingClub/ssccops-web/actions/workflows/integrate.yml)

SSCC(숭실대학교 컴퓨팅 동아리) **운영 시스템의 웹**입니다. 동아리 운영에 필요한 일 — 업무·회의·결재,
회원과 권한, 폼과 응답, 학술 프로그램, 행사와 신청, 홍보 콘텐츠 — 을 세 개의 앱으로 나눠 다루고,
세 앱 모두 하나의 백엔드([`ssccops-server`](https://github.com/SoongSilComputingClub/ssccops-server))를
봅니다. 인증은 Supabase Auth(Google OAuth)입니다.

공개 사이트: **[www.sscc-ssu.com](https://www.sscc-ssu.com)** · 사용 설명서: [guide.sscc-ssu.com](https://guide.sscc-ssu.com)

## 구성

pnpm workspace + Turborepo 모노레포입니다. Next.js 16(App Router) · React 19 · TypeScript 5 ·
Tailwind CSS v4.

| 앱 | 무엇 | 로그인 | 개발 포트 |
|---|---|---|---|
| [`apps/admin`](apps/admin) | 운영진용 어드민 — 운영·회원·폼·학술·행사·콘텐츠·설정 | 필수 | 3000 |
| [`apps/www`](apps/www) | 공개 사이트 — 동아리 소개·행사·콘텐츠·공개 폼·내 활동 | 본체는 없음 | 3001 |
| [`apps/lms`](apps/lms) | 학술 앱 — 프로그램·회차·출석·기획안 | 필수 | 3002 |

두 앱 이상이 실제로 함께 쓰는 것만 `packages/*`로 올립니다.

| 패키지 | 무엇 |
|---|---|
| [`ui`](packages/ui) | 공용 표시 요소·테마·브랜드 마크 |
| [`auth`](packages/auth) | Supabase 클라이언트·세션 갱신·OAuth 목적지 |
| [`form-renderer`](packages/form-renderer) | 폼 문항 렌더링·응답 검증 |
| [`codes`](packages/codes) | 서버 표준코드와 표시명 |
| [`date`](packages/date) | 서버 일시 문자열 → 화면 표기 |
| [`share-meta`](packages/share-meta) | 공유 카드 문구·착지 앱 규칙 |
| [`content`](packages/content) | 콘텐츠 페이지 카탈로그 |
| [`pwa`](packages/pwa) | 서비스워커·푸시·설치·오프라인·알림 목록 |

## 빠른 시작

필요한 것: Node.js 20+ · pnpm 10 (`corepack enable`이면 버전은 자동)

```bash
pnpm install
cp apps/admin/.env.example apps/admin/.env.local   # www · lms 도 같은 방식으로
pnpm dev                                           # 세 앱을 함께 띄웁니다
```

앱 하나만: `pnpm --filter @ssccops/www dev`

백엔드가 함께 떠 있어야 화면에 데이터가 옵니다 —
[`ssccops-server`](https://github.com/SoongSilComputingClub/ssccops-server)의 빠른 시작을 먼저 보세요.

### 환경 변수

앱마다 `.env.local`을 둡니다. **정본은 `apps/*/.env.example`**이고(각 값의 함정까지 적혀 있습니다),
없으면 화면이 바로 막히는 것은 셋입니다.

| 이름 | 무엇 |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | 백엔드 주소. 비면 요청을 보내지 않고 즉시 실패합니다 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 — **세 앱이 같은 프로젝트**를 가리켜야 합니다 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 같은 프로젝트의 anon 키 |

`NEXT_PUBLIC_*`은 빌드 시점에 인라인됩니다 — 값을 바꾸면 개발 서버를 다시 띄우세요.

## 검사

```bash
pnpm typecheck
pnpm lint
pnpm build
```

PR마다 CI가 같은 셋과 테스트·Sonar를 돌립니다. 배포는 **prod = Vercel(`main`) ·
dev = Cloudflare Workers(OpenNext, `develop`)**이고, 두 플랫폼에서 같은 뜻이어야 하므로
ISR·`use cache`·이미지 최적화에 의존하지 않습니다.

## 기여

1. 이슈를 먼저 만듭니다(운영 요구는 비공개 메타 저장소에서 옵니다). 이슈를 열면 봇이
   `{type}/#N` 브랜치를 만듭니다 — `feat/#123` · `fix/#123` · `refactor/#123` · `chore/#123`
2. 커밋 첫 줄은 `#N type(scope): 무엇을`
3. PR 제목은 `[#N] 무엇을`, 본문에 `- 근거: ssccops#M` 한 줄이 있어야 통과합니다(`pr-guard`)
4. `develop`으로 **squash** 머지합니다. `main`은 릴리스 전용입니다

**개발 규칙의 정본은 [`AGENTS.md`](AGENTS.md)**이고 앱·패키지마다 자기 `AGENTS.md`가 있습니다 —
화면 문구, 폴더 구조(FSD), 상태·데이터 계약, 접근성, 배포 제약이 그쪽에 있습니다. README는
그것을 옮겨 적지 않습니다.
