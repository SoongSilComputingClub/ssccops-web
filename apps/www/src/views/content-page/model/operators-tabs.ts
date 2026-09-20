import { fetchPublicPageSummaries } from "@/entities/content";
import { OPERATORS_SLUG_PREFIX, parseOperatorsCohort } from "@/shared/config/content-slugs";
import { ROUTES } from "@/shared/config/routes";
import { SECTION_TABS, exact, type SectionTab } from "@/shared/config/section-tabs";

/**
 * 운영진 축의 탭 — «지금» + 게시된 대수마다 «N대» (#571 · ssccops#425).
 *
 * 그전에는 손으로 적은 상수 `[44]`와 «역대» 탭 하나였다 — 43대 페이지가 게시돼 있어도 화면에서 갈
 * 길이 없었다. 지금은 서버 목록(`GET /public/v1/pages?slugPrefix=operators-`)이 답하고, 이 함수는
 * 슬러그를 숫자로 파싱해 **최신 대수가 앞**이 되게 정렬한다(서버는 문자열 오름차순이라 `operators-9`가
 * `operators-44` 뒤에 온다). 패턴이 아닌 슬러그는 버린다.
 *
 * 목록 조회가 실패하면 «지금» 하나만 남긴다 — 페이지 본문이 열리는데 탭 줄 때문에 화면이 죽는 편이
 * 더 나쁘다(ContentPage가 조회 실패를 «준비 중»으로 받는 것과 같은 태도). 서버 컴포넌트에서 부르고
 * 응답의 공개 캐시(5분)가 그대로 먹는다.
 */
export async function operatorsTabs(): Promise<readonly SectionTab[]> {
  const now = SECTION_TABS.operators;
  let cohorts: number[] = [];
  try {
    const rows = await fetchPublicPageSummaries(OPERATORS_SLUG_PREFIX);
    cohorts = rows
      .map((row) => parseOperatorsCohort(row.slug))
      .filter((n): n is number => n !== null)
      .sort((a, b) => b - a);
  } catch {
    cohorts = [];
  }
  return [
    ...now,
    ...cohorts.map((n) => {
      const href = ROUTES.operatorsCohort(n);
      return { href, label: `${n}대`, isActive: exact(href) };
    }),
  ];
}
