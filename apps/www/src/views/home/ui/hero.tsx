import Link from "next/link";
import type { PublicContentPage } from "@/entities/content";
import { ROUTES } from "@/shared/config/routes";
import { DEFAULT_INTRO, parseHomeIntro } from "../model/intro";

/**
 * hero — 큰 문장 하나 · 문단 하나 · [활동 보기] [소개] (#524 · ssccops#385).
 *
 * 문구는 페이지 `home-intro`에서 온다(첫 `# `가 큰 문장, 그 아래가 문단 — `model/intro.ts`).
 * 페이지가 없거나 못 읽으면 코드의 기본 문구다 — 홈의 첫 화면이 «준비 중»일 수는 없다.
 *
 * **«지원하기»가 없다**(ssccops#382 · #385). 지원은 학기 초뿐이라 평소의 첫 화면에 세워 둘 것이
 * 아니고, 모집 때는 배너와 «다가오는 일정»의 접수 중 칩이 안내한다.
 */
export function Hero({ page }: Readonly<{ page: PublicContentPage | null }>) {
  const intro = page ? parseHomeIntro(page.mtxt) : DEFAULT_INTRO;

  return (
    <section className="flex flex-col gap-[16px] py-[8px] lg:py-[20px]">
      <h1 className="text-[30px] font-semibold leading-[1.25] tracking-[-.6px] lg:text-[40px]">
        {intro.headline}
      </h1>
      <div className="flex max-w-[640px] flex-col gap-[8px]">
        {intro.paragraphs.map((paragraph) => (
          <p key={paragraph} className="text-[16px] leading-[1.7] text-n300 lg:text-[17px]">
            {paragraph}
          </p>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-[8px]">
        <Link
          href={ROUTES.records}
          className="rounded-xl bg-accent px-[18px] py-[11px] text-[15px] font-semibold text-on-solid transition-colors hover:bg-accent-strong"
        >
          기록 보기
        </Link>
        <Link
          href={ROUTES.about}
          className="rounded-xl border border-line px-[18px] py-[11px] text-[15px] text-n300 hover:text-ink"
        >
          소개
        </Link>
      </div>
    </section>
  );
}
