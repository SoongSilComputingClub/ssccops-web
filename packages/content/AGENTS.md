# packages/content — 콘텐츠 페이지 카탈로그

www 라우트가 읽는 페이지 슬러그와 어드민이 보여 주는 페이지 목록이 **같은 표 하나**다(#534 · ssccops#392).
순수 TypeScript, 의존 없음. Tailwind 클래스가 없으므로 앱 `globals.css`의 `@source`는 필요 없다.

| 내보내는 것 | 무엇 |
|---|---|
| `CONTENT_SLUG` · `ContentSlug` | 슬러그 상수 — www 라우트가 `GET /public/v1/pages/{slug}`에 쓴다 |
| `CONTENT_PAGES` · `ContentPageEntry` · `findContentPage` | 카탈로그 — 슬러그·이름·공개 경로·묶음·부제. 어드민 «콘텐츠 › 페이지» 탭이 이 순서로 그린다 |
| `CONTENT_PAGE_GROUP_LABEL` | 묶음 이름(홈 · SSCC · 운영진 · 모집 · 안내 문서 · 문의) |
| `operatorsCohortSlug` · `isCohort` · `parseOperatorsCohort` · `operatorsCohortPath` | 역대 운영진 `operators-{n}`(n대 · `OPERATORS_SLUG_PREFIX`) — 카탈로그에 없는 유일한 **패턴** |

## 규칙

- **새 페이지 종류는 여기 한 줄 + www 라우트.** 어드민은 표를 읽어 자동으로 자리가 생기고, 홍보국은 그
  자리를 열어 쓴다. 어드민에 «새 페이지 만들기»가 없는 이유 — 표에 없는 이름으로 만든 페이지는 공개
  사이트 어디에도 나타나지 않는다.
- **서버는 슬러그를 자유롭게 받는다.** 허용 목록을 서버에 두면 서버가 www 라우트를 알게 되므로 두지
  않는다(ssccops#392). MCP `create_page`도 그대로다. 그래서 어드민은 서버에 있지만 표에 없는 페이지를
  «표에 없는 페이지» 절에 보여 준다 — 숨기지 않되 «어디에도 나타나지 않습니다»를 붙인다.
- `note`는 어드민 부제 한 줄이다 — 본문 규칙(어느 태그로 감싸는가 · ADR-0039)을 적는 자리이지 문서가
  아니다. 길어지면 www `docs/design-system.md`로.
- www만의 값(`OPERATOR_COHORTS` — 역대 탭이 먼저 가는 기수)은 여기 두지 않는다(www `content-slugs.ts`).
