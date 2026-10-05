"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { MeetingListItem } from "@/entities/meeting";
import { mtgSttsTone } from "@/entities/meeting";
import type { OperationTagSummary } from "@/entities/operation-tag";
import type { SubWorkListItem } from "@/entities/sub-work";
import type { WorkListItem } from "@/entities/work";
import { workSttsTone } from "@/entities/work";
import { useOperationsHub } from "@/features/oper";
import { OperationTagFilter, OperationTagPills } from "@/features/operation-tag";
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
import { formatDt, formatMd, todayInSeoul } from "@/shared/lib/date";
import {
  Badge,
  type BadgeTone,
  Calendar,
  type CalendarItem,
  type CalendarMode,
  visibleRange,
  Card,
  Chip,
  EmptyState,
  PageBody,
  PageHeader,
  SectionLabel,
  Segmented,
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
 *
 * ── 태그 (#771 · 서버 #640 · ssccops#576) ─────────────────────────
 * 업무·하위 업무·회의가 한 태그 목록을 쓰므로 리스트 행마다 칩을 달고, 태그 줄 하나로 세 배열을 함께
 * 거른다 — 거르기는 서버(`?tagId=`)가 한다. 하위 업무는 상위 업무의 태그를 물려받지 않으므로 거른
 * 결과에는 **상위 업무가 빠진 하위 업무**가 있을 수 있다. 트리는 그 하위 업무를 버리지 않고 응답이 함께
 * 준 상위 업무 이름(`work.title`) 아래 따로 묶는다 — 묶음 제목은 상태 배지 없이 흐리게 그려 그 업무는
 * 결과에 없다는 것이 보이게 한다.
 */

const KIND_TABS: ("전체" | OperTypeCd)[] = ["전체", "WORK", "SUB_WORK", "MEETING"];

const VIEWS = ["리스트", "주", "월"] as const;
type ViewMode = (typeof VIEWS)[number];

/*
 * 달력에 놓는 모양이 유형마다 다르다.
 *
 *   업무      막대  시작(startAt) ~ 종료(endAt)
 *   하위 업무  점    마감일(dueAt)
 *   회의      점    시작 일시(startAt)
 *
 * **막대와 점을 가르는 기준은 "기간이 뜻을 갖는가"다.** 업무는 시작~종료가 곧 그 업무의
 * 수명이라 막대이고, 나머지는 그날 하루의 사건이라 점이다. 회의도 endAt을 갖고 있지만
 * 대개 하루라 한 칸짜리 막대가 점과 구별되지 않아 점으로 둔다.
 *
 * 처음(#243)에는 업무도 종료일 한 점으로 찍었는데, 그러면 언제 시작했는지가 안 보이고
 * 무엇보다 **이 범위를 가로지르는 업무가 통째로 사라졌다**(8/1~10/30 업무가 9월 달력에
 * 없었다). 가장 오래 끄는 업무일수록 안 보이는 셈이라 #247에서 막대로 바꿨다.
 */
const CALENDAR_NOTE = "업무는 기간, 하위 업무는 마감일, 회의는 시작 시각 자리에 표시됩니다";

interface OperRow {
  operTypeCd: OperTypeCd;
  key: string;
  ttl: string;
  date: string;
  /**
   * 달력이 쓰는 원본 날짜 "YYYY-MM-DD".
   *
   * 업무는 [시작, 종료]이고 종료가 null이면 "언제 끝날지 미정"이다 — 종료일은 데이터사전
   * (운영.종료_일시 NotNull=N)·등록 화면·서버 검증 세 겹 다 선택이라 없을 수 있다.
   * 나머지는 하루짜리라 start만 쓴다. start가 없으면 달력에 놓지 않는다.
   */
  start: string | null;
  end: string | null;
  pic: string;
  ext: string;
  href: string;
  tags: OperationTagSummary[];
}

/** 서버가 주는 일시 문자열에서 날짜만 잘라 쓴다 — 시각은 달력 칸에 필요 없다 */
const ymdOf = (value: string | null): string | null => (value ? value.slice(0, 10) : null);

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
    start: ymdOf(w.startAt),
    end: ymdOf(w.endAt),
    pic: w.owner?.name || "-",
    ext: `업무 유형 ${WORK_TYPE_NM[w.workType]} · 업무 상태 ${WORK_STTS_NM[w.workStatus]} · 하위 ${w.subWorkCount}건`,
    href: ROUTES.workDetail(w.workId),
    tags: w.tags,
  };
}

function subWorkRow(sw: SubWorkListItem): OperRow {
  return {
    operTypeCd: "SUB_WORK",
    key: `SUB_WORK-${sw.subWorkId}`,
    ttl: sw.title,
    date: formatMd(sw.dueAt) || "-",
    start: ymdOf(sw.dueAt),
    end: null,
    pic: sw.owner?.name || "-",
    ext: `업무 상태 ${WORK_STTS_NM[sw.workStatus]} · 승인 ${APRV_STTS_NM[sw.approvalStatus]} · 진행 ${sw.progressRate}%`,
    href: ROUTES.subWorkDetail(sw.subWorkId),
    tags: sw.tags,
  };
}

function meetingRow(m: MeetingListItem): OperRow {
  return {
    operTypeCd: "MEETING",
    key: `MEETING-${m.meetingId}`,
    ttl: m.title,
    date: formatDt(m.startAt),
    start: ymdOf(m.startAt),
    end: null,
    pic: m.personInCharge?.name || "-",
    ext: `회의 구분 ${m.meetingCategory ? MTG_SE_NM[m.meetingCategory] : "-"} · 회의 상태 ${
      m.meetingStatus ? MTG_STTS_NM[m.meetingStatus] : "-"
    } · 안건 ${m.agendaCount}건`,
    href: ROUTES.meetingDetail(m.meetingId),
    tags: m.tags,
  };
}

function OperationsHubSkeleton() {
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.5fr_1fr]">
      {[0, 1].map((i) => (
        <Card key={i} className="animate-pulse">
          <div className="h-[20px] w-2/5 rounded bg-fill" />
          <div className="mt-3 h-[160px] w-full rounded bg-fill" />
        </Card>
      ))}
    </div>
  );
}

/** 상위 업무가 결과에 없는 하위 업무 묶음 — 태그로 거르면 생긴다 */
interface OrphanGroup {
  key: string;
  workId: number | null;
  title: string;
  subWorks: SubWorkListItem[];
}

/**
 * 응답의 하위 업무 중 상위 업무가 `works`에 없는 것을 상위 업무별로 묶는다. 순서는 응답 순서다.
 * 상위 업무가 아예 없는 행(스키마상 없지만 방어적으로)은 «미연결» 한 묶음이다.
 */
function orphanGroupsOf(
  works: readonly WorkListItem[],
  subWorks: readonly SubWorkListItem[],
): OrphanGroup[] {
  const present = new Set(works.map((w) => w.workId));
  const groups = new Map<string, OrphanGroup>();
  for (const sw of subWorks) {
    const workId = sw.work?.workId ?? null;
    if (workId !== null && present.has(workId)) continue;
    const key = workId === null ? "none" : String(workId);
    const group = groups.get(key) ?? {
      key,
      workId,
      title: sw.work?.title || (workId === null ? "미연결" : `업무 #${workId}`),
      subWorks: [],
    };
    group.subWorks.push(sw);
    groups.set(key, group);
  }
  return [...groups.values()];
}

/** 트리의 하위 업무 한 줄 — 상위 업무 아래와 상위가 빠진 묶음 아래가 같은 모양이다 */
function SubWorkTreeRow({ sw, onOpen }: Readonly<{ sw: SubWorkListItem; onOpen: () => void }>) {
  const badge = subWorkBadge(sw);
  return (
    /* 키보드 접근(#403) */
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full cursor-pointer items-center gap-2 text-left"
    >
      <Badge tone={badge.tone}>{badge.label}</Badge>
      <div className="min-w-0 truncate text-[14px] hover:text-accent">{sw.title}</div>
      <div className="flex-none text-[12.5px] text-n500">
        {WORK_STTS_NM[sw.workStatus]} · {sw.progressRate}%
      </div>
    </button>
  );
}

/** 상위 업무가 빠진 묶음의 제목 — 상태 배지 없이 흐리게, 누르면 그 업무 상세 */
function OrphanGroupTitle({
  title,
  workId,
  onOpen,
}: Readonly<{ title: string; workId: number; onOpen: (workId: number) => void }>) {
  return (
    <button
      type="button"
      onClick={() => onOpen(workId)}
      className="w-full cursor-pointer text-left text-[14px] text-n500 hover:text-accent"
    >
      {title}
    </button>
  );
}

export function OperationsHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  /*
   * 태그 하나 (#771). 주소에 남기지 않는 것은 업무·하위 업무·회의 목록의 태그 줄과 같다 — 보기
   * 방식(`?view=`)과 달리 링크로 건넬 일이 드물고, 남기면 태그를 지운 뒤 낡은 링크가 빈 화면을 연다.
   */
  const [tagId, setTagId] = useState<number | null>(null);
  const { data, status, errorMessage, reload } = useOperationsHub(tagId);
  const [tab, setTab] = useState<"전체" | OperTypeCd>("전체");

  /*
   * 고른 보기는 URL 쿼리에 둔다(`?view=달력`).
   *
   * localStorage를 쓰지 않는 것은 이 앱에 그 관행이 아직 없기도 하고, 무엇보다 URL에 있으면
   * **그 화면을 그대로 링크로 건넬 수 있기** 때문이다 — "이번 달 달력 좀 보세요"가 링크
   * 하나로 끝난다. 새로고침·뒤로가기에도 살아남는 것은 덤이다.
   */
  /*
   * 고른 보기는 URL 쿼리에 둔다(?view=주 · ?view=월).
   *
   * localStorage를 쓰지 않는 것은 이 앱에 그 관행이 없기도 하고, 무엇보다 URL에 있으면
   * **그 화면을 그대로 링크로 건넬 수 있기** 때문이다. 새로고침·뒤로가기에도 살아남는다.
   *
   * `달력`은 #243이 쓰던 옛 값이다 — 이미 공유된 링크가 깨지지 않게 월 보기로 받아 준다.
   */
  const rawView = searchParams.get("view");
  const view: ViewMode =
    rawView === "주" ? "주" : rawView === "월" || rawView === "달력" ? "월" : "리스트";
  const setView = (next: ViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "리스트") params.delete("view");
    else params.set("view", next);
    const qs = params.toString();
    // replace인 것은 보기 전환이 뒤로가기 기록을 쌓을 만한 이동이 아니기 때문이다
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  };
  const mode: CalendarMode = view === "주" ? "week" : "month";

  /*
   * 기준일은 todayInSeoul()이다. TODAY(2026-08-09)는 목 데이터용 고정 상수라 서버에서
   * 받아 온 값에 쓰면 조용히 틀린다(shared/lib/date.ts).
   */
  const today = todayInSeoul();
  const [anchor, setAnchor] = useState(today);
  const [selected, setSelected] = useState<string | null>(null);

  /** 한 주 또는 한 달씩 옮긴다 — 보고 있는 보기에 따라 걸음 폭이 갈린다 */
  const shift = (delta: number) => {
    setSelected(null);
    setAnchor((cur) => {
      const d = new Date(`${cur}T00:00:00Z`);
      if (mode === "week") d.setUTCDate(d.getUTCDate() + delta * 7);
      else d.setUTCMonth(d.getUTCMonth() + delta, 1);
      return d.toISOString().slice(0, 10);
    });
  };

  const rows: OperRow[] = [
    ...data.works.map(workRow),
    ...data.subWorks.map(subWorkRow),
    ...data.meetings.map(meetingRow),
  ];
  const filtered = rows.filter((r) => tab === "전체" || r.operTypeCd === tab);
  const orphanGroups = orphanGroupsOf(data.works, data.subWorks);
  const tagged = tagId !== null;

  /*
   * 보고 있는 범위를 여기서 계산해 화면 문구와 "이 범위 N건"에 함께 쓴다.
   * Calendar도 같은 규칙으로 범위를 잡으므로 둘이 어긋나지 않는다(월요일 시작).
   */
  const [rangeStart, rangeEnd] = visibleRange(mode, anchor);

  /*
   * 달력에 놓을 것과 놓지 못할 것을 가른다. 유형 탭이 그대로 걸리므로 두 보기가 같은 것을 본다.
   *
   * **겹치면 놓는다** — 시작이 범위 뒤가 아니고 끝이 범위 앞이 아니면 걸린다. #243은
   * "종료일이 이 달인가"만 봐서 범위를 가로지르는 업무가 통째로 빠졌다.
   *
   * 날짜가 없는 건을 오늘 칸에 몰아넣지 않는다 — 없는 날짜를 지어내는 것이 되고, 그러면
   * 달력이 거짓말을 한다. 대신 몇 건이 빠졌는지를 적어 사람이 알게 한다.
   */
  const undated = filtered.filter((r) => !r.start).length;
  const inRange = filtered.filter(
    (r) => r.start !== null && r.start <= rangeEnd && (r.end ?? r.start) >= rangeStart,
  );
  const calendarItems: CalendarItem[] = inRange.map((r) =>
    r.operTypeCd === "WORK"
      ? {
          kind: "span",
          key: r.key,
          title: r.ttl,
          tone: kindTone(r.operTypeCd),
          onClick: () => router.push(r.href),
          start: r.start as string,
          end: r.end,
        }
      : {
          kind: "point",
          key: r.key,
          title: r.ttl,
          tone: kindTone(r.operTypeCd),
          onClick: () => router.push(r.href),
          date: r.start as string,
        },
  );
  /** 고른 날에 걸치는 것 전부 — 막대는 그 날을 지나가기만 해도 걸린다 */
  const selectedRows = selected
    ? inRange.filter((r) => r.start! <= selected && (r.end ?? r.start!) >= selected)
    : [];
  const isCurrentRange = today >= rangeStart && today <= rangeEnd;
  /* 주는 걸친 달이 둘일 수 있어 "8월 31일 ~ 9월 6일"처럼 양끝을 적는다 */
  const rangeLabel =
    mode === "week"
      ? `${formatMd(rangeStart)} ~ ${formatMd(rangeEnd)}`
      : `${Number(anchor.slice(0, 4))}년 ${Number(anchor.slice(5, 7))}월`;

  const kindCards = [
    {
      cd: "WORK" as const,
      count: data.works.length,
      note: "행사·상시·정례 운영처럼 여러 하위 업무를 묶는 단위",
      href: ROUTES.works,
    },
    {
      cd: "SUB_WORK" as const,
      count: data.subWorks.length,
      note: "실제로 하는 일 하나. 상태·승인·점검 목록이 여기에 있습니다",
      href: ROUTES.subWorks,
    },
    {
      cd: "MEETING" as const,
      count: data.meetings.length,
      note: "정례·주제 회의. 안건과 결과를 기록합니다",
      href: ROUTES.meetings,
    },
  ];

  return (
    <>
      <PageHeader title="운영 통합" subtitle="업무·하위 업무·회의를 한 화면에서" />
      <PageBody>
        {/* 태그 줄 (#771) — 세 배열을 함께 거르므로 유형 카드·리스트·트리가 모두 따른다 */}
        <OperationTagFilter tagId={tagId} onChange={setTagId} className="mb-[14px]" />

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
                <div className="mb-[14px] flex flex-wrap items-center gap-[7px] lg:flex-nowrap">
                  {KIND_TABS.map((t) => (
                    <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
                      {t === "전체" ? "전체" : OPER_TYPE_NM[t]}
                    </Chip>
                  ))}
                  <div className="flex-1" />
                  <div className="text-[13.5px] text-n500">
                    {filtered.length}건 · 전체 {rows.length}건
                  </div>
                  {/* 유형 탭과 나란히 둔다 — 탭은 무엇을 볼지, 이쪽은 어떻게 볼지다 */}
                  <Segmented
                    label="운영 통합 보기 방식"
                    options={VIEWS}
                    value={view}
                    onChange={setView}
                    className="w-full lg:w-[160px]"
                  />
                </div>
                {view !== "리스트" ? (
                  <>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => shift(-1)}
                        aria-label={mode === "week" ? "이전 주" : "이전 달"}
                        className="cursor-pointer rounded-[9px] border border-line px-[10px] py-1 text-[14px] text-n400 hover:text-n300"
                      >
                        ‹
                      </button>
                      <div className="text-[15px] font-semibold">{rangeLabel}</div>
                      <button
                        type="button"
                        onClick={() => shift(1)}
                        aria-label={mode === "week" ? "다음 주" : "다음 달"}
                        className="cursor-pointer rounded-[9px] border border-line px-[10px] py-1 text-[14px] text-n400 hover:text-n300"
                      >
                        ›
                      </button>
                      {!isCurrentRange && (
                        /* 멀리 넘긴 뒤 돌아올 길이 ‹ › 연타뿐이면 안 된다 */
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(null);
                            setAnchor(today);
                          }}
                          className="cursor-pointer rounded-[9px] border border-line px-[10px] py-1 text-[13.5px] text-n400 hover:text-n300"
                        >
                          오늘
                        </button>
                      )}
                      <div className="flex-1" />
                      <div className="text-[13.5px] text-n500">{inRange.length}건</div>
                    </div>

                    <Calendar
                      mode={mode}
                      anchor={anchor}
                      items={calendarItems}
                      today={today}
                      selected={selected}
                      onSelect={(ymd) => setSelected(ymd === selected ? null : ymd)}
                    />

                    <div className="mt-[10px] text-[13px] text-n500">{CALENDAR_NOTE}</div>
                    {undated > 0 && (
                      /* 날짜가 없는 건은 달력에 놓지 않는다 — 있다는 사실만 알린다 */
                      <div className="mt-[2px] text-[13px] text-n500">
                        일시가 없어 달력에 놓이지 않은 건 {undated}건 — 리스트에서 볼 수 있습니다
                      </div>
                    )}

                    {selected !== null && (
                      /* 칸이 "+N건"으로 접히므로, 고른 날의 전부를 여기서 펼친다 */
                      <div className="mt-4">
                        <SectionLabel className="mb-2">
                          {Number(selected.slice(5, 7))}월 {Number(selected.slice(8, 10))}일 ·{" "}
                          {selectedRows.length}건
                        </SectionLabel>
                        {selectedRows.length === 0 ? (
                          <div className="text-[13.5px] text-n500">이 날에는 운영 건이 없습니다</div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {selectedRows.map((r) => (
                              /* 키보드 접근(#403) */
                              <button
                                type="button"
                                key={r.key}
                                onClick={() => router.push(r.href)}
                                className="flex w-full cursor-pointer items-center gap-2 text-left"
                              >
                                <Badge tone={kindTone(r.operTypeCd)}>
                                  {OPER_TYPE_NM[r.operTypeCd]}
                                </Badge>
                                <div className="min-w-0 truncate text-[14px] hover:text-accent">
                                  {r.ttl}
                                </div>
                                <div className="flex-none text-[12.5px] text-n500">{r.pic}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : filtered.length === 0 ? (
                  <EmptyState
                    message={tagged ? "조건에 맞는 운영 건이 없습니다" : "표시할 운영 건이 없습니다"}
                    action={tagged ? { label: "태그 해제", onClick: () => setTagId(null) } : undefined}
                  />
                ) : (
                  /*
                   * 이 표는 GridTable이 아니라 손으로 짠 CSS 그리드다(제목 칸이 두 줄이고
                   * 행 클릭이 제목 칸에만 걸려 있어 공용 컴포넌트로 옮기면 데스크톱 모양이
                   * 달라진다). 그래서 GridTable(#85)이 쓴 방법을 여기서 되풀이한다 —
                   * lg 미만에서는 행 래퍼의 display: contents를 풀어 카드 한 장으로 만들고,
                   * 머리글 행은 감춘다. lg 이상에서는 lg:contents로 되돌아가 지금까지와
                   * 똑같은 네 열 표가 된다.
                   */
                  <div className="grid grid-cols-1 gap-2 lg:grid-cols-[.9fr_2fr_1.1fr_.9fr] lg:gap-0">
                    {[FIELD_LABEL.operationType, "제목", "일시", "담당자"].map((h) => (
                      <div
                        key={h}
                        className="hidden pb-[10px] text-[13px] tracking-[.3px] text-n500 lg:block"
                      >
                        {h}
                      </div>
                    ))}
                    {filtered.map((r) => (
                      <div
                        key={r.key}
                        className="flex flex-wrap items-center gap-x-3 rounded-xl border border-line bg-surface p-3 lg:contents"
                      >
                        <div className="lg:border-t lg:border-hairline lg:py-3">
                          <Badge tone={kindTone(r.operTypeCd)}>
                            {OPER_TYPE_NM[r.operTypeCd]}
                          </Badge>
                        </div>
                        {/*
                          키보드 접근(#403) — lg에서는 grid 항목이라 늘어난 높이에서 내용이
                          가운데로 몰리지 않게 content-start
                        */}
                        <button
                          type="button"
                          onClick={() => router.push(r.href)}
                          className="mt-2 w-full min-w-0 cursor-pointer content-start text-left lg:mt-0 lg:w-auto lg:border-t lg:border-hairline lg:py-3 lg:pr-3"
                        >
                          {/* 카드에서는 truncate를 풀어 줄바꿈시킨다 — 275px에서 자르면 제목이 거의 남지 않는다 */}
                          <div className="text-[15px] font-semibold hover:text-accent lg:truncate">
                            {r.ttl}
                          </div>
                          <div className="mt-[2px] text-[13.5px] text-n500 lg:truncate">
                            {r.ext}
                          </div>
                          <OperationTagPills tags={r.tags} className="mt-1 flex flex-wrap gap-1" />
                        </button>
                        <div className="mt-2 text-[14px] text-n400 lg:mt-0 lg:border-t lg:border-hairline lg:py-3">
                          {r.date}
                        </div>
                        <div className="mt-2 text-[14px] text-n400 lg:mt-0 lg:border-t lg:border-hairline lg:py-3">
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
                  {data.works.length === 0 && orphanGroups.length === 0 && (
                    <div className="text-[13.5px] text-n500">
                      {tagged ? "조건에 맞는 업무가 없습니다" : "등록된 업무가 없습니다"}
                    </div>
                  )}
                  {data.works.map((w) => (
                    <div key={w.workId}>
                      {/* 키보드 접근(#403) */}
                      <button
                        type="button"
                        onClick={() => router.push(ROUTES.workDetail(w.workId))}
                        className="flex w-full cursor-pointer items-center gap-2 text-left"
                      >
                        <Badge tone={workSttsTone(w.workStatus)}>
                          {WORK_STTS_NM[w.workStatus]}
                        </Badge>
                        <div className="text-[15px] font-semibold hover:text-accent">
                          {w.title}
                        </div>
                      </button>
                      <div className="mt-2 flex flex-col gap-2 border-l border-line pl-[14px]">
                        {data.subWorks
                          .filter((sw) => sw.work?.workId === w.workId)
                          .map((sw) => (
                            <SubWorkTreeRow
                              key={sw.subWorkId}
                              sw={sw}
                              onOpen={() => router.push(ROUTES.subWorkDetail(sw.subWorkId))}
                            />
                          ))}
                      </div>
                    </div>
                  ))}
                  {/*
                    상위 업무가 결과에 없는 하위 업무 (#771) — 태그로 거르면 생긴다. 묶음 제목은
                    응답이 준 상위 업무 이름이고, 상태 배지 없이 흐리게 그려 그 업무는 결과에 없다는
                    것을 보인다. 누르면 그 업무 상세로 간다(id가 없으면 누를 곳이 없다).
                  */}
                  {orphanGroups.map((g) => (
                    <div key={`orphan-${g.key}`}>
                      {g.workId === null ? (
                        <div className="text-[14px] text-n500">{g.title}</div>
                      ) : (
                        <OrphanGroupTitle
                          title={g.title}
                          workId={g.workId}
                          onOpen={(workId) => router.push(ROUTES.workDetail(workId))}
                        />
                      )}
                      <div className="mt-2 flex flex-col gap-2 border-l border-dashed border-line pl-[14px]">
                        {g.subWorks.map((sw) => (
                          <SubWorkTreeRow
                            key={sw.subWorkId}
                            sw={sw}
                            onOpen={() => router.push(ROUTES.subWorkDetail(sw.subWorkId))}
                          />
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="h-px bg-gradient-to-r from-transparent via-line to-transparent" />
                  <SectionLabel>회의</SectionLabel>
                  {data.meetings.length === 0 && (
                    <div className="text-[13.5px] text-n500">
                      {tagged ? "조건에 맞는 회의가 없습니다" : "등록된 회의가 없습니다"}
                    </div>
                  )}
                  {data.meetings.map((m) => (
                    /* 키보드 접근(#403) */
                    <button
                      type="button"
                      key={m.meetingId}
                      onClick={() => router.push(ROUTES.meetingDetail(m.meetingId))}
                      className="flex w-full cursor-pointer items-center gap-2 text-left"
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
                    </button>
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
