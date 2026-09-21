import type { MetadataRoute } from "next";
import {
  CONTENT_CATEGORIES,
  categoryByCode,
  fetchPublicPageSummaries,
  fetchPublicPosts,
} from "@/entities/content";
import { fetchPublicEvents } from "@/entities/event";
import { OPERATORS_SLUG_PREFIX, parseOperatorsCohort } from "@/shared/config/content-slugs";
import { ROUTES } from "@/shared/config/routes";
import { isIndexable, siteOrigin } from "@/shared/config/site";

/*
 * `GET /sitemap.xml` (#602 · ssccops#444).
 *
 * ── 무엇을 싣나 ─────────────────────────────────────────────
 * 익명으로 열리는 주소만이다 — 고정 경로(홈·콘텐츠 페이지·기록·행사·문의)와 서버가 «게시됐다»고
 * 답한 것(역대 운영진 대수 · 공개 행사 상세 · 기록 포스트 상세). `/me`·`/f/`·`/s/`는 robots가
 * 막는 경로라 여기도 없다. 콘텐츠 페이지는 게시 여부를 묻지 않고 고정으로 싣는다 — 게시본이
 * 없어도 «준비 중» 200이 뜨는 주소이고(상단 바에 걸려 있다), 열한 장을 매번 조회해 가르는 비용에
 * 견줄 값이 아니다.
 *
 * ── 실패해도 고정 경로는 낸다 ───────────────────────────────
 * 조회 셋은 `Promise.allSettled` — 서버가 잠깐 닿지 않을 때 sitemap이 통째로 500이면 검색엔진이
 * «sitemap을 못 읽는다»로 기록하고 한동안 안 온다. 실패한 묶음만 빠지고 나머지는 그대로다(홈이
 * 재료 하나가 죽어도 그 블록만 비우는 것과 같은 태도). 포스트는 커서를 따라 상한(`POST_CAP`)까지
 * 읽는다 — 학기마다 열 건 안팎이라 한 장에서 끝나지만 상한은 안전판이다.
 *
 * ── dev·오리진 없는 배포는 빈 목록 ─────────────────────────
 * robots가 이미 전부 막았고, `<loc>`은 절대 주소라 오리진 없이는 만들 수 없다(`isIndexable`).
 *
 * ── 요청마다 만든다(`force-dynamic`) ────────────────────────
 * 이 파일은 요청 시점 API를 읽지 않아 그대로 두면 **빌드 때 한 번 굳는다** — 빌드 머신에서
 * API가 닿지 않으면 고정 경로만 박힌 채 배포되고, 그 뒤 게시된 행사·포스트는 다음 배포까지
 * 없다. ISR(`revalidate`)로 풀지 않는 것은 플랫폼 중립 규칙(AGENTS «배포 — 두 플랫폼» — Cloudflare
 * dev는 매번 렌더한다)이고, `/version`이 같은 이유로 `force-dynamic`이다. CDN 캐시는 다른 익명
 * 화면과 같이 `next.config.ts` `headers()`가 5분을 건다.
 *
 * `lastModified`는 서버가 주는 시각이 있는 것(페이지·포스트의 `pubDt`)에만 — 행사 목록엔 수정
 * 시각이 없고 시작일은 수정 시각이 아니라 비운다(없는 값을 만들지 않는다). 고정 경로에 «지금»을
 * 적지 않는 것도 같은 이유다(매 요청 갱신된 척하면 검색엔진이 그 값을 무시하게 된다).
 */
export const dynamic = "force-dynamic";

/** 포스트를 읽는 상한 — 한 장 50건 × 열 장 */
const POST_PAGE_SIZE = 50;
const POST_CAP = 500;

/** 사람이 다른 곳에서 들어오지 않아도 이 사이트에 항상 있는 주소 */
const FIXED_PATHS: readonly string[] = [
  ROUTES.home,
  ROUTES.about,
  ROUTES.aboutHistory,
  ROUTES.aboutValues,
  ROUTES.operators,
  ROUTES.academic,
  ROUTES.join,
  ROUTES.joinFaq,
  ROUTES.joinHistory,
  ROUTES.privacy,
  ROUTES.photoNotice,
  ROUTES.terms,
  ROUTES.records,
  ...CONTENT_CATEGORIES.map((category) => ROUTES.recordsCategory(category.slug)),
  ROUTES.events,
  ROUTES.contact,
];

interface Entry {
  path: string;
  lastModified?: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  if (!isIndexable() || !origin) return [];

  const [cohorts, events, posts] = await Promise.allSettled([
    operatorCohortEntries(),
    eventEntries(),
    postEntries(),
  ]);

  const entries: Entry[] = [
    ...FIXED_PATHS.map((path) => ({ path })),
    ...settled(cohorts),
    ...settled(events),
    ...settled(posts),
  ];

  return entries.map(({ path, lastModified }) => ({
    url: `${origin}${path}`,
    ...(lastModified ? { lastModified } : {}),
  }));
}

/** 실패한 묶음은 빈 배열 — 고정 경로만이라도 낸다 */
function settled(result: PromiseSettledResult<Entry[]>): Entry[] {
  return result.status === "fulfilled" ? result.value : [];
}

/** 게시된 역대 운영진 페이지 — `operators-{대수}` 슬러그만(운영진 탭과 같은 파싱) */
async function operatorCohortEntries(): Promise<Entry[]> {
  const rows = await fetchPublicPageSummaries(OPERATORS_SLUG_PREFIX);
  return rows.flatMap((row) => {
    const cohort = parseOperatorsCohort(row.slug);
    return cohort === null
      ? []
      : [{ path: ROUTES.operatorsCohort(cohort), lastModified: row.pubDt }];
  });
}

/** 게시된 행사 전부 — 학술 프로그램도 상세 주소는 같은 라우트라 거르지 않는다(`/academic`이 링크한다) */
async function eventEntries(): Promise<Entry[]> {
  const events = await fetchPublicEvents();
  return events.map((event) => ({ path: ROUTES.eventDetail(event.eventId) }));
}

/** 게시된 포스트 — 분류 표에 없는 코드는 카드도 그리지 않으므로 여기서도 뺀다 */
async function postEntries(): Promise<Entry[]> {
  const entries: Entry[] = [];
  let cursor: string | null = null;

  while (entries.length < POST_CAP) {
    const { posts, page } = await fetchPublicPosts({ size: POST_PAGE_SIZE, cursor });
    if (posts.length === 0) break;
    for (const post of posts) {
      const category = categoryByCode(post.cntntClsfCd);
      if (category) {
        entries.push({
          path: ROUTES.recordsPost(category.slug, post.slug),
          lastModified: post.pubDt,
        });
      }
    }
    if (!page?.hasNext || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return entries;
}
