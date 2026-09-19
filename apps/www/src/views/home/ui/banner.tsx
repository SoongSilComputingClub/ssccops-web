import type { PublicContentPage } from "@/entities/content";
import { Markdown } from "@/shared/ui";

/**
 * 배너 한 줄 — 페이지 `home-banner`가 게시 중일 때만 (#524 · ssccops#385).
 *
 * 상단 바에 «지원하기»를 세우지 않는 대신(ssccops#382) 모집 기간의 안내가 이 자리다. 게시를
 * 내리면 줄이 사라진다 — 화면 코드를 고치지 않고 홍보국이 켜고 끈다.
 *
 * 본문을 `Markdown`으로 그리는 것은 링크 때문이다 — «지원하기»는 접수 중인 폼 주소로 가야 하고,
 * 글자로만 자르면 그 링크가 죽는다. 렌더러는 원시 HTML을 해석하지 않으므로 안전 판단은 본문과
 * 같다. 한 줄로 쓰는 것은 홍보국 쪽 규칙이고 화면이 자르지 않는다.
 */
export function Banner({ page }: Readonly<{ page: PublicContentPage | null }>) {
  if (!page || !page.mtxt.trim()) return null;

  return (
    <aside
      aria-label="안내"
      className="-mt-[6px] rounded-xl bg-accent-soft px-[16px] py-[4px] text-[14.5px] text-accent-strong lg:-mt-[8px] [&_p]:my-[8px]"
    >
      <Markdown>{page.mtxt}</Markdown>
    </aside>
  );
}
