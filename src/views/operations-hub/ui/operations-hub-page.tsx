"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MeetingListItem } from "@/entities/meeting";
import { mtgSttsTone } from "@/entities/meeting";
import type { SubWorkListItem } from "@/entities/sub-work";
import type { WorkListItem } from "@/entities/work";
import { workSttsTone } from "@/entities/work";
import { useOperationsHub } from "@/features/oper";
import {
  APRV_STTS_NM,
  MTG_SE_NM,
  MTG_STTS_NM,
  OPER_TYPE_NM,
  WORK_STTS_NM,
  WORK_TYPE_NM,
  type OperTypeCd,
} from "@/shared/config/codes";
import { FIELD_LABEL } from "@/shared/config/labels";
import { ROUTES } from "@/shared/config/routes";
import { formatDt, formatMd } from "@/shared/lib/date";
import {
  Badge,
  type BadgeTone,
  Card,
  Chip,
  EmptyState,
  PageBody,
  PageHeader,
  SectionLabel,
} from "@/shared/ui";

/*
 * 운영 통합 (ssccops-server OPS-001 · GET /v1/operations · ssccops-web#63).
 *
 * 목 스토어(work·sub-work·meeting·oper·member 다섯 스토어를 화면에서 이어 붙이던 방식)를
 * 서버 응답 한 벌로 바꿨다 — 제목·담당자 이름·진행률·하위 업무 건수·안건 건수를 모두 서버가
 * 내려주므로 더 이상 클라이언트에서 조인하지 않는다(대시보드 #60이 밟은 경로와 같다).
 *
 * 탭 필터(전체/업무/하위업무/회의)와 우측 트리 묶음은 화면이 응답 배열 위에서 한다 — 서버는
 * 유형별 배열 세 개만 내리고, 트리는 subWorks[].work.workId로 상위 업무에 묶는다.
 */

const KIND_TABS: ("전체" | OperTypeCd)[] = ["전체", "WORK", "SUB_WORK", "MEETING"];

interface OperRow {
  operTypeCd: OperTypeCd;
  key: string;
  ttl: string;
  date: string;
  pic: string;
  ext: string;
  href: string;
}

const kindTone = (cd: OperTypeCd) =>
  cd === "WORK" ? "blue" : cd === "MEETING" ? "amber" : "grey";

/** 하위 업무 상태 배지 — sub-work-list-page의 statusBadge와 같은 규칙 */
function subWorkBadge(sw: SubWorkListItem): { label: string; tone: BadgeTone } {
  if (sw.approvalStatus === "PENDING" || sw.approvalStatus === "REAPPROVAL_REQUIRED") {
    return { label: "승인 대기", tone: "amber" };
  }
  if (sw.workStatus === "DONE") return { label: "완료", tone: "grey" };
  return { label: "진행", tone: "blue" };
}

function workRow(w: WorkListItem): OperRow {
  return {
    operTypeCd: "WORK",
    key: `WORK-${w.workId}`,
    ttl: w.title,
    date: `${formatMd(w.startAt)} ~`,
    pic: w.owner?.name || "-",
    ext: `업무 유형 ${WORK_TYPE_NM[w.workType]} · 업무 상태 ${WORK_STTS_NM[w.workStatus]} · 하위 ${w.subWorkCount}건`,
    href: ROUTES.workDetail(w.workId),
  };
}

function subWorkRow(sw: SubWorkListItem): OperRow {
  return {
    operTypeCd: "SUB_WORK",
    key: `SUB_WORK-${sw.subWorkId}`,
    ttl: sw.title,
    date: formatMd(sw.dueAt) || "-",
    pic: sw.owner?.name || "-",
    ext: `업무 상태 ${WORK_STTS_NM[sw.workStatus]} · 승인 ${APRV_STTS_NM[sw.approvalStatus]} · 진행 ${sw.progressRate}%`,
    href: ROUTES.subWorkDetail(sw.subWorkId),
  };
}

function meetingRow(m: MeetingListItem): OperRow {
  return {
    operTypeCd: "MEETING",
    key: `MEETING-${m.meetingId}`,
    ttl: m.title,
    date: formatDt(m.startAt),
    pic: m.personInCharge?.name || "-",
    ext: `회의 구분 ${m.meetingCategory ? MTG_SE_NM[m.meetingCategory] : "-"} · 회의 상태 ${
      m.meetingStatus ? MTG_STTS_NM[m.meetingStatus] : "-"
    } · 안건 ${m.agendaCount}건`,
    href: ROUTES.meetingDetail(m.meetingId),
  };
}

function OperationsHubSkeleton() {
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.5fr_1fr]">
      {[0, 1].map((i) => (
        <Card key={i} className="animate-pulse">
          <div className="h-[20px] w-2/5 rounded bg-black/5" />
          <div className="mt-3 h-[160px] w-full rounded bg-black/5" />
        </Card>
      ))}
    </div>
  );
}

export function OperationsHubPage() {
  const router = useRouter();
  const { data, status, errorMessage, reload } = useOperationsHub();
  const [tab, setTab] = useState<"전체" | OperTypeCd>("전체");

  const rows: OperRow[] = [
    ...data.works.map(workRow),
    ...data.subWorks.map(subWorkRow),
    ...data.meetings.map(meetingRow),
  ];
  const filtered = rows.filter((r) => tab === "전체" || r.operTypeCd === tab);

  const kindCards = [
    {
      cd: "WORK" as const,
      table: "work",
      count: data.works.length,
      note: "행사·상시·정례 운영 단위. 업무 유형·업무 상태·총평·진행률 보유",
      href: ROUTES.works,
    },
    {
      cd: "SUB_WORK" as const,
      table: "sub_work",
      count: data.subWorks.length,
      note: "실제 실행 단위. 상태 전이·승인·점검 목록의 대상",
      href: ROUTES.subWorks,
    },
    {
      cd: "MEETING" as const,
      table: "mtg",
      count: data.meetings.length,
      note: "정례·주제 회의. 안건(mtg_dtl)과 결과 내용을 기록",
      href: ROUTES.meetings,
    },
  ];

  return (
    <>
      <PageHeader title="운영 통합" subtitle="oper · work · sub_work · mtg" />
      <PageBody>
        {status === "loading" && <OperationsHubSkeleton />}

        {status === "error" && (
          <EmptyState
            message={errorMessage || "운영 통합 목록을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: reload }}
          />
        )}

        {status === "ready" && (
          <>
            <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-3">
              {kindCards.map((k) => (
                <Card key={k.cd} onClick={() => router.push(k.href)}>
                  <div className="flex items-center gap-2">
                    <Badge tone={kindTone(k.cd)}>{OPER_TYPE_NM[k.cd]}</Badge>
                    <span className="font-mono text-[12.5px] text-n500">{k.table}</span>
                    <div className="flex-1" />
                    <div className="text-[14px] text-accent">{k.count}건</div>
                  </div>
                  <div className="mt-2 text-[13.5px] leading-[1.5] text-n400">
                    {k.note}
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.5fr_1fr]">
              <Card>
                <div className="mb-[14px] flex items-center gap-[7px]">
                  {KIND_TABS.map((t) => (
                    <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
                      {t === "전체" ? "전체" : OPER_TYPE_NM[t]}
                    </Chip>
                  ))}
                  <div className="flex-1" />
                  <div className="text-[13.5px] text-n500">
                    {filtered.length}건 · 전체 {rows.length}건
                  </div>
                </div>
                {filtered.length === 0 ? (
                  <EmptyState message="표시할 운영 건이 없습니다" />
                ) : (
                  <div className="grid grid-cols-[.9fr_2fr_1.1fr_.9fr]">
                    {[FIELD_LABEL.operationType, "제목", "일시", "담당자"].map((h) => (
                      <div
                        key={h}
                        className="pb-[10px] text-[13px] tracking-[.3px] text-n500"
                      >
                        {h}
                      </div>
                    ))}
                    {filtered.map((r) => (
                      <div key={r.key} className="contents">
                        <div className="border-t border-black/5 py-3">
                          <Badge tone={kindTone(r.operTypeCd)}>
                            {OPER_TYPE_NM[r.operTypeCd]}
                          </Badge>
                        </div>
                        <div
                          onClick={() => router.push(r.href)}
                          className="min-w-0 cursor-pointer border-t border-black/5 py-3 pr-3"
                        >
                          <div className="truncate text-[15px] font-semibold hover:text-accent">
                            {r.ttl}
                          </div>
                          <div className="mt-[2px] truncate text-[13.5px] text-n500">
                            {r.ext}
                          </div>
                        </div>
                        <div className="border-t border-black/5 py-3 text-[14px] text-n400">
                          {r.date}
                        </div>
                        <div className="border-t border-black/5 py-3 text-[14px] text-n400">
                          {r.pic}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card>
                <SectionLabel className="mb-3">상속 구조</SectionLabel>
                <div className="flex flex-col gap-3">
                  {data.works.length === 0 && (
                    <div className="text-[13.5px] text-n500">등록된 업무가 없습니다</div>
                  )}
                  {data.works.map((w) => (
                    <div key={w.workId}>
                      <div
                        onClick={() => router.push(ROUTES.workDetail(w.workId))}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Badge tone={workSttsTone(w.workStatus)}>
                          {WORK_STTS_NM[w.workStatus]}
                        </Badge>
                        <div className="text-[15px] font-semibold hover:text-accent">
                          {w.title}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-col gap-2 border-l border-line pl-[14px]">
                        {data.subWorks
                          .filter((sw) => sw.work?.workId === w.workId)
                          .map((sw) => {
                            const badge = subWorkBadge(sw);
                            return (
                              <div
                                key={sw.subWorkId}
                                onClick={() =>
                                  router.push(ROUTES.subWorkDetail(sw.subWorkId))
                                }
                                className="flex cursor-pointer items-center gap-2"
                              >
                                <Badge tone={badge.tone}>{badge.label}</Badge>
                                <div className="min-w-0 truncate text-[14px] hover:text-accent">
                                  {sw.title}
                                </div>
                                <div className="flex-none text-[12.5px] text-n500">
                                  {WORK_STTS_NM[sw.workStatus]} · {sw.progressRate}%
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ))}

                  <div className="h-px bg-gradient-to-r from-transparent via-line to-transparent" />
                  <SectionLabel>회의</SectionLabel>
                  {data.meetings.length === 0 && (
                    <div className="text-[13.5px] text-n500">등록된 회의가 없습니다</div>
                  )}
                  {data.meetings.map((m) => (
                    <div
                      key={m.meetingId}
                      onClick={() => router.push(ROUTES.meetingDetail(m.meetingId))}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <Badge tone={mtgSttsTone(m.meetingStatus)}>
                        {m.meetingStatus ? MTG_STTS_NM[m.meetingStatus] : "-"}
                      </Badge>
                      <div className="min-w-0 truncate text-[14px] hover:text-accent">
                        {m.title}
                      </div>
                      <div className="flex-none text-[12.5px] text-n500">
                        {formatDt(m.startAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}
      </PageBody>
    </>
  );
}
