import type { Metadata } from "next";
import { ProgramEventPostPage } from "@/views/program-event-post";

/**
 * /studio/programs/{programId}/event-post — 소개 글(행사 게시물) 편집·보기 (#819 · ADR-0069).
 *
 * 프로그램 상세의 하위 경로다 — 지원서 문항(`/form`)과 같은 자리. 숫자가 아니면 null로 넘겨 뷰가
 * «어떤 프로그램인지 알 수 없다» 안내를 그린다. 상단 바는 «내 프로그램»이 켠다(`nav-links.ts` —
 * `/form`만 «모집 관리»로 뺀다).
 */
export const metadata: Metadata = {
  title: "소개 글",
};

function toProgramId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export default async function Page({
  params,
}: Readonly<PageProps<"/studio/programs/[programId]/event-post">>) {
  const { programId } = await params;
  return <ProgramEventPostPage academicProgramId={toProgramId(programId)} />;
}
