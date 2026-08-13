"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { meetingStatusTone, useMeetingStore } from "@/entities/meeting";
import { subWorkStatus, useSubWorkStore } from "@/entities/sub-work";
import { useWorkStore, workStatusTone } from "@/entities/work";
import { STAGES } from "@/shared/config/constants";
import { ROUTES } from "@/shared/config/routes";
import {
  Badge,
  Card,
  Chip,
  PageBody,
  PageHeader,
  SectionLabel,
} from "@/shared/ui";

const KIND_TABS = ["전체", "업무", "하위 업무", "회의"] as const;

interface OpRow {
  kind: "업무" | "하위 업무" | "회의";
  id: string;
  title: string;
  date: string;
  owner: string;
  ext: string;
  href: string;
}

export function OperationsHubPage() {
  const router = useRouter();
  const works = useWorkStore((s) => s.works);
  const tasks = useSubWorkStore((s) => s.tasks);
  const meetings = useMeetingStore((s) => s.meetings);
  const [tab, setTab] = useState<(typeof KIND_TABS)[number]>("전체");

  const kindTone = (kind: OpRow["kind"]) =>
    kind === "업무" ? "blue" : kind === "회의" ? "amber" : "grey";

  const rows: OpRow[] = [
    ...works.map<OpRow>((w) => ({
      kind: "업무",
      id: w.id,
      title: w.name,
      date: `${w.start} ~`,
      owner: w.owner,
      ext: `업무유형 ${w.type} · 상태 ${w.status} · 하위 ${w.subs.length}건`,
      href: ROUTES.workDetail(w.id),
    })),
    ...tasks.map<OpRow>((t) => ({
      kind: "하위 업무",
      id: t.id,
      title: t.title,
      date: t.due,
      owner: t.owner.split(" · ")[0],
      ext: `단계 ${STAGES[t.stage - 1]} · 승인 ${t.approval === "대기" ? "대기" : "불필요"} · 진행 ${t.progress}%`,
      href: ROUTES.taskDetail(t.id),
    })),
    ...meetings.map<OpRow>((m) => ({
      kind: "회의",
      id: m.id,
      title: m.title,
      date: m.date,
      owner: m.chair,
      ext: `구분 ${m.kind} · 상태 ${m.status} · 안건 ${m.agenda.length}건`,
      href: ROUTES.meetingDetail(m.id),
    })),
  ];
  const filtered = rows.filter((r) => tab === "전체" || r.kind === tab);

  const orphans = tasks.filter((t) => !works.some((w) => w.subs.includes(t.id)));

  const kindCards = [
    {
      code: "WORK",
      label: "업무",
      table: "work",
      count: works.length,
      note: "행사·상시·정례 운영 단위. 업무유형·상태·회고·진행률 보유",
      href: ROUTES.works,
      tone: "blue" as const,
    },
    {
      code: "SUB_WORK",
      label: "하위 업무",
      table: "sub_work",
      count: tasks.length,
      note: "실제 실행 단위. 상태 전이·승인·체크리스트의 대상",
      href: ROUTES.subWorks,
      tone: "grey" as const,
    },
    {
      code: "MEETING",
      label: "회의",
      table: "meeting",
      count: meetings.length,
      note: "정례·주제 회의. 안건과 처리 결과를 기록",
      href: ROUTES.meetings,
      tone: "amber" as const,
    },
  ];

  return (
    <>
      <PageHeader
        title="운영 통합"
        subtitle="operation · work · sub_work · meeting"
      />
      <PageBody>
        <p className="mb-4 max-w-[760px] text-[15px] text-n400">
          operation(공통 기준 개체)을 WORK · SUB_WORK · MEETING 세 하위 유형이
          상속합니다. PK는 운영_ID 하나로 공유되며, 아래 확장 속성만 유형별로
          다릅니다.
        </p>

        <div className="grid grid-cols-3 gap-[14px]">
          {kindCards.map((k) => (
            <Card key={k.code} onClick={() => router.push(k.href)}>
              <div className="flex items-center gap-2">
                <Badge tone={k.tone}>{k.label}</Badge>
                <span className="font-mono text-[12.5px] text-n500">{k.table}</span>
                <div className="flex-1" />
                <div className="text-[14px] text-accent">{k.count}건</div>
              </div>
              <div className="mt-2 text-[13.5px] leading-[1.5] text-n400">{k.note}</div>
            </Card>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-[1.5fr_1fr] items-start gap-4">
          <Card>
            <div className="mb-[14px] flex items-center gap-[7px]">
              {KIND_TABS.map((t) => (
                <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
                  {t}
                </Chip>
              ))}
              <div className="flex-1" />
              <div className="text-[13.5px] text-n500">
                {filtered.length}건 · 전체 {rows.length}건
              </div>
            </div>
            <div className="grid grid-cols-[.9fr_2fr_1.1fr_.9fr]">
              {["유형", "제목", "일시", "담당자"].map((h) => (
                <div key={h} className="pb-[10px] text-[13px] tracking-[.3px] text-n500">
                  {h}
                </div>
              ))}
              {filtered.map((r) => (
                <div key={`${r.kind}-${r.id}`} className="contents">
                  <div className="border-t border-black/5 py-3">
                    <Badge tone={kindTone(r.kind)}>{r.kind}</Badge>
                  </div>
                  <div
                    onClick={() => router.push(r.href)}
                    className="min-w-0 cursor-pointer border-t border-black/5 py-3 pr-3"
                  >
                    <div className="truncate text-[15px] font-semibold hover:text-accent">
                      {r.title}
                    </div>
                    <div className="mt-[2px] truncate text-[13.5px] text-n500">
                      {r.ext}
                    </div>
                  </div>
                  <div className="border-t border-black/5 py-3 text-[14px] text-n400">
                    {r.date}
                  </div>
                  <div className="border-t border-black/5 py-3 text-[14px] text-n400">
                    {r.owner}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionLabel className="mb-3">상속 구조</SectionLabel>
            <div className="flex flex-col gap-3">
              {works.map((w) => (
                <div key={w.id}>
                  <div
                    onClick={() => router.push(ROUTES.workDetail(w.id))}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <Badge tone={workStatusTone(w.status)}>{w.status}</Badge>
                    <div className="text-[15px] font-semibold hover:text-accent">
                      {w.name}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-col gap-2 border-l border-line pl-[14px]">
                    {w.subs.map((tid) => {
                      const t = tasks.find((x) => x.id === tid);
                      if (!t) return null;
                      return (
                        <div
                          key={tid}
                          onClick={() => router.push(ROUTES.taskDetail(tid))}
                          className="flex cursor-pointer items-center gap-2"
                        >
                          <Badge tone={subWorkStatus(t).tone}>
                            {subWorkStatus(t).label}
                          </Badge>
                          <div className="min-w-0 truncate text-[14px] hover:text-accent">
                            {t.title}
                          </div>
                          <div className="flex-none text-[12.5px] text-n500">
                            {STAGES[t.stage - 1]} · {t.progress}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {orphans.length > 0 && (
                <>
                  <div className="h-px bg-gradient-to-r from-transparent via-line to-transparent" />
                  <SectionLabel>업무 미연결 하위 업무</SectionLabel>
                  {orphans.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => router.push(ROUTES.taskDetail(t.id))}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <Badge tone="red">미연결</Badge>
                      <div className="min-w-0 truncate text-[14px] hover:text-accent">
                        {t.title}
                      </div>
                      <div className="flex-none text-[12.5px] text-n500">
                        {t.progress}%
                      </div>
                    </div>
                  ))}
                </>
              )}

              <div className="h-px bg-gradient-to-r from-transparent via-line to-transparent" />
              <SectionLabel>회의</SectionLabel>
              {meetings.map((m) => (
                <div
                  key={m.id}
                  onClick={() => router.push(ROUTES.meetingDetail(m.id))}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <Badge tone={meetingStatusTone(m.status)}>{m.status}</Badge>
                  <div className="min-w-0 truncate text-[14px] hover:text-accent">
                    {m.title}
                  </div>
                  <div className="flex-none text-[12.5px] text-n500">{m.date}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
