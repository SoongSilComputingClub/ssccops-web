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

## 색 토큰 (Toss 라이트 테마 · 어드민과 같은 값)

| 토큰 | 값 | 자리 |
|---|---|---|
| `bg` | `#f2f4f6` | 페이지 바탕 · 코드 블록 · 이미지 자리 |
| `surface` | `#ffffff` | 카드 · 상단 바 · 푸터 |
| `ink` | `#191f28` | 본문 글자 |
| `accent` · `accent-strong` · `accent-soft` | `#3182f6` · `#1b64da` · `#e8f2fe` | 링크 · 주 버튼 · 켜진 탭 |
| `n300` · `n400` · `n500` | `#4e5968` · `#6b7684` · `#8b95a1` | 보조 글자(진함 → 옅음) |
| `line` · `line-strong` | `#e5e8eb` · `#d1d6db` | 구분선 · 카드 링 · 칩 테두리 |
| `amber` · `amber-soft` | `#c2620a` · `#fff4e6` | 주의 배지 |
| `danger` · `success` | `#f04452` · `#00b25f` | 오류 · 완료 |

- 색은 **토큰 이름**으로 쓴다(`text-n500` · `var(--color-line)`). 값(`#e5e8eb`)을 박으면
  다크모드를 켜는 날 그 자리만 밝게 남는다(`packages/ui/AGENTS.md`).
- 글자 대비: `n500`(#8b95a1) on `surface`는 3.1:1이라 **13px 아래로 내리지 않는다.** 본문
  크기의 보조 글자는 `n300`·`n400`을 쓴다.

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
| 분류 탭(`views/activities` `CategoryTabs`) · 분류 칩(홈) | 목록 위 | `rounded-full border px-3 py-[6px] text-[14px]`, 켜지면 `border-accent-strong bg-accent-soft text-accent-strong` | **링크**다. `<nav>` + `aria-current="page"` — `role="tablist"`가 아니다. ARIA 탭은 같은 화면의 패널을 바꾸는 위젯이고, 주소가 바뀌는 이동은 내비게이션이다 |
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

## 연혁 타임라인

`.content-timeline`(연혁 페이지 본문 카드)이 `h3 + ul`을 타임라인처럼 그린다 — 연도 헤딩 왼쪽에
accent 점, 목록 왼쪽에 `line-strong` 세로선과 작은 점. 본문은 평범한 마크다운(`## 1983` + 목록)이고
CSS가 구조만 본다. 규칙은 `globals.css` 끝에 있다.

## 상단 바 · 푸터

- 상단 바: 로고(홈) · 다섯 축(SSCC · 운영진 · 활동 · 모집 · 문의) · 로그인 상태. `lg` 미만은
  드로어. **«지원하기» CTA는 없다.**
- 푸터: 문의 블록(`#contact` — 동방 위치 · 메일 · Instagram · GitHub) · 안내 문서 세 개(개인정보
  처리방침 · 사진 게재 안내 · 이용약관) · «숭실대학교 공식 사이트가 아닌 학생 동아리 운영» · ©.
  값은 `shared/config/contact.ts`.
