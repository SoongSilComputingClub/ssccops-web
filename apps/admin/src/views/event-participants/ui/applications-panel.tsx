"use client";

import { useRouter } from "next/navigation";
import { mbrGrdNm, mbrSttsNm } from "@/entities/member";
import { RSPNS_STTS_BADGE, type FormResponseItem } from "@/entities/response";
import { useEventApplications, type ParticipantActions } from "@/features/event";
import {
  RSPNS_RVW_STTS_CDS,
  PTCP_RGST_STTS_CDS,
  PTCP_STTS_NM,
  type PtcpSttsCd,
  type RspnsSttsCd,
} from "@/shared/config/codes";
import { FIELD_LABEL } from "@/shared/config/labels";
import { ROUTES } from "@/shared/config/routes";
import { formatDt } from "@/shared/lib/date";
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  GridTable,
  type GridColumn,
} from "@/shared/ui";

/*
 * 신청 목록 탭 (#145 · GET /v1/events/{eventId}/applications).
 *
 * ── 심사 화면을 새로 만들지 않는다 ────────────────────────────
 * 수락·거절은 폼 응답 검토가 이미 하는 일이고 서버도 행사 경유 심사 엔드포인트를 만들지
 * 않았다(ssccops-server#158). 그래서 이름을 누르면 **기존 응답 상세**로 보낸다 — 검토는
 * 결론과 검토 의견을 함께 남기는 한 번의 조작이고(#133), 무엇을 고치라고 적을지 볼 수 없는
 * 목록에서 사유를 쓰게 하면 "확인 바랍니다" 같은 빈 문장이 이력에 남는다.
 *
 * ── 이미 등록된 신청을 미리 잠그지 않는다 ─────────────────────
 * 명단은 상태 필터가 걸린 채로 조회되므로, 화면이 들고 있는 명단만으로는 "이 응답이 이미
 * 올라갔는가"를 답할 수 없다(취소된 줄도 같은 회원이다). 판정 근거는 서버이며 중복은 409
 * EVENT_PARTICIPANT_DUPLICATED로 온다 — 그 문구가 다음 행동까지 말한다.
 */

const ALL = "전체";

export function ApplicationsPanel({
  eventId,
  formId,
  rspnsSttsCd,
  onFilter,
  canManage,
  lockedHint,
  actions,
  onRegister,
}: {
  eventId: number;
  /** 연결된 폼 — 응답 상세로 가는 경로에 필요하다. 폼 미연결이면 null */
  formId: number | null;
  rspnsSttsCd: RspnsSttsCd | null;
  onFilter: (value: RspnsSttsCd | null) => void;
  canManage: boolean;
  lockedHint: string;
  actions: ParticipantActions;
  /** 등록 요청 — 성공·실패 처리는 화면 전체를 쥔 쪽(페이지)이 한다 */
  onRegister: (formRspnsId: number, ptcpSttsCd: PtcpSttsCd) => void;
}) {
  const router = useRouter();
  const { applications, status, errorMessage, reload } = useEventApplications(
    eventId,
    rspnsSttsCd,
  );

  if (status === "no-form") {
    return (
      <Card>
        <EmptyState
          message={
            <>
              <div>연결된 폼이 없습니다.</div>
              <div className="mt-2 text-[14px]">
                신청을 받으려면 행사 수정에서 신청 폼을 먼저 연결해주세요 — 폼 없는 행사도
                참가자 명단에서 회원을 직접 추가할 수 있습니다.
              </div>
            </>
          }
          action={{
            label: "행사 수정",
            onClick: () => router.push(ROUTES.eventEdit(eventId)),
          }}
        />
      </Card>
    );
  }

  const columns: GridColumn<FormResponseItem>[] = [
    {
      key: "mbrNm",
      header: FIELD_LABEL.memberName,
      width: "1fr",
      render: (r) =>
        /* 심사는 응답 상세에서 한다 — 폼을 모르면 그 주소를 만들 수 없다(계약상 오지 않는다) */
        formId === null ? (
          <span>{r.member.mbrNm || "-"}</span>
        ) : (
          <span
            onClick={() => router.push(ROUTES.responseDetail(formId, r.formRspnsId))}
            className="cursor-pointer font-semibold hover:text-accent"
          >
            {r.member.mbrNm || "-"}
          </span>
        ),
    },
    {
      key: "stdntNo",
      header: FIELD_LABEL.studentNumber,
      width: ".9fr",
      render: (r) => r.member.stdntNo || "-",
    },
    {
      key: "meta",
      header: "등급 · 상태",
      width: "1.1fr",
      mobileHide: true,
      render: (r) => `${mbrGrdNm(r.member.mbrGrdCd)} · ${mbrSttsNm(r.member.mbrSttsCd)}`,
    },
    {
      key: "sbmsnDt",
      header: FIELD_LABEL.submittedAt,
      width: "1fr",
      render: (r) => formatDt(r.sbmsnDt) || "-",
    },
    {
      key: "rspnsSttsCd",
      header: FIELD_LABEL.responseStatus,
      width: "110px",
      render: (r) => {
        const badge = RSPNS_STTS_BADGE[r.rspnsSttsCd];
        return <Badge tone={badge.tone}>{badge.label}</Badge>;
      },
    },
    {
      key: "register",
      header: "명단 등록",
      width: "190px",
      render: (r) => {
        /*
         * 승인된 신청만 명단에 올릴 수 있다 — 계약이 그렇고(ACCEPTED가 아니면 서버가 거절),
         * 심사 전에 올릴 수 있게 두면 심사라는 단계 자체가 있으나 마나 해진다.
         * 잠그는 대신 안내를 두는 것은 이 자리가 '권한'이 아니라 '선행 조건'이기 때문이다.
         */
        if (r.rspnsSttsCd !== "ACCEPTED") {
          return <span className="text-[13px] text-n500">심사 후 등록</span>;
        }
        return (
          <div className="flex gap-[6px]">
            {PTCP_RGST_STTS_CDS.map((cd) => (
              <Button
                key={cd}
                variant={cd === "CONFIRMED" ? "primary" : "ghost"}
                size="sm"
                disabled={!canManage || actions.pending}
                title={canManage ? undefined : lockedHint}
                onClick={() => onRegister(r.formRspnsId, cd)}
              >
                {PTCP_STTS_NM[cd]}
              </Button>
            ))}
          </div>
        );
      },
    },
  ];

  return (
    <>
      {/* 상태 축은 응답 심사 상태다 — 참가 상태(확정·대기)와 다른 축이라 탭마다 따로 둔다 */}
      <div className="mb-[6px] flex flex-wrap items-center gap-[7px]">
        <Chip active={rspnsSttsCd === null} onClick={() => onFilter(null)}>
          {ALL}
        </Chip>
        {RSPNS_RVW_STTS_CDS.map((cd) => (
          <Chip key={cd} active={rspnsSttsCd === cd} onClick={() => onFilter(cd)}>
            {RSPNS_STTS_BADGE[cd].label}
          </Chip>
        ))}
        <div className="flex-1" />
        {/* 건수는 서버가 걸러 준 결과 그대로 — 화면에서 다시 세지 않는다 */}
        <div className="text-[14px] text-n500">
          {status === "ready" ? `${applications.length}건` : ""}
        </div>
      </div>

      <div className="mb-[14px] text-[13px] leading-[1.7] text-n500">
        심사(승인·수정요청·반려)는 이름을 눌러 응답 상세에서 합니다. 승인된 신청만 명단에
        올릴 수 있습니다.
      </div>

      {status === "error" ? (
        <EmptyState
          message={errorMessage || "신청 목록을 불러오지 못했습니다."}
          action={{ label: "다시 시도", onClick: reload }}
        />
      ) : (
        <Card className="px-5 pt-4 pb-[6px]">
          <GridTable
            columns={columns}
            rows={status === "ready" ? applications : []}
            rowKey={(r) => String(r.formRspnsId)}
            dense
            empty={
              <EmptyState
                padding="sm"
                message={
                  status === "loading"
                    ? "불러오는 중…"
                    : rspnsSttsCd
                      ? "해당 상태의 신청이 없습니다."
                      : "아직 들어온 신청이 없습니다."
                }
              />
            }
          />
        </Card>
      )}
    </>
  );
}
