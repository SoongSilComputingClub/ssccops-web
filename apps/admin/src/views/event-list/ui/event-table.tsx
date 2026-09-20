"use client";

import { useRouter } from "next/navigation";
import {
  EVENT_PHASE_BADGE,
  EVENT_RECEIPT_BADGE,
  eventSttsBadge,
  type EventSummary,
} from "@/entities/event";
import { NO_EVENT_DELETE } from "@/features/event";
import { ROUTES } from "@/shared/config/routes";
import { formatDt, formatYmd } from "@/shared/lib/date";
import { Badge, Button, GridTable, Pill, type GridColumn } from "@/shared/ui";

/*
 * 행사 목록의 리스트 보기 (#569 · ssccops#424) — 카드와 같은 데이터를 `GridTable` 한 장으로.
 *
 * 카드가 한 건을 읽는 모양이라면 표는 여러 건을 **훑는** 모양이다 — 상태·일시·정원이 열로 정렬돼
 * «이번 달에 뭐가 있고 어디가 비었나»가 한눈에 온다. lg 미만에서는 GridTable 이 스스로 카드로
 * 접으므로(#85) 좁은 화면에서 표가 깨지는 일은 없다.
 *
 * **행 클릭(`onRowClick`)을 걸지 않는다.** 셀 안에 수정·참가자·삭제 버튼이 드는데 행 클릭까지
 * 걸면 버튼을 누른 클릭이 행으로 번져 두 화면이 동시에 열린다. 제목 셀이 카드와 같이 수정 화면의
 * 버튼이다. **복제는 여기 없다** — 두 단계 확인과 «신청서 사본도 함께 생깁니다» 안내가 표 한
 * 줄에 들어가지 않는다. 복제하려면 카드 보기로.
 */
export function EventTable({
  events,
  canManage,
  canDelete,
  deletingEventId,
  onDelete,
  noManage,
}: Readonly<{
  events: EventSummary[];
  canManage: boolean;
  canDelete: boolean;
  deletingEventId: number | null;
  onDelete: (event: EventSummary) => void;
  /** 권한 없을 때 버튼 title — 카드와 같은 문장을 쓴다 */
  noManage: string;
}>) {
  const router = useRouter();

  const columns: GridColumn<EventSummary>[] = [
    {
      key: "stts",
      header: "상태",
      width: "150px",
      mobileHide: true,
      render: (e) => {
        const stts = eventSttsBadge(e.eventSttsCd);
        const phase = e.eventPhase === "NONE" ? null : EVENT_PHASE_BADGE[e.eventPhase];
        return (
          <span className="inline-flex gap-1">
            <Badge tone={stts.tone}>{stts.label}</Badge>
            {phase && <Badge tone={phase.tone}>{phase.label}</Badge>}
          </span>
        );
      },
    },
    {
      key: "title",
      header: "제목",
      width: "2fr",
      mobilePrimary: true,
      render: (e) => (
        <button
          type="button"
          onClick={() => router.push(ROUTES.eventEdit(e.eventId))}
          className="max-w-full cursor-pointer truncate text-left font-semibold hover:text-accent"
          title={e.eventTtl}
        >
          {e.eventTtl}
        </button>
      ),
    },
    {
      key: "clsf",
      header: "분류",
      width: "110px",
      render: (e) => <Pill tone="blue">{e.eventClsfNm}</Pill>,
    },
    {
      key: "when",
      header: "일시",
      width: "1.4fr",
      render: (e) => (
        <span className="text-n400">
          {e.eventBgngDt ? formatDt(e.eventBgngDt) : "미설정"}
          {e.eventBgngDt && e.eventEndDt && ` ~ ${formatDt(e.eventEndDt)}`}
        </span>
      ),
    },
    {
      key: "place",
      header: "장소",
      width: ".9fr",
      render: (e) => <span className="text-n400">{e.plcNm ?? "—"}</span>,
    },
    {
      key: "receipt",
      header: "모집",
      width: "90px",
      render: (e) => {
        /* 폼 미연결(공지형)이면 모집 배지 대신 그 사실을 — 카드의 «폼 없음 · 공지형»과 같은 뜻 */
        if (e.receiptStatus === null) return <span className="text-[13px] text-n500">공지형</span>;
        const r = EVENT_RECEIPT_BADGE[e.receiptStatus];
        return <Badge tone={r.tone}>{r.label}</Badge>;
      },
    },
    {
      key: "count",
      header: "확정",
      width: "80px",
      align: "right",
      render: (e) => (
        <span>
          {e.confirmedCount}
          {e.ptcpLmtCnt != null && <span className="text-n500">/{e.ptcpLmtCnt}</span>}
        </span>
      ),
    },
    {
      key: "mdfcn",
      header: "수정",
      width: "100px",
      mobileHide: true,
      render: (e) => <span className="text-[13.5px] text-n500">{formatYmd(e.mdfcnDt)}</span>,
    },
    {
      key: "actions",
      header: "",
      width: "190px",
      align: "right",
      render: (e) => (
        <span className="inline-flex items-center gap-3 text-[14px]">
          <Button
            variant="link"
            disabled={!canManage}
            title={canManage ? undefined : noManage}
            onClick={() => router.push(ROUTES.eventEdit(e.eventId))}
          >
            수정
          </Button>
          <Button
            variant="link"
            disabled={!canManage}
            title={canManage ? undefined : noManage}
            onClick={() => router.push(ROUTES.eventParticipants(e.eventId))}
          >
            참가자
          </Button>
          <Button
            variant="link-danger"
            disabled={deletingEventId === e.eventId || !canDelete}
            title={canDelete ? undefined : NO_EVENT_DELETE}
            onClick={() => onDelete(e)}
          >
            {deletingEventId === e.eventId ? "지우는 중…" : "삭제"}
          </Button>
        </span>
      ),
    },
  ];

  return <GridTable columns={columns} rows={events} rowKey={(e) => String(e.eventId)} dense />;
}
