import Link from "next/link";
import { formatYmd } from "@ssccops/date";
import { categoryByCode } from "../model/category";
import type { PublicContentPostSummary } from "../model/types";
import { ROUTES } from "@/shared/config/routes";
import { Pill } from "@/shared/ui";

/**
 * 포스트 목록 카드 — 표지 · 분류 · 제목 · 요약 · 활동일 (#520).
 *
 * 행사 카드(`entities/event/ui/event-card.tsx`)와 같은 틀이다. 표지가 없으면 이미지 자리를
 * 그리지 않고, 요약이 없으면 그 줄을 비운다 — 없는 값을 문구로 채우지 않는다.
 *
 * `views/records`에 있다가 entity로 내려왔다(#524) — 홈의 «최근 활동»(`views/home`)도 같은
 * 카드를 그리는데, views 슬라이스끼리는 참조하지 않는다(루트 AGENTS «FSD»). 행사 카드가 #520에서
 * 같은 길을 밟았다.
 *
 * 분류 코드가 표에 없으면(서버가 새 값을 더한 배포) 링크를 전체 목록 조각 대신 그 코드로
 * 만들 수 없으므로 카드를 그리지 않는다 — 죽은 주소로 사람을 보내지 않는다.
 */
export function PostCard({ post }: Readonly<{ post: PublicContentPostSummary }>) {
  const category = categoryByCode(post.cntntClsfCd);
  if (!category) return null;

  return (
    <Link
      href={ROUTES.recordsPost(category.slug, post.slug)}
      className="flex flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_0_0_1px_var(--color-line)] transition-shadow hover:shadow-[0_0_0_1px_var(--color-accent-strong)]"
    >
      {post.coverImageUrl && (
        /*
         * `next/image`를 쓰지 않는다 — 두 플랫폼에서 같은 뜻이어야 한다(ADR-0030 · 루트 AGENTS
         * «배포»). 올릴 때 줄인 이미지를 그대로 쓰고 지연 로딩만 건다.
         */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImageUrl}
          alt=""
          loading="lazy"
          className="aspect-[16/10] w-full bg-bg object-cover"
        />
      )}
      <div className="flex flex-1 flex-col gap-[6px] p-[16px] lg:p-[18px]">
        <div className="flex flex-wrap items-center gap-[8px]">
          <Pill>{category.label}</Pill>
          <span className="text-[13.5px] text-n500">{formatYmd(post.actvYmd)}</span>
        </div>
        <div className="text-[17px] font-semibold leading-[1.35] lg:text-[18px]">{post.ttl}</div>
        {post.smry && (
          <p className="line-clamp-2 text-[14px] leading-[1.6] text-n300">{post.smry}</p>
        )}
      </div>
    </Link>
  );
}
