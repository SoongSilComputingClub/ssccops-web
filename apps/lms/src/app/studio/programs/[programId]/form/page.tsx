import type { Metadata } from "next";
import { RecruitmentFormPage } from "@/views/recruitment-form";

/**
 * /studio/programs/{programId}/form — 지원서 문항 편집·보기 (#528).
 *
 * 활동 상세의 하위 경로다 — 지원서는 활동 하나에 딸린 것이라 주소도 그 아래 둔다(시안).
 * 숫자가 아니면 null로 넘겨 뷰가 «어떤 활동인지 알 수 없다» 안내를 그린다(임의로 하나를
 * 고르지 않는다 · #128·#131과 같은 태도).
 */
export const metadata: Metadata = {
  title: "지원서 문항",
};

function toProgramId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export default async function Page({
  params,
}: Readonly<PageProps<"/studio/programs/[programId]/form">>) {
  const { programId } = await params;
  return <RecruitmentFormPage academicProgramId={toProgramId(programId)} />;
}
