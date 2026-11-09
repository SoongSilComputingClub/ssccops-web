import type { Metadata } from "next";
import { RecruitmentApplicationsPage } from "@/views/recruitment-applications";

/**
 * /studio/programs/{programId}/applications — 지원자 목록(읽기 전용) (#826 · ssccops#625).
 *
 * 프로그램 상세의 하위 경로다 — 지원서 문항(`/form`)과 같은 자리. 들어오는 길은 모집 관리 카드의
 * «지원자 보기»라 상단 바는 «모집 관리»가 켠다(`nav-links.ts`). 숫자가 아니면 null로 넘겨 뷰가
 * «어떤 프로그램인지 알 수 없다» 안내를 그린다(임의로 하나를 고르지 않는다).
 */
export const metadata: Metadata = {
  title: "지원자",
};

function toId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export default async function Page({
  params,
}: Readonly<PageProps<"/studio/programs/[programId]/applications">>) {
  const { programId } = await params;
  return <RecruitmentApplicationsPage academicProgramId={toId(programId)} />;
}
