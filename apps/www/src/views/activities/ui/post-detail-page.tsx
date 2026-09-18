import Link from "next/link";
import { notFound } from "next/navigation";
import { formatYmd } from "@ssccops/date";
import {
  categoryByCode,
  contentLoadErrorMessage,
  fetchPublicPost,
  formatSemester,
  isContentNotFound,
  semesterOf,
  type ContentCategory,
  type PublicContentPostDetail,
} from "@/entities/content";
import { ROUTES } from "@/shared/config/routes";
import { Card, EmptyState, Markdown, Pill } from "@/shared/ui";

/**
 * 포스트 상세 (SSR · #520 · ssccops#382) — 표지 · 본문 · 갤러리 · 행사 링크.
 *
 * 게시되지 않은 포스트는 서버가 404로 답하고 그때는 `notFound()`다 — 행사 상세와 같은 판단
 * (없는 주소와 아직 게시하지 않은 주소를 화면이 가르면 초안의 존재가 새어 나간다). 주소의
 * 분류 조각이 포스트의 분류와 다르면 그것도 404다 — 한 글이 두 주소를 갖지 않게.
 *
 * 갤러리는 본문이 아니라 포스트의 파일 목록(`gallery[].imageUrl`)으로 그린다(ssccops#382 판단).
 * `next/image` 최적화는 쓰지 않는다(ADR-0030) — 지연 로딩만 건다.
 */
export async function PostDetailPage({
  category,
  slug,
}: Readonly<{ category: ContentCategory; slug: string }>) {
  let post: PublicContentPostDetail;
  try {
    post = await fetchPublicPost(slug);
  } catch (error) {
    if (isContentNotFound(error)) notFound();
    return (
      <div className="flex flex-col gap-[14px]">
        <BackLink category={category} />
        <EmptyState title={contentLoadErrorMessage(error)} />
      </div>
    );
  }

  const actual = categoryByCode(post.cntntClsfCd);
  if (!actual || actual.slug !== category.slug) notFound();

  const semester = semesterOf(post.actvYmd);

  return (
    <article className="flex flex-col gap-[14px]">
      <BackLink category={actual} />

      {post.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImageUrl}
          alt=""
          className="aspect-[16/10] w-full max-w-[640px] rounded-2xl bg-bg object-cover"
        />
      )}

      <Card className="flex flex-col gap-[10px]">
        <div className="flex flex-wrap items-center gap-[8px]">
          <Pill>{actual.label}</Pill>
          <span className="text-[13.5px] text-n500">{formatYmd(post.actvYmd)}</span>
          {semester && (
            <Link
              href={ROUTES.activitiesSemester(semester.year, semester.semester)}
              className="text-[13.5px] text-accent-strong"
            >
              {formatSemester(semester)}
            </Link>
          )}
        </div>
        <h1 className="text-[22px] font-bold leading-[1.3] lg:text-[24px]">{post.ttl}</h1>
        {post.smry && <p className="text-[15px] leading-[1.6] text-n300">{post.smry}</p>}
        {post.eventId !== null && (
          <Link
            href={ROUTES.eventDetail(post.eventId)}
            className="inline-flex self-start rounded-xl border border-line px-[12px] py-[7px] text-[14px] text-accent-strong hover:border-accent"
          >
            행사 정보 보기
          </Link>
        )}
        {post.mtxt.trim() ? (
          <Markdown>{post.mtxt}</Markdown>
        ) : (
          <p className="text-[15px] text-n500">본문이 없습니다</p>
        )}
      </Card>

      {post.gallery.length > 0 && (
        <section className="flex flex-col gap-[10px]">
          <h2 className="text-[17px] font-semibold">사진</h2>
          <ul className="grid grid-cols-2 gap-[8px] lg:grid-cols-3">
            {post.gallery.map((image) => (
              <li key={image.fileId}>
                <a href={image.imageUrl} target="_blank" rel="noreferrer">
                  {/* 캡션이 계약에 없어 alt는 비운다 — 장식 이미지로 읽힌다 */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.imageUrl}
                    alt=""
                    loading="lazy"
                    className="aspect-square w-full rounded-xl bg-bg object-cover"
                  />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

function BackLink({ category }: Readonly<{ category: ContentCategory }>) {
  return (
    <Link
      href={ROUTES.activitiesCategory(category.slug)}
      className="-my-1 inline-flex min-h-6 items-center self-start py-1 text-[13.5px] text-accent-strong"
    >
      ‹ {category.label} 목록
    </Link>
  );
}
