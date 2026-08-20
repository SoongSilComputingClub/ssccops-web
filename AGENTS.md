<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

SSCC(숭실컴퓨팅클럽) 운영관리 어드민 웹 — Next.js 16 App Router / React 19 / TypeScript 5 / Tailwind v4 / pnpm.
백엔드는 별도 저장소 **`ssccops-server`**(Spring Boot), 인증은 Supabase Auth(Google OAuth),
배포는 Cloudflare Workers(OpenNext).

> 위의 `nextjs-agent-rules` 블록은 `next dev`가 스스로 써넣는다. 지우면 uncommitted 변경으로
> 되살아나므로 **그대로 두고 그 바깥에** 쓴다. 개인 로컬 메모(포트·`.env.local`·증상별 원인
> 판별 등)는 git에 올리지 않는 `CLAUDE.local.md`에 둔다 — 이 파일은 팀이 공유하는 규약만 담는다.

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
- **`.env*`는 통째로 ignore되고 `.env.example`만 예외다.** `NEXT_PUBLIC_*`은 빌드 타임에
  인라인되므로 **값을 바꾸면 `pnpm dev`를 재시작해야** 반영된다.
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
