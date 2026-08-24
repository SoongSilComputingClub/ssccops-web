"use client";

import { useState } from "react";
import { PTCP_STTS_BADGE, type EventParticipant } from "@/entities/event";
import type { EventParticipants, ParticipantActions } from "@/features/event";
import { PTCP_STTS_CDS, PTCP_STTS_NM, type PtcpSttsCd } from "@/shared/config/codes";
import { FIELD_LABEL } from "@/shared/config/labels";
import { formatDt } from "@/shared/lib/date";
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  GridTable,
  Sheet,
  type GridColumn,
} from "@/shared/ui";

/*
 * 참가자 명단 탭 (#145 · GET · PATCH /v1/events/{eventId}/participants).
 *
 * ── 순번은 저장된 값이 아니다 ─────────────────────────────────
 * 서버가 등록순으로 내려주는 목록을 세는 것뿐이고(D5 — 대기 순번은 신청자에게 비공개이나
 * 운영 화면에는 신청 순서를 참고용으로 보인다), 그래서 필터를 걸면 그 안에서 다시 1부터
 * 시작한다. 대기만 걸어 보면 그것이 곧 대기 순서다. 값을 만들어 명단에 심지 않는 것은
 * 서버에 그런 컬럼이 없기 때문이다 — 있는 척하면 취소가 한 줄 끼는 순간 어긋난다.
 *
 * ── 지우는 버튼이 없다 ────────────────────────────────────────
 * 명단은 활동 이력으로 영구 보존한다(D16). 취소도 행을 지우지 않고 상태만 옮기므로 취소된
 * 줄은 필터에서 계속 보인다 — '전체'에도 남는다.
 */

const ALL = "전체";

/** 지금 상태에서 갈 수 있는 곳 하나 (전이표의 판정 자체는 서버가 한다) */
const NEXT_STATUS: Partial<
  Record<PtcpSttsCd, { to: PtcpSttsCd; label: string; danger?: boolean }>
> = {
  WAITLISTED: { to: "CONFIRMED", label: "확정으로 올리기" },
  CONFIRMED: { to: "CANCELLED", label: "참가 취소", danger: true },
  /* 취소는 되돌리는 전이가 계약에 없다 — 다시 넣으려면 새로 등록한다 */
};

export function RosterPanel({
  event,
  roster,
  ptcpSttsCd,
  onFilter,
  canManage,
  lockedHint,
  actions,
  onTransition,
  onManualAdd,
}: {
  event: { ptcpLmtCnt: number | null; confirmedCount: number };
  roster: EventParticipants;
  ptcpSttsCd: PtcpSttsCd | null;
  onFilter: (value: PtcpSttsCd | null) => void;
  canManage: boolean;
  lockedHint: string;
  actions: ParticipantActions;
  onTransition: (participant: EventParticipant, to: PtcpSttsCd) => void;
  onManualAdd: () => void;
}) {
  /* 취소는 되돌릴 수 없는 전이라 확인을 받는다 — 승격은 다시 취소할 수 있어 묻지 않는다 */
  const [cancelTarget, setCancelTarget] = useState<EventParticipant | null>(null);

  const columns: GridColumn<EventParticipant>[] = [
    {
      key: "seq",
      header: "순번",
      width: "60px",
      /* 카드에서는 세로로 쌓여 자리만 차지한다 — 제목 옆에 이름이 이미 있다 */
      mobileHide: true,
      render: (_p, index) => <span className="text-n500">{index + 1}</span>,
    },
    {
      key: "mbrNm",
      header: FIELD_LABEL.memberName,
      width: "1fr",
      mobilePrimary: true,
      render: (p) => <span className="font-semibold">{p.mbrNm || "-"}</span>,
    },
    {
      key: "stdntNo",
      header: FIELD_LABEL.studentNumber,
      width: ".9fr",
      render: (p) => p.stdntNo || "-",
    },
    {
      key: "source",
      header: "등록 경로",
      width: ".9fr",
      mobileHide: true,
      /* 근거가 된 응답이 있으면 신청, 없으면 운영자가 직접 올린 줄이다 */
      render: (p) => (p.formRspnsId === null ? "직접 추가" : "신청"),
    },
    {
      key: "crtDt",
      header: "등록 일시",
      width: "1fr",
      render: (p) => formatDt(p.crtDt) || "-",
    },
    {
      key: "ptcpSttsCd",
      header: "참가 상태",
      width: "100px",
      render: (p) => {
        const badge = PTCP_STTS_BADGE[p.ptcpSttsCd];
        return <Badge tone={badge.tone}>{badge.label}</Badge>;
      },
    },
    {
      key: "action",
      header: "조작",
      width: "150px",
      render: (p) => {
        const next = NEXT_STATUS[p.ptcpSttsCd];
        if (!next) return <span className="text-[13px] text-n500">-</span>;
        return (
          <Button
            variant={next.danger ? "ghost-danger" : "primary"}
            size="sm"
            disabled={!canManage || actions.pending}
            title={canManage ? undefined : lockedHint}
            onClick={() =>
              next.danger ? setCancelTarget(p) : onTransition(p, next.to)
            }
          >
            {next.label}
          </Button>
        );
      },
    },
  ];

  return (
    <>
      <div className="mb-[6px] flex flex-wrap items-center gap-[7px]">
        <Chip active={ptcpSttsCd === null} onClick={() => onFilter(null)}>
          {ALL}
        </Chip>
        {PTCP_STTS_CDS.map((cd) => (
          <Chip key={cd} active={ptcpSttsCd === cd} onClick={() => onFilter(cd)}>
            {PTCP_STTS_NM[cd]}
          </Chip>
        ))}
        <div className="flex-1" />
        <div className="text-[14px] text-n500">
          {roster.status === "ready" ? `${roster.participants.length}명` : ""}
        </div>
        <Button
          size="sm"
          variant="ghost"
          disabled={!canManage || actions.pending}
          title={canManage ? undefined : lockedHint}
          onClick={onManualAdd}
        >
          + 회원 직접 추가
        </Button>
      </div>

      <div className="mb-[14px] text-[13px] leading-[1.7] text-n500">
        순번은 지금 보이는 목록의 등록 순서입니다 — 신청자에게는 보이지 않습니다. 취소한
        참가자도 기록으로 남으며 명단에서 지워지지 않습니다.
      </div>

      {roster.status === "error" ? (
        <EmptyState
          message={roster.errorMessage || "참가자 명단을 불러오지 못했습니다."}
          action={{ label: "다시 시도", onClick: roster.reload }}
        />
      ) : (
        <Card className="px-5 pt-4 pb-[6px]">
          <GridTable
            columns={columns}
            rows={roster.status === "ready" ? roster.participants : []}
            rowKey={(p) => String(p.eventPtcpId)}
            dense
            empty={
              <EmptyState
                padding="sm"
                message={
                  roster.status === "loading"
                    ? "불러오는 중…"
                    : ptcpSttsCd
                      ? "해당 상태의 참가자가 없습니다."
                      : "아직 명단에 올린 참가자가 없습니다."
                }
              />
            }
          />
        </Card>
      )}

      <Sheet
        open={cancelTarget !== null}
        title="참가 취소"
        hint={
          event.ptcpLmtCnt === null
            ? "취소하면 확정 인원에서 빠지고 명단에는 취소로 남습니다. 되돌리려면 다시 등록해야 합니다."
            : `취소하면 확정 인원에서 빠지고 명단에는 취소로 남습니다 (현재 확정 ${event.confirmedCount}명 · 정원 ${event.ptcpLmtCnt}명). 되돌리려면 다시 등록해야 합니다.`
        }
        onClose={() => setCancelTarget(null)}
        okLabel="참가 취소"
        onOk={() => {
          const target = cancelTarget;
          setCancelTarget(null);
          if (target) onTransition(target, "CANCELLED");
        }}
      >
        {cancelTarget && (
          <div className="text-[15px]">
            {cancelTarget.mbrNm || "이름 없음"}
            {cancelTarget.stdntNo && ` · ${cancelTarget.stdntNo}`}
          </div>
        )}
      </Sheet>
    </>
  );
}
