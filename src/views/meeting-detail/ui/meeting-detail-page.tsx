"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  agendaKindTone,
  meetingStatusTone,
  useMeetingStore,
} from "@/entities/meeting";
import { subWorkStatus, useSubWorkStore } from "@/entities/sub-work";
import { useWorkStore } from "@/entities/work";
import { AG_KINDS } from "@/shared/config/constants";
import { ROUTES } from "@/shared/config/routes";
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  KeyValueGrid,
  PageBody,
  PageHeader,
  SectionLabel,
  TextArea,
  TextField,
  flash,
} from "@/shared/ui";

interface OpRef {
  id: string;
  code: "업무" | "하위 업무";
  title: string;
  meta: string;
}

export function MeetingDetailPage({ meetingId }: { meetingId: string }) {
  const router = useRouter();
  const meeting = useMeetingStore((s) => s.meetings.find((m) => m.id === meetingId));
  const { updateAgenda, addAgenda, removeAgenda } = useMeetingStore();
  const works = useWorkStore((s) => s.works);
  const tasks = useSubWorkStore((s) => s.tasks);

  const [newOp, setNewOp] = useState<string | null>(null);
  const [newKind, setNewKind] = useState<string>("논의");
  const [newNote, setNewNote] = useState("");

  if (!meeting) {
    return (
      <>
        <PageHeader title="회의 상세" showBack />
        <PageBody>
          <EmptyState message="회의를 찾을 수 없습니다." />
        </PageBody>
      </>
    );
  }

  const ops: OpRef[] = [
    ...works.map((w) => ({
      id: w.id,
      code: "업무" as const,
      title: w.name,
      meta: `업무유형 ${w.type} · 상태 ${w.status}`,
    })),
    ...tasks.map((t) => ({
      id: t.id,
      code: "하위 업무" as const,
      title: t.title,
      meta: `${subWorkStatus(t).label} · 진행 ${t.progress}%`,
    })),
  ];
  const opOf = (id: string) => ops.find((o) => o.id === id);

  const openOp = (id: string) => {
    if (id.startsWith("w")) router.push(ROUTES.workDetail(id));
    else router.push(ROUTES.taskDetail(id));
  };

  const submitAgenda = () => {
    if (!newOp) {
      flash("연결할 운영을 선택하세요");
      return;
    }
    const op = opOf(newOp);
    addAgenda(meeting.id, {
      name: op?.title ?? "",
      kind: newKind,
      op: newOp,
      note: newNote.trim() || "-",
      result: "-",
    });
    flash(`안건을 추가했습니다 · ${op?.title ?? ""}`);
    setNewOp(null);
    setNewKind("논의");
    setNewNote("");
  };

  return (
    <>
      <PageHeader title="회의 상세" subtitle="안건 · 처리 결과" showBack />
      <PageBody>
        <div className="grid grid-cols-[1fr_1.6fr] items-start gap-4">
          <Card>
            <div className="flex items-center gap-2">
              <Badge tone={meetingStatusTone(meeting.status)}>{meeting.status}</Badge>
              <span className="rounded-[6px] bg-bg px-[7px] py-[2px] font-mono text-[12.5px] text-n400">
                운영_ID · {meeting.id}
              </span>
            </div>
            <div className="mt-2 text-[22px] font-medium">{meeting.title}</div>
            <SectionLabel className="mt-5">공통 속성 · operation</SectionLabel>
            <KeyValueGrid
              className="mt-[10px] border-b border-black/8 pb-[14px]"
              labelWidth={88}
              items={[
                { k: "운영_ID", v: <span className="font-mono text-[13.5px]">{meeting.id}</span> },
                { k: "운영유형", v: "회의 (meeting)" },
                { k: "제목", v: meeting.title },
                { k: "시작 일시", v: meeting.date },
                { k: "담당자", v: meeting.chair },
                { k: "기수", v: "제38대" },
              ]}
            />
            <SectionLabel className="mt-4 mb-[10px]">확장 속성 · meeting</SectionLabel>
            <KeyValueGrid
              labelWidth={88}
              items={[
                { k: "회의 구분", v: meeting.kind },
                { k: "일시", v: meeting.date },
                { k: "장소", v: meeting.place },
                { k: "의장", v: meeting.chair },
                { k: "참석 대상", v: meeting.target },
              ]}
            />
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <SectionLabel className="mb-3">안건</SectionLabel>
              <div className="flex flex-col gap-4">
                {meeting.agenda.map((a) => {
                  const op = opOf(a.op);
                  return (
                    <div key={a.no} className="rounded-[12px] border border-line p-[14px]">
                      <div className="flex items-center gap-2">
                        <div className="text-[15px] font-semibold">안건 {a.no}</div>
                        <span className="font-mono text-[12px] text-n500">
                          {meeting.id}-A{a.no}
                        </span>
                        <div className="flex-1" />
                        {meeting.agenda.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              removeAgenda(meeting.id, a.no);
                              flash("안건을 삭제했습니다");
                            }}
                            className="cursor-pointer text-[13.5px] text-n400 hover:text-danger"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                      {op ? (
                        <div
                          onClick={() => openOp(op.id)}
                          className="mt-3 cursor-pointer rounded-[10px] bg-bg p-3 transition-opacity hover:opacity-80"
                        >
                          <div className="flex items-center gap-2">
                            <Badge tone={op.code === "업무" ? "blue" : "grey"}>
                              {op.code}
                            </Badge>
                            <span className="font-mono text-[12.5px] text-n500">
                              {op.id}
                            </span>
                          </div>
                          <div className="mt-1 text-[15.5px] font-semibold">
                            {op.title}
                          </div>
                          <div className="mt-[2px] text-[13px] text-n500">{op.meta}</div>
                        </div>
                      ) : (
                        <div className="mt-3 rounded-[10px] bg-bg p-3 text-[14px] text-n500">
                          {a.name} · 연결된 운영 없음
                        </div>
                      )}
                      <div className="mt-3 flex gap-[7px]">
                        {AG_KINDS.map((k) => (
                          <Chip
                            key={k}
                            active={a.kind === k}
                            onClick={() => updateAgenda(meeting.id, a.no, { kind: k })}
                          >
                            {k}
                          </Chip>
                        ))}
                        <div className="flex-1" />
                        <Badge tone={agendaKindTone(a.kind)}>{a.kind}</Badge>
                      </div>
                      <div className="mt-3">
                        <div className="mb-[6px] text-[13.5px] text-n400">안건 내용</div>
                        <TextArea
                          value={a.note === "-" ? "" : a.note}
                          onChange={(e) =>
                            updateAgenda(meeting.id, a.no, {
                              note: e.target.value || "-",
                            })
                          }
                          placeholder="논의할 내용을 작성하세요"
                        />
                      </div>
                      <div className="mt-3">
                        <div className="mb-[6px] text-[13.5px] text-n400">처리 결과</div>
                        <TextField
                          value={a.result === "-" ? "" : a.result}
                          onChange={(e) =>
                            updateAgenda(meeting.id, a.no, {
                              result: e.target.value || "-",
                            })
                          }
                          placeholder="예: 원안 가결"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-[18px]">
              <div className="text-[16px] font-medium">안건 추가</div>
              <div className="mt-1 text-[13.5px] text-n500">
                안건으로 올릴 운영을 선택하고 내용을 작성하세요.
              </div>
              <div className="mt-3 flex max-h-[260px] flex-col gap-2 overflow-y-auto">
                {ops.map((op) => (
                  <div
                    key={op.id}
                    onClick={() => setNewOp(op.id)}
                    className={
                      newOp === op.id
                        ? "cursor-pointer rounded-[10px] bg-accent/8 p-3 shadow-[inset_0_0_0_1px_#3182f6]"
                        : "cursor-pointer rounded-[10px] border border-line p-3 hover:border-accent"
                    }
                  >
                    <div className="flex items-center gap-2">
                      <Badge tone={op.code === "업무" ? "blue" : "grey"}>{op.code}</Badge>
                      <span className="font-mono text-[12.5px] text-n500">{op.id}</span>
                    </div>
                    <div className="mt-1 text-[15px] font-semibold">{op.title}</div>
                    <div className="mt-[2px] text-[13px] text-n500">{op.meta}</div>
                  </div>
                ))}
              </div>
              {newOp && (
                <div className="mt-3 text-[13.5px] text-accent">
                  선택됨 {opOf(newOp)?.title} · {newOp}
                </div>
              )}
              <div className="mt-3 flex gap-[7px]">
                {AG_KINDS.map((k) => (
                  <Chip key={k} active={newKind === k} onClick={() => setNewKind(k)}>
                    {k}
                  </Chip>
                ))}
              </div>
              <TextArea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="안건 내용 (선택)"
                className="mt-3"
              />
              <Button className="mt-3" onClick={submitAgenda}>
                안건 추가
              </Button>
            </div>
          </div>
        </div>
      </PageBody>
    </>
  );
}
