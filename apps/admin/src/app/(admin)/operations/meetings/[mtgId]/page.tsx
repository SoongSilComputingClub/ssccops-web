import { MeetingDetailPage } from "@/views/meeting-detail";

export default async function Page({
  params,
}: PageProps<"/operations/meetings/[mtgId]">) {
  const { mtgId } = await params;
  return <MeetingDetailPage mtgId={Number(mtgId)} />;
}
