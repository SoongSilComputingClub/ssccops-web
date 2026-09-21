import Link from "next/link";
import {
  contentLoadErrorMessage,
  fetchPublicPosts,
  PostCard,
  type ContentCategory,
  type PublicContentPostPage,
} from "@/entities/content";
import { ROUTES, activitiesPath } from "@/shared/config/routes";
import { EmptyState } from "@/shared/ui";
import { CategoryTabs } from "./category-tabs";

/** 한 화면에 그리는 포스트 수 — 두 열 카드가 여섯 줄 */
const PAGE_SIZE = 12;

/**
 * 활동 아카이브 목록 (SSR · #520 · ssccops#382) — 분류 탭 · 표지 · 활동일 · «더 보기».
 *
 * ── «더 보기»가 링크인 이유 ────────────────────────────────
 * 커서를 주소(`?cursor=`)에 싣고 다음 장을 **새 화면으로** 그린다. 누적해서 이어 붙이려면
 * 클라이언트 상태가 필요한데, 이 앱은 전 화면이 서버 컴포넌트다(#141). 한 장씩 넘기는 것이
 * 아카이브 읽기에는 충분하고, 주소가 남아 공유·뒤로 가기가 된다.
 *
 * ── 행사는 `/events`에 ──────────────────────────────────
 * 상단 바의 «활동»이 이 화면으로 오지만 열리는 행사의 전체 목록은 `/events`다(#524 — 홈이
 * «지금 SSCC»가 되면서 행사 목록이 그리로 이사했다). 헤더에 그 길을 한 줄 둔다.
 */
export async function ActivitiesPage({
  category,
  cursor,
}: Readonly<{
  /** 고른 분류 — null이면 전체 */
  category: ContentCategory | null;
  cursor: string | null;
}>) {
  let result: PublicContentPostPage | null = null;
  let errorMessage: string | null = null;

  try {
    result = await fetchPublicPosts({ category: category?.code, size: PAGE_SIZE, cursor });
  } catch (error) {
    errorMessage = contentLoadErrorMessage(error);
  }

  const selected = category?.slug ?? null;
  const posts = result?.posts ?? [];
  const nextCursor = result?.page?.hasNext ? result.page.nextCursor : null;

  return (
    <div className="flex flex-col gap-[16px]">
      <header className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-medium tracking-[-.3px] lg:text-[24px]">기록</h1>
        <p className="text-[13.5px] text-n500">
          학술·행사·뉴스 기록입니다. 지금 열리는 행사는{" "}
          <Link href={ROUTES.events} className="text-accent-strong underline underline-offset-2">
            행사 목록
          </Link>
          에 있습니다.
        </p>
      </header>

      <CategoryTabs selected={selected} />

      {errorMessage && <EmptyState title={errorMessage} />}

      {!errorMessage && posts.length === 0 && (
        <EmptyState
          title={cursor ? "더 이상 글이 없습니다" : "아직 올라온 글이 없습니다"}
        />
      )}

      {posts.length > 0 && (
        <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      )}

      {(nextCursor || cursor) && (
        <div className="flex items-center justify-center gap-[10px]">
          {cursor && (
            <Link
              href={activitiesPath(selected)}
              className="rounded-xl border border-line px-[16px] py-[10px] text-[14.5px] text-n300 hover:text-ink"
            >
              처음으로
            </Link>
          )}
          {nextCursor && (
            <Link
              href={activitiesPath(selected, nextCursor)}
              className="rounded-xl bg-accent px-[16px] py-[10px] text-[14.5px] font-semibold text-on-solid"
            >
              더 보기
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
