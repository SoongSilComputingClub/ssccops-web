import { WorkEditPage } from "@/views/work-edit";

export default async function Page({
  params,
}: PageProps<"/operations/works/[workId]/edit">) {
  const { workId } = await params;
  return <WorkEditPage workId={Number(workId)} />;
}
