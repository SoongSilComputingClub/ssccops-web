import { EventEditPage } from "@/views/event-edit";

export default async function Page({
  params,
}: PageProps<"/events/[eventId]/edit">) {
  const { eventId } = await params;
  return <EventEditPage eventId={Number(eventId)} />;
}
