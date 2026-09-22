import type { Metadata } from "next";
import { AcademicCta, AcademicPrograms } from "@/views/content-page";

export const metadata: Metadata = {
  title: "학술 프로그램",
  description: "SSCC가 모집하고 운영하는 스터디·프로젝트·트랙",
};

/**
 * 학술 — 모집 중인 학술 프로그램(#587 · ADR-0043) + LMS·기획안 제출 CTA (#550).
 *
 * ── 설명 페이지를 걷어냈다 (#641 · ssccops#464) ─────────────
 * #550부터 이 화면은 «홍보국이 쓰는 Markdoc 설명 페이지(슬러그 `academic`) + 목록 + CTA» 세
 * 겹이었다. 학술 프로그램이 구조로 갈라진 뒤(ADR-0043) 설명 글이 목록·CTA와 같은 말을 하게
 * 됐고, 쓰는 사람이 없어 prod는 «준비 중» 한 줄만 떠 있었다. 그래서 `ContentPage`를 걷고
 * 카탈로그에서도 그 줄을 지웠다 — 제목·부제는 코드가 든다. 게시된 행은 DB에 남지만 어디에도
 * 그려지지 않는다(되돌리려면 카탈로그 한 줄과 `ContentPage`를 되살리면 글도 돌아온다).
 *
 * 그래서 `generateMetadata`도 없다 — 조회할 본문이 없으니 제목·설명이 고정이고, OG·canonical은
 * 루트 레이아웃의 `title.template`·`alternates`가 그대로 만든다(`/events`·`/records`와 같은 모양).
 *
 * 축 안에 하위 페이지가 없어 탭 줄은 없다. 프로그램 목록이 CTA 위인 것은 «무엇이 열려 있나»를
 * 본 뒤에 «참여하기»가 오는 순서라서다. 틀(`article` · 제목 · 부제)은 `ContentPage`와 같은
 * 간격이다 — 상단 바의 다른 축에서 넘어와도 화면이 한 벌로 보여야 한다.
 */
export default function Page() {
  return (
    <article className="flex flex-col gap-[16px]">
      <header className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-medium tracking-[-.3px] lg:text-[24px]">학술 프로그램</h1>
        <p className="text-[13.5px] text-n500">
          스터디·프로젝트·트랙을 모집하고 운영합니다. 신청은 각 프로그램에서 받습니다.
        </p>
      </header>

      <AcademicPrograms />
      <AcademicCta />
    </article>
  );
}
