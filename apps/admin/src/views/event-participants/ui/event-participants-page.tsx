"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  EventDetail,
  EventParticipant,
  EventParticipantRegistration,
} from "@/entities/event";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import {
  useEventDetail,
  useEventParticipants,
  useParticipantActions,
  type ParticipantActionResult,
} from "@/features/event";
import {
  PTCP_STTS_CDS,
  RSPNS_STTS_CDS,
  type PtcpSttsCd,
  type RspnsSttsCd,
} from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import {
  Card,
  EmptyState,
  PageBody,
  PageHeader,
  Segmented,
  StatBox,
  flash,
} from "@/shared/ui";
import { ApplicationsPanel } from "./applications-panel";
import { ManualRegisterSheet } from "./manual-register-sheet";
import { RegistrationNotice, hasNotice } from "./registration-notice";
import { RosterPanel } from "./roster-panel";

/*
 * 행사 신청 심사·참가자 관리 (#145 · 서버 ssccops-server#158).
 *
 * 운영자의 일이 두 단계라 탭도 둘이다 — **신청 목록**(연결 폼의 응답을 보고 심사한다)과
 * **참가자 명단**(승인된 신청을 확정·대기로 올리고, 승격·취소로 운영한다). 한 화면에 세로로
 * 쌓지 않은 것은 두 목록이 각자 상태 필터를 갖고 수십 줄까지 길어져, 아래 목록을 보려면
 * 위 목록을 다 지나야 하기 때문이다.
 *
 * 탭·필터는 컴포넌트 state가 아니라 URL 쿼리스트링에 둔다(응답 목록·행사 목록과 같은 방식) —
 * 심사는 목록↔응답 상세를 수십 번 오가는 작업이라, state로 들고 있으면 돌아올 때마다 탭이
 * 신청 목록으로 리셋된다.
 *
 * 등록·전이가 끝나면 **명단과 행사 상세를 함께 다시 부른다.** 확정 인원(confirmedCount)은
 * 행사 상세가 들고 있는 서버 집계라 명단만 갈아 끼우면 머리말의 수가 옛것으로 남는다
 * (AGENTS.md — 화면이 그리는 다른 값까지 함께 움직이면 통째로 다시 부른다).
 */

const NO_MANAGE = "행사를 다룰 권한이 없습니다 — 행사 관리(EVENT_MANAGE) 권한이 필요합니다";

const TAB_APPLICATIONS = "신청 목록";
const TAB_ROSTER = "참가자 명단";
const TABS = [TAB_APPLICATIONS, TAB_ROSTER] as const;

const QUERY_TAB = "tab";
/** 신청 목록의 응답 상태 — 이름을 응답 목록 화면과 맞춰 URL만 보고도 같은 조회임을 알게 한다 */
const QUERY_RSPNS_STTS = "statusCode";
/** 명단의 참가 상태 — 서버 쿼리 이름 그대로다 */
const QUERY_PTCP_STTS = "ptcpSttsCd";

/** URL은 사용자가 손으로 고칠 수 있다 — 모르는 값은 필터 없음으로 떨어뜨린다 */
function parseRspnsSttsCd(value: string | null): RspnsSttsCd | null {
  return value && RSPNS_STTS_CDS.includes(value as RspnsSttsCd)
    ? (value as RspnsSttsCd)
    : null;
}

function parsePtcpSttsCd(value: string | null): PtcpSttsCd | null {
  return value && PTCP_STTS_CDS.includes(value as PtcpSttsCd)
    ? (value as PtcpSttsCd)
    : null;
}

export function EventParticipantsPage({ eventId }: { eventId: number }) {
  const router = useRouter();
  const { event, status, errorMessage, reload } = useEventDetail(eventId);
  const canManage = useCan(CAPABILITY.EVENT_MANAGE);

  if (status !== "ready" || !event) {
    return (
      <>
        <PageHeader title="신청 · 참가자" showBack />
        <PageBody>
          {status === "loading" && (
            <Card className="animate-pulse">
              <div className="h-[22px] w-2/5 rounded bg-black/5" />
              <div className="mt-4 h-[160px] w-full rounded bg-black/5" />
            </Card>
          )}
          {status === "not-found" && (
            <EmptyState
              message="행사를 찾을 수 없습니다 — 이미 삭제된 행사일 수 있습니다."
              action={{ label: "행사 목록", onClick: () => router.replace(ROUTES.events) }}
            />
          )}
          {status !== "loading" && status !== "not-found" && (
            <EmptyState
              message={errorMessage || "행사를 불러오지 못했습니다."}
              action={{ label: "다시 시도", onClick: reload }}
            />
          )}
        </PageBody>
      </>
    );
  }

  return (
    <EventParticipantsView
      event={event}
      canManage={canManage}
      reloadEvent={reload}
    />
  );
}

/* 행사 상세가 도착한 뒤에야 마운트되는 본문 — 정원·연결 폼을 모르면 그릴 수 없는 것이 많다 */
function EventParticipantsView({
  event,
  canManage,
  reloadEvent,
}: {
  event: EventDetail;
  canManage: boolean;
  reloadEvent: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab = searchParams.get(QUERY_TAB) === "roster" ? TAB_ROSTER : TAB_APPLICATIONS;
  const rspnsSttsCd = parseRspnsSttsCd(searchParams.get(QUERY_RSPNS_STTS));
  const ptcpSttsCd = parsePtcpSttsCd(searchParams.get(QUERY_PTCP_STTS));

  const roster = useEventParticipants(event.eventId, ptcpSttsCd);
  const actions = useParticipantActions();

  const [notice, setNotice] = useState<EventParticipantRegistration | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  /** 누른 축만 바꾸고 나머지는 URL에 남겨 둔다 — 탭을 옮겨도 그쪽 필터가 살아 있다 */
  const setQuery = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) params.delete(key);
    else params.set(key, value);

    const qs = params.toString();
    const base = ROUTES.eventParticipants(event.eventId);
    // push라서 뒤로가기로 직전 상태가 되살아난다. scroll:false — 칩만 눌렀는데 맨 위로 튀지 않게
    router.push(qs ? `${base}?${qs}` : base, { scroll: false });
  };

  /**
   * 등록·전이 뒤의 뒤처리 한 곳.
   *
   * 성공이든 어긋남(stale·duplicated)이든 **화면이 들고 있는 것을 다시 부른다** — 어긋남은
   * 화면이 낡았다는 뜻이라 그대로 두면 같은 버튼을 다시 눌러 같은 실패를 본다.
   */
  const settle = (result: ParticipantActionResult) => {
    if (!result.message) return; // 진행 중 중복 클릭 — 아무것도 보내지 않았다
    flash(result.message);

    /*
     * 알릴 것이 없으면 패널을 닫는다 — 직전 등록의 정원 경고가 남아 있으면 방금 등록한
     * 사람에게 붙은 경고로 읽힌다.
     */
    if (result.outcome === "done") {
      const next = result.registration;
      setNotice(next && hasNotice(next) ? next : null);
    }
    if (result.outcome !== "failed") {
      roster.reload();
      reloadEvent();
    }
  };

  const registerFromApplication = (formRspnsId: number, ptcpStts: PtcpSttsCd) => {
    void (async () => {
      settle(await actions.register(event.eventId, { formRspnsId, ptcpSttsCd: ptcpStts }));
    })();
  };

  const registerManually = (mbrId: number, ptcpStts: PtcpSttsCd) => {
    void (async () => {
      settle(await actions.register(event.eventId, { mbrId, ptcpSttsCd: ptcpStts }));
    })();
  };

  const transition = (participant: EventParticipant, to: PtcpSttsCd) => {
    void (async () => {
      settle(await actions.transition(event.eventId, participant.eventPtcpId, to));
    })();
  };

  return (
    <>
      <PageHeader
        title="신청 · 참가자"
        subtitle={event.eventTtl}
        showBack
        action={{
          label: "행사 수정",
          onClick: () => router.push(ROUTES.eventEdit(event.eventId)),
        }}
      />
      <PageBody>
        {notice && (
          <RegistrationNotice registration={notice} onDismiss={() => setNotice(null)} />
        )}

        <Card className="mb-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatBox
              label="확정"
              value={`${event.confirmedCount}명`}
              /* 정원을 넘겼다는 사실만 색으로 알린다 — 막는 값이 아니다(D5) */
              tone={
                event.ptcpLmtCnt !== null && event.confirmedCount > event.ptcpLmtCnt
                  ? "danger"
                  : "accent"
              }
            />
            {/* 정원 없음이면 분모를 만들지 않는다 — 없는 값을 지어내지 않는다 */}
            <StatBox
              label="정원"
              value={event.ptcpLmtCnt === null ? "제한 없음" : `${event.ptcpLmtCnt}명`}
            />
            <StatBox
              label="신청 폼"
              value={event.formId === null ? "연결 없음" : "연결됨"}
              className="col-span-2 lg:col-span-1"
            />
          </div>
        </Card>

        <Segmented
          className="mb-4 lg:w-[320px]"
          options={TABS}
          value={tab}
          onChange={(next) => setQuery(QUERY_TAB, next === TAB_ROSTER ? "roster" : null)}
        />

        {tab === TAB_APPLICATIONS ? (
          <ApplicationsPanel
            eventId={event.eventId}
            formId={event.formId}
            rspnsSttsCd={rspnsSttsCd}
            onFilter={(value) => setQuery(QUERY_RSPNS_STTS, value)}
            canManage={canManage}
            lockedHint={NO_MANAGE}
            actions={actions}
            onRegister={registerFromApplication}
          />
        ) : (
          <RosterPanel
            event={event}
            roster={roster}
            ptcpSttsCd={ptcpSttsCd}
            onFilter={(value) => setQuery(QUERY_PTCP_STTS, value)}
            canManage={canManage}
            lockedHint={NO_MANAGE}
            actions={actions}
            onTransition={transition}
            onManualAdd={() => setManualOpen(true)}
          />
        )}

        <ManualRegisterSheet
          open={manualOpen}
          busy={actions.pending}
          onClose={() => setManualOpen(false)}
          onSubmit={registerManually}
        />
      </PageBody>
    </>
  );
}
