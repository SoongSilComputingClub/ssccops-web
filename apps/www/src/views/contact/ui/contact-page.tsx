import {
  contentLoadErrorMessage,
  fetchPublicPage,
  isContentNotFound,
  type PublicContentPage,
} from "@/entities/content";
import { CONTACT } from "@/shared/config/contact";
import { Card, ContentMarkdoc, EmptyState } from "@/shared/ui";

/**
 * 문의 (SSR · #524) — 페이지 `contact`의 본문(게시돼 있으면) + 문의처 블록.
 *
 * 상단 바의 «문의»가 #520에서는 푸터 블록으로 내려가는 앵커(`#contact`)였다. 앵커는 어느
 * 화면에서 눌러도 항목이 켜지지 않고 공유할 주소도 없어 화면으로 올렸다. 푸터 블록은 그대로다 —
 * 지원자가 어느 화면에서 멈춰도 다음 행동이 있게 하는 자리라서다.
 *
 * `ContentPage`를 쓰지 않는 것은 게시본이 없을 때의 모양이 달라서다 — 다른 페이지는 «준비 중»
 * 한 줄이지만 여기는 본문이 없어도 문의처 블록이 화면의 본체다. 조회 실패만 한 줄로 안내하고
 * 블록은 그린다.
 *
 * 문의처 값은 푸터와 같은 `shared/config/contact.ts` 한 곳 — 메일은 정해지지 않아 null이고
 * 그때 줄을 그리지 않는다.
 */
export async function ContactPage({
  slug,
  fallbackTitle,
}: Readonly<{ slug: string; fallbackTitle: string }>) {
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

      {errorMessage && <EmptyState title={errorMessage} />}
      {page && page.mtxt.trim() && (
        <Card className="px-[18px] py-[8px] lg:px-[26px] lg:py-[14px]">
          <ContentMarkdoc>{page.mtxt}</ContentMarkdoc>
        </Card>
      )}

      <Card className="px-[18px] py-[16px] lg:px-[26px] lg:py-[20px]">
        <dl className="grid grid-cols-[auto_1fr] gap-x-[18px] gap-y-[10px] text-[15px]">
          <dt className="text-n500">동아리방</dt>
          <dd>{CONTACT.address}</dd>
          <dt className="text-n500">Instagram</dt>
          <dd>
            <a
              href={CONTACT.instagram}
              target="_blank"
              rel="noreferrer"
              className="text-accent-strong underline underline-offset-2"
            >
              @sscc_ssu
            </a>
          </dd>
          <dt className="text-n500">GitHub</dt>
          <dd>
            <a
              href={CONTACT.github}
              target="_blank"
              rel="noreferrer"
              className="text-accent-strong underline underline-offset-2"
            >
              SoongSilComputingClub
            </a>
          </dd>
          {CONTACT.email && (
            <>
              <dt className="text-n500">메일</dt>
              <dd>
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="text-accent-strong underline underline-offset-2"
                >
                  {CONTACT.email}
                </a>
              </dd>
            </>
          )}
        </dl>
      </Card>
    </article>
  );
}
