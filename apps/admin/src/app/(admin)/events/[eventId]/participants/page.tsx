import { EventParticipantsPage } from "@/views/event-participants";

export default async function Page({
  params,
}: PageProps<"/events/[eventId]/participants">) {
  const { eventId } = await params;
  return <EventParticipantsPage eventId={Number(eventId)} />;
}
