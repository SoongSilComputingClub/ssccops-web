import { SubWorkEditPage } from "@/views/sub-work-edit";

export default async function Page({
  params,
}: Readonly<PageProps<"/operations/sub-works/[subWorkId]/edit">>) {
  const { subWorkId } = await params;
  return <SubWorkEditPage subWorkId={Number(subWorkId)} />;
}
