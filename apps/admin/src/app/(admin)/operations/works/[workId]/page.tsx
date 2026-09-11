import { WorkDetailPage } from "@/views/work-detail";

export default async function Page({
  params,
}: Readonly<PageProps<"/operations/works/[workId]">>) {
  const { workId } = await params;
  return <WorkDetailPage workId={Number(workId)} />;
}
