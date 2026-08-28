import { AcademicProgramDetailPage } from "@/views/academic-program-detail";

export default async function Page({
  params,
}: PageProps<"/academic-programs/[academicProgramId]">) {
  const { academicProgramId } = await params;
  return (
    <AcademicProgramDetailPage academicProgramId={Number(academicProgramId)} />
  );
}
