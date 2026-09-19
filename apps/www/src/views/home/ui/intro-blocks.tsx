import type { PublicContentPage } from "@/entities/content";
import { DEFAULT_INTRO_BLOCKS, parseIntroBlocks } from "../model/intro";

/**
 * 소개 4블록 — 세미나 · 프로젝트 · 스터디 · 행사 (#524 · ssccops#385).
 *
 * 문구는 페이지 `home-intro`의 `## 무엇을 하나` 절(`### 제목` + 한 줄)에서 읽고, 절이 없으면
 * 코드의 기본 문구다(`model/intro.ts` — 페이지 `about`의 «무엇을 하나»를 홈에 맞게 줄인 것).
 * **`about`을 다시 읽지 않는다** — 소개 페이지의 문단은 소개 페이지 길이이고, 홈 블록은 한
 * 줄이어야 격자가 선다. 홈 문구를 따로 두고 싶으면 `home-intro`에 절을 더하면 된다.
 */
export function IntroBlocks({ page }: Readonly<{ page: PublicContentPage | null }>) {
  const blocks = (page && parseIntroBlocks(page.mtxt)) ?? DEFAULT_INTRO_BLOCKS;

  return (
    <section className="flex flex-col gap-[12px]">
      <h2 className="text-[19px] font-semibold tracking-[-.2px]">무엇을 하나</h2>
      <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-2 lg:grid-cols-4">
        {blocks.map((block) => (
          <div
            key={block.title}
            className="flex flex-col gap-[6px] rounded-2xl bg-surface p-[16px] shadow-[0_0_0_1px_var(--color-line)] lg:p-[18px]"
          >
            <div className="text-[16px] font-semibold">{block.title}</div>
            {block.body && (
              <p className="text-[14px] leading-[1.6] text-n300">{block.body}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
