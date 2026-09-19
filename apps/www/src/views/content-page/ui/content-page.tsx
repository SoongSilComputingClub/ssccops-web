import type { ReactNode } from "react";
import {
  contentLoadErrorMessage,
  fetchPublicPage,
  isContentNotFound,
  type PublicContentPage,
} from "@/entities/content";
import type { SectionAxis } from "@/shared/config/section-tabs";
import { Card, ContentMarkdoc, EmptyState } from "@/shared/ui";
import { SectionTabs } from "./section-tabs";

/**
 * 게시된 페이지 한 장 (SSR · #520 · ssccops#382).
 *
 * 소개·연혁·운영진·지원 안내·법적 페이지가 전부 이 화면이다 — 다른 것은 슬러그와 제목뿐이고
 * 그 표는 `shared/config/content-slugs.ts`에 있다. 본문은 `ContentMarkdoc`(ADR-0039 — 레이아웃은
 * 글 안의 태그가 정한다 · 어드민 미리보기와 같은 렌더러 · 원시 HTML을 해석하지 않는다)으로 그린다.
 * #527에서 라우트별 프리셋(`layout`)을 뒀다가 #532에서 걷어냈다 — 같은 글이 주소에 따라 다르게
 * 보이고, 어느 절이 카드가 되는지가 글쓴이에게 보이지 않았다.
 *
 * ── 게시본이 없으면 «준비 중» ─────────────────────────────────
 * 서버는 초안·없음을 똑같이 404 `PAGE_NOT_FOUND`로 답한다. 포스트는 그때 404 화면으로 가지만
 * **페이지는 주소가 상단 바에 걸려 있어** 없는 주소가 아니다 — 홍보국이 아직 쓰지 않았을
 * 뿐이다. 그래서 404가 아니라 «준비 중» 한 줄이다(ssccops#382 수용 기준). 제목은 표의
 * 기본 제목(`fallbackTitle`)으로 세워 어느 자리인지는 보이게 한다.
 *
 * ── 조회 실패는 화면 안에서 ─────────────────────────────────
 * 서버가 잠깐 닿지 않을 때 공개 도메인이 통째로 오류 화면이 되는 편보다 낫다(이 앱의 규칙).
 *
 * ── 하위 내비 (#524) ────────────────────────────────────────
 * 세 축(SSCC · 운영진 · 모집)의 페이지는 제목 아래 탭 줄(`SectionTabs`)을 갖는다 — 라우트가
 * `tabs`로 축과 자기 주소를 넘긴다. 법적 페이지는 넘기지 않아 탭이 없다. 게시본이 없어
 * «준비 중»일 때도 탭은 선다 — 이웃 페이지로 가는 길까지 막을 이유가 없다.
 */
export async function ContentPage({
  slug,
  fallbackTitle,
  tabs,
  after,
}: Readonly<{
  slug: string;
  /** 게시본이 없거나 조회에 실패했을 때 세우는 제목 */
  fallbackTitle: string;
  /** 축 안의 탭 줄 — 축과 지금 주소. 없으면 탭 줄이 없다(법적 페이지) */
  tabs?: { axis: SectionAxis; pathname: string };
  /** 본문 아래 붙는 블록 — 지원 안내의 접수 중인 폼 목록 같은 것 */
  after?: ReactNode;
}>) {
  let page: PublicContentPage | null = null;
  let errorMessage: string | null = null;

  try {
    page = await fetchPublicPage(slug);
  } catch (error) {
    if (!isContentNotFound(error)) errorMessage = contentLoadErrorMessage(error);
  }

  return (
    <article className="flex flex-col gap-[16px]">
      <header className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-medium tracking-[-.3px] lg:text-[24px]">
          {page?.ttl ?? fallbackTitle}
        </h1>
      </header>

      {tabs && <SectionTabs axis={tabs.axis} pathname={tabs.pathname} />}

      {errorMessage && <EmptyState title={errorMessage} />}
      {!errorMessage && !page && <EmptyState title="준비 중입니다" />}
      {page &&
        (page.mtxt.trim() ? (
          <Card className="px-[18px] py-[8px] lg:px-[26px] lg:py-[14px]">
            <ContentMarkdoc>{page.mtxt}</ContentMarkdoc>
          </Card>
        ) : (
          <EmptyState title="준비 중입니다" />
        ))}

      {after}
    </article>
  );
}
