"use client";

import { useRouter } from "next/navigation";
import { meetingStatusTone, useMeetingStore } from "@/entities/meeting";
import { ROUTES } from "@/shared/config/routes";
import { Badge, Card, PageBody, PageHeader } from "@/shared/ui";

export function MeetingListPage() {
  const router = useRouter();
  const meetings = useMeetingStore((s) => s.meetings);

  return (
    <>
      <PageHeader title="회의" subtitle="정례 · 주제 회의" />
      <PageBody>
        <div className="grid grid-cols-2 gap-[14px]">
          {meetings.map((m) => (
            <Card key={m.id} onClick={() => router.push(ROUTES.meetingDetail(m.id))}>
              <div className="flex items-center gap-2">
                <Badge tone={meetingStatusTone(m.status)}>{m.status}</Badge>
                <Badge tone="grey">{m.kind}</Badge>
                <span className="font-mono text-[12.5px] text-n500">{m.id}</span>
                <div className="flex-1" />
                <div className="text-[13.5px] text-n500">안건 {m.agenda.length}건</div>
              </div>
              <div className="mt-2 text-[18px] font-semibold">{m.title}</div>
              <div className="mt-1 text-[14px] text-n400">
                {m.date} · {m.place}
              </div>
              <div className="mt-[2px] text-[13.5px] text-n500">
                의장 {m.chair} · 대상 {m.target}
              </div>
            </Card>
          ))}
        </div>
      </PageBody>
    </>
  );
}
