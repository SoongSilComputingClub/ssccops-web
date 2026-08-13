# ssccops-web

SSCC(숭실대학교 컴퓨터 학술동아리) 운영관리 어드민 웹 — PoC.

Claude Design 산출물 `SSCC Admin Desktop v2`를 기반으로 구현한 Next.js 애플리케이션입니다.
현재 단계는 **API 미연동 PoC**로, 모든 데이터는 더미 JSON(`src/entities/*/api/*.json`)을
시드로 하는 클라이언트 상태(zustand)로 동작합니다. 새로고침 시 시드 상태로 초기화됩니다.

## 실행

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # 프로덕션 빌드
pnpm lint
```

## 기술 스택

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS v4 — 디자인 토큰은 `src/app/globals.css`의 `@theme`에 정의
- zustand — 엔티티별 스토어 (JSON 시드 + 클라이언트 뮤테이션)
- Pretendard Variable (CDN)

## 아키텍처 — FSD (Feature-Sliced Design)

[카카오페이 FSD 적용 방식](https://tech.kakaopay.com/post/fsd/)을 따릅니다.
widgets 레이어는 생략했고, FSD의 pages 레이어는 Next.js 예약 폴더와의 충돌을 피해
`views`로 명명했습니다.

```
src/
├─ app/        # Next.js 라우팅 전용 — 각 page.tsx는 views를 얇게 감쌈
├─ views/      # 화면 단위 조립 (화면 1개 = 슬라이스 1개)
├─ features/   # 동사형 기능 (승인 처리, 등급 변경, 폼 빌더, 공개 폼 제출 …)
├─ entities/   # 명사형 도메인 (member, work, sub-work, meeting, approval,
│              #  op-type, form, response, role, event, audit, session)
│              #  각 슬라이스 = model/(types, store) + api/(mock json)
└─ shared/     # ui 킷 · lib · config (토큰/상수/라우트)
```

의존 방향: `app → views → features → entities → shared` (단방향).
같은 레이어의 슬라이스끼리는 참조하지 않으며, 여러 엔티티를 함께 변경하는 로직
(예: 승인 시 승인함 + 하위 업무 + 감사 로그 동시 갱신)은 features에 둡니다.

## 화면

- **인증**: `/login`(Google OAuth) · `/signup` · `/signup/complete`
- **운영**: `/dashboard` · `/operations`(운영 통합) · `/operations/works[/:id]` ·
  `/operations/sub-works[/:id]` · `/operations/meetings[/:id]` · `/operations/new` ·
  `/operations/types` · `/approvals`
- **회원**: `/members[/:key]` · `/members/new` · `/members/:key/edit` ·
  `/members/roles` · `/members/role-labels` · `/members/csv-import`
- **폼**: `/forms[/:key]` · `/forms/new` · `/forms/:key/edit` ·
  `/forms/:key/responses[/:id]` · `/forms/labels`
- **공개 폼**(비회원): `/f/:slug` · `/f/:slug/done`
- **내 계정**: `/my`

## PoC 관례

- 기준일은 `TODAY = 2026-08-09`로 고정 (D-day·캘린더 시맨틱이 더미데이터와 결합)
- 로그인은 Supabase Auth(Google OAuth) 기반 실제 인증이며 `src/proxy.ts`가 미인증 사용자의
  관리자 라우트 접근을 막는다. 회원 도메인(`entities/member`)은 여전히 mock JSON + zustand라
  Supabase 사용자 ↔ 내부 Member 연결(`Member.authUserId`)은 브라우저에서 처리한다
  (`features/auth`) — 기존 시드 회원은 실제 로그인 대상이 아니고, 새로 Google로 가입한
  사용자만 연결된다
- CSV 이관 위저드는 시뮬레이션 (파싱 없이 고정 통계/결과)
- 데스크톱 전용 (`body { min-width: 1024px }`)
