# ssccops-web

SSCC(숭실대학교 컴퓨터 학술동아리) 운영관리 어드민 웹 — PoC.

Claude Design 산출물 `SSCC Admin Desktop v2`를 기반으로 구현한 Next.js 애플리케이션입니다.
현재 단계는 **API 미연동 PoC**로, 모든 데이터는 더미 JSON(`src/entities/*/api/*.json`)을
시드로 하는 클라이언트 상태(zustand)로 동작합니다. 새로고침 시 시드 상태로 초기화됩니다.

## 구조 · 실행

pnpm workspace + Turborepo 모노레포입니다. 어드민 앱은 `apps/admin`에 있고,
`packages/*`는 공유 패키지 자리입니다(후속 이슈에서 추가 예정).

```bash
pnpm install    # 워크스페이스 루트에서
pnpm dev        # turbo run dev — http://localhost:3000
pnpm build      # turbo run build (프로덕션 빌드)
pnpm lint
pnpm typecheck
```

## 기술 스택

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS v4 — 디자인 토큰은 `src/app/globals.css`의 `@theme`에 정의
- zustand — 엔티티별 스토어 (JSON 시드 + 클라이언트 뮤테이션)
- Pretendard Variable (CDN)

## 데이터 모델 — 데이터사전 기준

타입·목 JSON·필드명은 모두 `private-workspace/데이터사전+테이블컬럼정의서.xlsx`를 따릅니다.

| 항목 | 규칙 |
| --- | --- |
| 필드 표기 | DB 컬럼ID의 lowerCamelCase (`mbr_id` → `mbrId`, `stdnt_no` → `stdntNo`) |
| 타입명 | 테이블ID의 PascalCase (`mbr` → `Mbr`, `sub_work_aprv` → `SubWorkAprv`) |
| 식별자 | 식별자N19(BIGINT) → `number` 단일 PK. URL도 숫자 (`/members/1`) |
| 코드값 | 코드값 저장 + 코드테이블 조회. 한글 표시문자열을 직접 비교하지 않습니다 |
| 날짜/시간 | 일자D → `YYYY-MM-DD` · 일시TS → ISO-8601 `YYYY-MM-DDTHH:mm:ss` |
| 불리언 | `*Yn` 접미사 + `boolean` |
| 응답 봉투 | `{ success, code, message, data }` |

- 코드 사전: `src/shared/config/codes.ts` (코드 유니온 + 표시명 맵)
- 날짜 파생: `src/shared/lib/date.ts` (`ddayText` · `deadlineFlag` · `formatDt` …)
  — D-day·마감임박·진행률은 **저장하지 않고** `ddlnDt`·`dlyYn`·점검 목록에서 파생합니다
- 데이터사전과의 간극: `docs/db-gap.md`

## 아키텍처 — FSD (Feature-Sliced Design)

[카카오페이 FSD 적용 방식](https://tech.kakaopay.com/post/fsd/)을 따릅니다.
widgets 레이어는 생략했고, FSD의 pages 레이어는 Next.js 예약 폴더와의 충돌을 피해
`views`로 명명했습니다.

```
src/
├─ app/        # Next.js 라우팅 전용 — 각 page.tsx는 views를 얇게 감쌈
├─ views/      # 화면 단위 조립 (화면 1개 = 슬라이스 1개)
├─ features/   # 동사형 기능 (승인 처리, 등급/상태 변경, 폼 빌더, 공개 폼 제출 …)
├─ entities/   # 명사형 도메인 — 각 슬라이스 = model/(types, store) + api/(mock json)
└─ shared/     # ui 킷 · lib · config (토큰/코드/상수/라우트)
```

의존 방향: `app → views → features → entities → shared` (단방향).
같은 레이어의 슬라이스끼리는 참조하지 않으며, 여러 엔티티를 함께 변경하는 로직
(예: 승인 시 승인 건 + 하위 업무 + 상태 이력 동시 갱신)은 features에 둡니다.

### entities 슬라이스 ↔ 테이블

| 슬라이스 | 테이블 |
| --- | --- |
| `member` | `mbr` · `mbr_grd` · `mbr_stts` · `mbr_role_rel` · `mbr_grd_hstry` · `mbr_stts_hstry` |
| `role` | `role` · `role_clsf` |
| `oper` | `oper` — work · sub_work · mtg 의 **상위 테이블** |
| `work` | `work` |
| `sub-work` | `sub_work` · `sub_work_chck_list` · `sub_work_pic_altmnt` · `sub_work_stts_hstry` |
| `sub-work-type` | `sub_work_type` |
| `approval` | `sub_work_aprv` · `sub_work_aprv_vote` · `sub_work_rjct` |
| `meeting` | `mtg` · `mtg_dtl` |
| `form` | `form` · `form_lbl` · `form_lbl_rel` |
| `response` | `form_rspns_hstry` |
| `session` | (테이블 없음 — Supabase Auth 세션) |

제목·담당자·우선순위·기간·소프트삭제는 `oper`가 보유하므로, 업무·하위 업무·회의 화면은
`operId`로 `entities/oper`를 함께 조회합니다.

## 화면

- **인증**: `/login`(Google OAuth) · `/signup` · `/signup/complete`
- **운영**: `/dashboard` · `/operations`(운영 통합) · `/operations/works[/:workId]` ·
  `/operations/sub-works[/:subWorkId]` · `/operations/meetings[/:mtgId]` · `/operations/new` ·
  `/operations/types` · `/approvals`
- **회원**: `/members[/:mbrId]` · `/members/new` · `/members/:mbrId/edit` ·
  `/members/roles` · `/members/role-labels` · `/members/csv-import`
- **폼**: `/forms[/:formId]` · `/forms/new` · `/forms/:formId/edit` ·
  `/forms/:formId/responses[/:formRspnsId]` · `/forms/labels`
- **공개 폼**(비회원): `/f/:formId` · `/f/:formId/done`
- **내 계정**: `/my`

## PoC 관례

- 기준일은 `TODAY = 2026-08-09`로 고정 (D-day 시맨틱이 더미데이터와 결합)
- 로그인은 Supabase Auth(Google OAuth) 기반 실제 인증이며 `src/middleware.ts`가 미인증
  사용자의 관리자 라우트 접근을 막는다. 회원 도메인(`entities/member`)은 여전히 mock JSON +
  zustand라 Supabase 사용자 ↔ 내부 `mbr` 연결(`Mbr.authUserId`)은 브라우저에서 처리한다
  (`features/auth`) — 기존 시드 회원은 실제 로그인 대상이 아니고, 새로 Google로 가입한
  사용자만 연결된다
- CSV 이관 위저드는 시뮬레이션 (파싱 없이 고정 통계/결과)
- 데스크톱 전용 (`body { min-width: 1024px }`)
