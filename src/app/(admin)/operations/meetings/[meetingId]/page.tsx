import { MeetingDetailPage } from "@/views/meeting-detail";

export default async function Page({
  params,
}: PageProps<"/operations/meetings/[meetingId]">) {
  const { meetingId } = await params;
  return <MeetingDetailPage meetingId={meetingId} />;
}
