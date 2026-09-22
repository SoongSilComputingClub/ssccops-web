# packages/ui — `@ssccops/ui`

**이 파일이 정본이고 루트 `AGENTS.md`는 링크만 든다**(ssccops#349). «왜 그 모양인가»는 `src/index.ts` 머리 주석에 있다 — 여기는 규칙만.

세 앱이 함께 쓰는 표시 요소·테마·배포 표식. **둘 이상의 앱이 실제로 같은 것을 쓰고 있던 것만** 올린다(ssccops#243) — 전부 올리면 세 앱의 합집합이 되어 아무도 못 건드린다.

| 있는 것 | 없는 것과 이유 |
|---|---|
| `cn` · `onKeyActivate` · `deployEnv`/`deployMarks`(아이콘 폴더·`[DEV] ` 제목·`mark`) | `Chip` — 이름만 같고 admin은 필터 칩, www·lms는 선택 칩 |
| `THEMES`·`useTheme`·`THEME_INIT_SCRIPT`·`ThemeToggle`(#341 — admin #226 것을 lms가 쓰게 된 순간 올림) | `EmptyState` — admin `message`+`action`, www·lms `title`+`description`으로 API가 다르다 |
| `Badge`·`Pill` · `Card`·`CardTitle`·`SectionLabel` · `Markdown` · **`ContentMarkdoc`·`validateContentMarkdoc`·`CONTENT_TAG_SNIPPETS`**(ADR-0039 · #532 — 콘텐츠 페이지·포스트 본문, www 화면과 admin 미리보기가 한 벌) · `Notice` · `TextField`·`Field` · **`BrandMark`**(#449) | `Button`·`GridTable`·`Calendar` — admin에만 있다, 중복이 아니다 |
| **`AccountMenu`·`AccountSections`·`AccountMenuItem`·`AccountMenuNote`·`UtilityCluster`**(#614 · ssccops#452 — 세 앱 셸의 계정 메뉴. 절 순서 ①이름·역할 ②내 정보/내 활동 ③테마 ④다른 앱 ⑤홈 화면에 추가 ⑥로그아웃과 WAI-ARIA menu button 동작은 여기가 정하고 앱은 항목만 넘긴다) | 종(`NotificationBell`) — 라우트·배지 스토어가 앱마다 달라 `UtilityCluster`의 `bell` 슬롯으로 받는다 |

## 규칙

- **색은 토큰 이름으로 적는다** — `var(--color-line)`처럼. 세 앱의 `@theme`이 같은 이름을 정의하고 있어 지금은 결과가 같지만, 값으로 박으면 다크모드에서 그 자리만 밝은 채로 남는다.
- **`process.env`를 읽지 않는다.** `NEXT_PUBLIC_*`은 Next가 빌드 때 글자 그대로의 표현을 바꿔 끼우므로 앱 파일(`layout.tsx`·`manifest.ts`·헤더)에 `process.env.NEXT_PUBLIC_DEPLOY_ENV`가 적혀 있어야 한다 — `deployMarks(raw)`가 값을 인자로 받는 이유. 패키지 안에서 읽으면 dev 워커도 조용히 prod로 보인다.
- **컴포넌트를 더하면 세 앱 `globals.css`의 `@source`가 이 패키지를 가리키는지 확인한다.** Tailwind v4는 선언된 경로만 훑고 없는 클래스는 조용히 건너뛴다 — 타입·린트·빌드가 전부 통과한 채 화면만 무너진다(#316). 패키지가 스스로 선언할 방법은 없다.
- `<img>`를 쓴다(`BrandMark`) — `next/image`에 기대지 않는 플랫폼 중립 규칙(ADR-0030). `no-img-element`는 그 자리에서만 끈다.
- **계정 메뉴의 절 순서·구분선 자리를 앱에서 바꾸지 않는다**(ssccops#452 표가 정본). 앱마다 다른 것은 `links`(② 이 앱의 화면)·`apps`(④ 오리진이 있는 것만)·`install`(⑤ `@ssccops/pwa/ui` `InstallMenuItem`)·`onSignOut`뿐이다. 링크는 `<a>`이고 `onNavigate`가 있으면 수식키 없는 왼쪽 클릭만 앱 라우터로 보낸다 — `next/link`를 이 패키지에 들이지 않는다. 트리거는 셋(`avatar` 40px · `avatar-name` lg에서 이름 · `row` 사이드바 발치)이고 `placement="up"`은 admin 발치용이다. 드로어에는 팝오버를 또 열지 않고 `AccountSections`로 같은 절을 인라인 그린다.
- 사본을 둔 앱 컴포넌트를 올릴 때는 **앱마다 diff를 먼저 읽고 코드가 같은 것만** — 갈린 것은 어느 쪽이 맞는지 판단을 끝낸 뒤(`@ssccops/date`가 그렇게 했다).
