import { WorkEditPage } from "@/views/work-edit";

export default async function Page({
  params,
}: Readonly<PageProps<"/operations/works/[workId]/edit">>) {
  const { workId } = await params;
  return <WorkEditPage workId={Number(workId)} />;
}
