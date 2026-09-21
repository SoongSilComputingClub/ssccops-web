import {
  fetchPublicPage,
  fetchPublicPosts,
  isContentNotFound,
  type PublicContentPage,
} from "@/entities/content";
import { fetchPublicEvents } from "@/entities/event";
import { CONTENT_SLUG } from "@/shared/config/content-slugs";
import { organizationJsonLd, siteOrigin } from "@/shared/config/site";
import { JsonLd } from "@/shared/ui";
import { Banner } from "./banner";
import { Hero } from "./hero";
import { IntroBlocks } from "./intro-blocks";
import { ProgramRecruitment } from "./program-recruitment";
import { RecentPosts } from "./recent-posts";
import { Schedule } from "./schedule";

/** «최근 활동»에 그리는 포스트 수 — 두 열 카드 세 줄 */
const RECENT_POSTS = 6;

/**
 * 홈 — «지금 SSCC» (SSR · #524 · ssccops#385).
 *
 * 위에서 아래로: 배너 한 줄(페이지 `home-banner`가 게시 중일 때만) · hero(페이지 `home-intro`) ·
 * 다가오는 일정(예정 행사) · 학술 프로그램 모집(접수 중·예정 — 없으면 절 없음, #595) · 소개 4블록 · 최근 기록(포스트 최신 여섯). 행사 목록이
 * 첫 화면이던 자리(#141)이고 그 목록은 `/events`로 갔다 — 학기 중 대부분의 날에는 열린 행사가
 * 없어 첫 화면이 «공개된 행사가 없습니다» 한 줄이었다.
 *
 * ── 세션을 보지 않는다 ─────────────────────────────────────
 * 로그인 여부가 렌더에 들어오지 않는다(ssccops#385 수용 기준). 홈이 세션에 묶이면 익명 공개
 * 렌더마다 세션 왕복이 붙고 CDN 캐시(`next.config.ts` `headers()`)도 걸 수 없다. 부원의 «내
 * 것»은 `/me`이고 진입은 헤더 `AuthNav` 하나다.
 *
 * ── 재료 넷을 나란히, 하나가 실패해도 그 블록만 ────────────
 * `Promise.allSettled` — `/me`·학기별 묶음과 같은 판단이다. 실패한 블록은 «—» 또는 그 블록의
 * 빈 줄로 남고 나머지는 그린다. 배너·hero는 404가 정상 상태(아직 안 썼다)라 실패와 구별하지
 * 않고 기본값으로 떨어진다 — 배너는 없음, hero는 코드의 기본 문구.
 *
 * 서버가 주는 값 이상을 만들지 않는다 — 부원 수·«이번 학기» 같은 숫자 블록은 2026-09-19에
 * 뺐다(Sub-task «하지 않는 것»).
 *
 * ── `Organization` JSON-LD (#602 · ssccops#444) ─────────────
 * 검색엔진이 «이 사이트가 어느 단체인가»를 읽는 자리라 홈 한 곳에만 싣는다(모든 화면에 두면
 * 같은 데이터가 수십 번 나간다). 값은 `shared/config/site.ts`가 만들고 dev에서도 그린다 — 색인
 * 여부는 robots가 가르고 구조화 데이터 자체는 해가 없다.
 */
export async function HomePage() {
  const [banner, intro, events, posts] = await Promise.allSettled([
    fetchPublishedPage(CONTENT_SLUG.homeBanner),
    fetchPublishedPage(CONTENT_SLUG.homeIntro),
    fetchPublicEvents(),
    fetchPublicPosts({ size: RECENT_POSTS }),
  ]);
  const introPage = settled(intro);

  return (
    <div className="flex flex-col gap-[28px] lg:gap-[36px]">
      <JsonLd data={organizationJsonLd(siteOrigin())} />
      <Banner page={settled(banner)} />
      <Hero page={introPage} />
      <Schedule events={events} />
      <ProgramRecruitment events={events} />
      <IntroBlocks page={introPage} />
      <RecentPosts result={posts} />
    </div>
  );
}

/** 게시본이 없으면(404) null — 아직 안 쓴 페이지는 홈에서 오류가 아니다. 다른 실패는 던진다 */
async function fetchPublishedPage(slug: string): Promise<PublicContentPage | null> {
  try {
    return await fetchPublicPage(slug);
  } catch (error) {
    if (isContentNotFound(error)) return null;
    throw error;
  }
}

/** 성공한 값 또는 null — 배너·hero는 실패와 없음을 같은 모양(기본값)으로 그린다 */
function settled<T>(result: PromiseSettledResult<T | null>): T | null {
  return result.status === "fulfilled" ? result.value : null;
}
