import Link from "next/link";
import { PostCard, type PublicContentPostPage } from "@/entities/content";
import { ROUTES } from "@/shared/config/routes";
import { Dash } from "./dash";

/**
 * 최근 기록 — 게시 포스트 최신순 (#524 · ssccops#385).
 *
 * 카드는 아카이브 목록과 같은 것(`entities/content` `PostCard` — 표지 · 분류 · 제목 · 요약 ·
 * 활동일)이고 «전체 보기»가 `/records`로 간다. 조회에 실패하면 «—» 한 줄, 게시된 글이
 * 없으면 «아직 올라온 글이 없습니다»(아카이브와 같은 문구).
 */
export function RecentPosts({
  result,
}: Readonly<{ result: PromiseSettledResult<PublicContentPostPage> }>) {
  let body;
  if (result.status === "rejected") {
    body = <Dash />;
  } else if (result.value.posts.length === 0) {
    body = <p className="text-[14.5px] text-n500">아직 올라온 글이 없습니다</p>;
  } else {
    body = (
      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3">
        {result.value.posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-[12px]">
      <div className="flex items-baseline justify-between gap-[10px]">
        <h2 className="text-[19px] font-semibold tracking-[-.2px]">최근 기록</h2>
        <Link href={ROUTES.records} className="text-[14px] text-accent-strong">
          전체 보기 ›
        </Link>
      </div>
      {body}
    </section>
  );
}

