# www 디자인 시스템 — 토큰 · 간격 · 칩 · 카드

공개 웹사이트(`apps/www`)가 화면을 그릴 때 따르는 규칙이다(#520 · ssccops#382). 공용 표시
요소는 `@ssccops/ui`에 있고 이 문서는 **그 위에서 www가 어떻게 쓰는가**만 적는다 — 값의
정본은 `src/app/globals.css`의 `@theme`이고, 여기 적은 숫자는 그 파일을 읽기 쉽게 옮긴 것이다.
둘이 갈리면 CSS가 맞다.

## 서체

- **Pretendard Variable** — `layout.tsx`가 jsdelivr의 dynamic subset CSS를 `<link>`로 건다.
  `next/font`를 쓰지 않는 것은 두 플랫폼(Vercel · Cloudflare)에서 같은 뜻이어야 해서다(ADR-0030).
- 본문 16px(`body`). 화면 제목 22px(`lg` 24px) `font-medium tracking-[-.3px]`, 카드 제목
  17px(`lg` 18px) `font-semibold`, 보조 13.5px `text-n500`.
- 마크다운 본문은 `@ssccops/ui` `Markdown`이 단계를 정한다 — `#`은 `<h2>` 20px, `##`은 `<h3>`
  18px, 문단 15px/1.75. 화면 제목(`<h1>`)은 본문 밖에 있으므로 본문의 `#`이 `<h1>`이 되지 않는다.

## 색 토큰 (Toss 라이트 테마 · 어드민·lms와 같은 값)

| 토큰 | 값 | 자리 |
|---|---|---|
| `bg` | `#f2f4f6` | 페이지 바탕 · 코드 블록 · 이미지 자리 |
| `surface` | `#ffffff` | 카드 · 상단 바 · 푸터 |
| `ink` | `#191f28` | 본문 글자 |
| `accent` · `accent-strong` · `accent-soft` | `#3182f6` · `#1b64da` · `#e8f2fe` | 링크 · 주 버튼 · 켜진 탭 |
| `n300` · `n400` · `n500` | `#4e5968` · `#6b7684` · `#8b95a1` | 보조 글자(진함 → 옅음) |
| `line` · `line-strong` | `#e5e8eb` · `#d1d6db` | 구분선 · 카드 링 · 칩 테두리 |
| `amber` · `amber-soft` | `#c2620a` · `#fff4e6` | 주의 배지 · 수정 요청 줄 |
| `danger` · `success` | `#f04452` · `#00b25f` | 오류 · 완료 |
| `hairline` · `hairline-strong` | `rgb(0 0 0 / .05)` · `rgb(0 0 0 / .08)` | 내 응답 목록 줄 사이 · 드로어 경계 |
| `scrim` | `rgb(0 0 0 / .45)` | 드로어 뒤 |
| `on-solid` | `#ffffff` | **진한 면(`bg-accent`) 위 글자** — `text-white`가 아니다 |

- 색은 **토큰 이름**으로 쓴다(`text-n500` · `var(--color-line)`). 값(`#e5e8eb`)을 박으면
  다크에서 그 자리만 밝게 남는다(`packages/ui/AGENTS.md`). 카드 링도
  `shadow-[0_0_0_1px_var(--color-line)]`처럼 변수로 적는다 — `#575`에서 값으로 박혀 있던 자리
  (이벤트 카드 · `/me` 카드 셋 · 폼 단계의 오류 상자·«이전» 버튼 · 저장 상태 바 · 드로어 스크림 ·
  처리 내역 타임라인)를 전부 토큰으로 바꿨다.
- `hairline`·`scrim`은 값에 알파가 들어 있어 `bg-scrim/50` 같은 알파 수정자는 쓸 수 없다.
- `--color-*: initial`로 **Tailwind 기본 팔레트를 지웠다.** `text-amber-800` 같은 이름은
  클래스가 생성되지 않아 색이 조용히 빠진다.
- 글자 대비: `n500`(#8b95a1) on `surface`는 3.1:1이라 **13px 아래로 내리지 않는다.** 본문
  크기의 보조 글자는 `n300`·`n400`을 쓴다.

## 다크 (#575 · ssccops#429)

테마는 «시스템 · 밝게 · 어둡게» 셋이고 구현은 `@ssccops/ui`(`useTheme`·`ThemeToggle`·
`THEME_INIT_SCRIPT` — admin #226 · #341 · lms #349)다. 다크는 `dark:` 유틸리티가 아니라
**`globals.css`가 토큰 값을 갈아 끼우는 것**이라 화면 코드에 다크 분기가 없다 — 규칙이 두 벌인
것은 시스템 따름(`@media (prefers-color-scheme: dark)` + `:root:not([data-theme="light"])`)과
명시 선택(`:root[data-theme="dark"]`)이 둘 다 필요해서다. **값은 admin이 대비를 실측해 정한 것을
lms를 거쳐 그대로 옮겼고, 여기서 새로 고르지 않는다**(surface 위 WCAG AA 4.5 기준 — ink 13.6 ·
n300 9.7 · n400 6.3 · n500 4.95 · accent 5.1 · danger 5.9 · success 8.0 · amber 8.2).

| 토큰 | 다크 값 | 비고 |
|---|---|---|
| `bg` · `surface` | `#17171c` · `#1f1f26` | `surface`가 주소창 색(`viewport.themeColor`)이기도 하다 |
| `ink` | `#e8eaed` | |
| `accent` · `accent-strong` · `accent-soft` | `#4c8ff8` · `#7aaefb` · `#16243b` | `accent-soft`는 4.39로 미달이라 낮춘 값 — 더 밝히면 배지 글자가 흐려진다 |
| `n300` · `n400` · `n500` | `#c3c8cf` · `#9aa1ab` · `#868e99` | |
| `line` · `line-strong` | `#2c2d35` · `#3d3f49` | |
| `amber` · `amber-soft` | `#f0a952` · `#2b1f0b` | |
| `danger` · `success` | `#ff6b76` · `#2fce85` | |
| `hairline` · `hairline-strong` | `rgb(255 255 255 / .09)` · `rgb(255 255 255 / .13)` | 밝은 배경엔 검정, 어두운 배경엔 흰색 알파 |
| `scrim` | `rgb(0 0 0 / .66)` | |
| `on-solid` | `#12131a` | accent(#4c8ff8) 위 흰 글자는 2.9:1 — 어두운 잉크로 5.8:1 |

- www가 쓰는 토큰만 정의한다 — lms·admin에 있는 `danger-strong`·`fill*`·`subtle`은 자리가
  없어 두지 않았다. 필요해지면 lms의 값을 그대로 옮긴다.
- 선택은 `localStorage`(`sscc-theme`)이고 첫 페인트 전에 `layout.tsx` `<head>`의 동기 스크립트가
  `<html data-theme>`를 박는다(FOUC 차단). 그 짝으로 `<html suppressHydrationWarning>`.
- OG 이미지 라우트(`/f/{formId}/og`)와 `manifest.ts`의 값은 테마와 무관하다 — 카드는 메신저가
  캐싱하는 그림이고 manifest는 미디어 쿼리를 받지 못한다.

## 간격

- 페이지 폭 `max-w-[1000px]`, 좌우 여백 20px(`lg` 28px), 위아래 22px(`lg` 26px) —
  `layout.tsx`의 `<main>`.
- 화면 안 블록 사이 **16px**(`gap-[16px]`), 카드 그리드 **14px**, 카드 안 요소 **6~10px**.
- 카드 패딩 16px(`lg` 18px). 본문 카드(페이지·포스트)는 18px/26px에 위아래를 8px/14px로 줄인다 —
  마크다운 첫 제목·마지막 문단이 자기 여백을 갖고 있어서다.
- 모서리 `rounded-2xl`(16px) 카드 · `rounded-xl`(12px) 버튼·이미지 · `rounded-full` 칩.

## 칩 · 탭 · 배지

| 이름 | 어디서 | 모양 | 역할 |
|---|---|---|---|
| 분류 탭(`views/records` `CategoryTabs`) · 하위 내비 탭(`shared/ui` `SectionTabs` · #524 · 내 활동 축 #574) · 분류 칩(행사 목록 `/events`) · 상태 칩(내 활동 `views/me` `StatusFilter` · #574) | 목록·페이지 제목 아래 | `rounded-full border px-3 py-[6px] text-[14px]`, 켜지면 `border-accent-strong bg-accent-soft text-accent-strong` | **링크**다. `<nav>` + `aria-current="page"` — `role="tablist"`가 아니다. ARIA 탭은 같은 화면의 패널을 바꾸는 위젯이고, 주소가 바뀌는 이동은 내비게이션이다 |
| 선택 칩(`shared/ui` `Chip`) | 가입 폼의 재학·졸업 | `rounded-full`, 켜지면 `bg-accent text-white` | 버튼(`aria-pressed`) |
| `Pill`(`@ssccops/ui`) | 카드의 분류 이름 | 회색 알약 | 표시만 |
| `Badge`(`@ssccops/ui`) | 행사 상태 | `rounded-[6px] px-[7px] text-[13px]`, 톤 7종 | 표시만 |

- 칩·탭 글자는 **좁은 화면(375px)에서 줄이 깨지므로** 두 글자~네 글자로 둔다(«전체»·«학술»).
- «더 보기»·«처음으로»는 칩이 아니라 버튼 모양 링크(`rounded-xl px-[16px] py-[10px]`) — 주 행동은
  `bg-accent text-white`, 보조 행동은 `border border-line text-n300`.

## 카드

- 카드 = `bg-surface rounded-2xl` + **1px 링**(`shadow-[0_0_0_1px_var(--color-line)]`). 테두리
  대신 그림자를 쓰는 것은 링이 레이아웃 폭에 끼지 않게 하려는 것이다. hover는 링 색만
  `accent-strong`으로.
- **목록 카드 전체가 링크**다(`<Link>`가 카드). 카드 안에 또 다른 링크·버튼을 넣지 않는다 —
  중첩 인터랙티브 요소는 접근성 트리에서 깨진다.
- 이미지: 행사 카드는 **정사각형**(카드뉴스 1:1 · ssccops#273), 포스트 카드·표지는 **16:10**
  (`aspect-[16/10]`), 갤러리는 정사각형 격자(2열 · `lg` 3열). 전부 `<img>` + `object-cover`이고
  `next/image` 최적화는 쓰지 않는다(ADR-0030). 첫 화면 밖의 이미지에는 `loading="lazy"`.
- 이미지가 없으면 자리를 비운다 — 회색 상자를 그리지 않는다(없는 값을 지어내지 않는다).
- 빈 상태·조회 실패는 `EmptyState`(카드 안 가운데 정렬 · 제목 15px `n300` · 설명 13.5px `n500`).

## 콘텐츠 본문 — Markdoc 태그

페이지·포스트 본문은 Markdoc(ADR-0039)이고 렌더러는 `@ssccops/ui` `ContentMarkdoc` — **어드민 미리보기와
같은 것**이라 편집기에서 본 대로 나온다. 노드(제목·문단·목록·표·링크·이미지·인용·코드)의 리듬은 행사
본문 `Markdown`과 같고, 표만 격자선 대신 줄 사이 `line` 하늘선(헤더 `bg` 13px `n400`)이다. 태그의 모양은
`packages/ui/src/ui/markdoc/components.tsx`에 있고 여기서는 무엇이 있는지만 적는다.

| 태그 | 안에 쓰는 것 | 모양 |
|---|---|---|
| `{% callout tone="info|warn" %}` | 문단 | `accent-soft`(warn은 `amber-soft`) 상자 12px 라운드 |
| `{% cards columns=2|3 %}` | `## 제목` + 문단 — 제목마다 카드 하나 | `bg` 카드 격자(`sm` 2열 · `lg` columns열), 차례 번호 `01` accent-strong 12.5px · 제목 18px |
| `{% faq %}` | `### 질문` + 답 | `<details>` 한 줄씩 — `Q` 칩(accent-soft 24px) · 질문 15.5px `font-medium` · 화살표 · 답 36px 들여 14.5px. JS 없음 |
| `{% steps %}` | 번호 목록 `1.` | accent 원(26px · 흰 숫자) + `line-strong` 세로선, 마지막 단계는 선 없음 |
| `{% timeline %}` | `## 연도` + 목록 | 연도 제목(accent-strong 19px) 왼쪽에 accent 점, 목록 왼쪽에 `line-strong` 세로선과 작은 점 |

태그는 **감싸기**다 — 안의 구조는 그대로 마크다운이고 태그가 제목에서 자른다. 기대하는 구조가 아니면(제목이
없다 · `steps`에 번호 목록이 없다) 안을 그대로 그린다. 라우트별 프리셋(#527)은 #532에서 걷어냈다.

## 상단 바 · 푸터

- 상단 바: 로고(홈) · 일곱 항목(SSCC · 운영진 · 활동 · 행사 · 학술 · 모집 · 문의 · #529 · #550) · 로그인 상태 ·
  테마 3버튼(`ThemeToggle fit` · `lg` 이상 · #575). `lg` 미만은 드로어이고 테마 3버튼은 드로어 발치(`mt-auto`)에
  — lms와 같은 자리다. **«지원하기» CTA는 없다.** 축 안의 하위 페이지는 페이지 제목 아래 탭 줄(#524).
- 홈(#524): hero 큰 문장 30px(`lg` 40px) `font-semibold tracking-[-.6px]`, 절 제목 19px
  `font-semibold`, 절 사이 28px(`lg` 36px). 일정은 카드 안 줄 목록(진행 단계 칩 · 제목 · 오른쪽 시작일 — 행사만 · #529),
  소개 블록은 4열 카드(`sm` 2열), 최근 활동은 3열 `PostCard`(`sm` 2열).
- 푸터: 문의 블록(`#contact` — 동방 위치 · 메일 · Instagram · GitHub) · 안내 문서 세 개(개인정보
  처리방침 · 사진 게재 안내 · 이용약관) · «숭실대학교 공식 사이트가 아닌 학생 동아리 운영» · ©.
  값은 `shared/config/contact.ts`.
