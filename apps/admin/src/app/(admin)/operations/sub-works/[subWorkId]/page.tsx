import { SubWorkDetailPage } from "@/views/sub-work-detail";

export default async function Page({
  params,
}: Readonly<PageProps<"/operations/sub-works/[subWorkId]">>) {
  const { subWorkId } = await params;
  return <SubWorkDetailPage subWorkId={Number(subWorkId)} />;
}
