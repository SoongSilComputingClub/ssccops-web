"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  EVENT_PHASE_BADGE,
  EVENT_RECEIPT_BADGE,
  eventSttsBadge,
  type EventSummary,
} from "@/entities/event";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { useEventCategoryOptions, useEventList } from "@/features/event";
import { EVENT_STTS_CDS, EVENT_STTS_NM, type EventSttsCd } from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import { formatDt, formatYmd } from "@/shared/lib/date";
import {
  Badge,
  Card,
  Chip,
  EmptyState,
  PageBody,
  PageHeader,
  Pill,
} from "@/shared/ui";

/*
 * 행사 목록 (#136 · GET /v1/events).
 *
 * 구조의 근거는 views/form-list와 같다 — 필터는 컴포넌트 state가 아니라 URL 쿼리스트링에
 * 두고(새로고침·뒤로가기·링크 공유), 파라미터 이름을 서버 쿼리와 똑같이 맞춘다.
 *
 * 상세 화면이 따로 없다 — 제목을 누르면 곧장 수정 화면이다(라우트 주석 참고). 게시·보관
 * 전이와 삭제도 그 화면에서 한다.
 */

const ALL = "전체";

/** 잠긴 버튼에 붙는 사유. 감추지 않고 잠그는 근거는 features/auth/model/use-can.ts */
const NO_MANAGE = "행사를 다룰 권한이 없습니다 — 행사 관리(EVENT_MANAGE) 권한이 필요합니다";

const QUERY_STATUS = "eventSttsCd";
const QUERY_CATEGORY = "eventClsfCd";

/** URL은 사용자가 손으로 고칠 수 있다 — 모르는 값은 필터 없음으로 떨어뜨린다 */
function parseEventSttsCd(value: string | null): EventSttsCd | null {
  return value && EVENT_STTS_CDS.includes(value as EventSttsCd)
    ? (value as EventSttsCd)
    : null;
}

function EventCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="h-[22px] w-[64px] rounded-full bg-black/5" />
      <div className="mt-3 h-[22px] w-4/5 rounded bg-black/5" />
      <div className="mt-2 h-[16px] w-3/5 rounded bg-black/5" />
      <div className="mt-4 h-[16px] w-2/5 rounded bg-black/5" />
    </Card>
  );
}

function EventCard({ event, canManage }: { event: EventSummary; canManage: boolean }) {
  const router = useRouter();
  const stts = eventSttsBadge(event.eventSttsCd);
  /* 일시 미설정(NONE)은 단계를 말할 수 없다 — 배지를 그리지 않는다 (display.ts 주석 참고) */
  const phase = event.eventPhase === "NONE" ? null : EVENT_PHASE_BADGE[event.eventPhase];
  /* 모집 배지는 연결된 폼의 접수 상태다 — 폼 미연결(공지형)이면 그리지 않는다 (D3) */
  const receipt = event.receiptStatus ? EVENT_RECEIPT_BADGE[event.receiptStatus] : null;

  return (
    <Card>
      <div className="flex items-center gap-2">
        <Badge tone={stts.tone}>{stts.label}</Badge>
        {phase && <Badge tone={phase.tone}>{phase.label}</Badge>}
        {receipt && <Badge tone={receipt.tone}>{receipt.label}</Badge>}
        <div className="flex-1" />
        {/* 확정 참가자 수 (서버 집계). 정원이 없으면 분모를 그리지 않는다 — 없는 값을 만들지 않는다 */}
        <div className="text-[13.5px] text-n500">
          확정 {event.confirmedCount}
          {event.ptcpLmtCnt != null && `/${event.ptcpLmtCnt}`}
        </div>
      </div>
      <div
        onClick={() => router.push(ROUTES.eventEdit(event.eventId))}
        className="mt-2 cursor-pointer text-[18px] leading-[1.35] font-semibold hover:text-accent"
      >
        {event.eventTtl}
      </div>
      <div className="mt-1 text-[13.5px] text-n500">
        {event.eventBgngDt
          ? `${formatDt(event.eventBgngDt)}${event.eventEndDt ? ` ~ ${formatDt(event.eventEndDt)}` : ""}`
          : "일시 미설정"}
        {event.plcNm && ` · ${event.plcNm}`}
      </div>
      <div className="mt-2 flex flex-wrap gap-[6px]">
        <Pill tone="blue">{event.eventClsfNm}</Pill>
        {event.formId === null && <Pill tone="outline">폼 없음 · 공지형</Pill>}
      </div>
      <div className="mt-3 flex items-center gap-3 border-t border-black/5 pt-3 text-[14px]">
        {/* 권한이 없으면 감추지 않고 잠근다 — 사라지면 기능이 없어진 것인지 고장인지 알 수 없다 */}
        <button
          type="button"
          disabled={!canManage}
          title={canManage ? undefined : NO_MANAGE}
          onClick={() => router.push(ROUTES.eventEdit(event.eventId))}
          className="cursor-pointer text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          수정
        </button>
        <div className="flex-1" />
        <div className="text-[13px] text-n500">수정 {formatYmd(event.mdfcnDt)}</div>
      </div>
    </Card>
  );
}

export function EventListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canManage = useCan(CAPABILITY.EVENT_MANAGE);

  const eventSttsCd = parseEventSttsCd(searchParams.get(QUERY_STATUS));
  const eventClsfCd = searchParams.get(QUERY_CATEGORY);

  const { events, status, errorMessage, reload } = useEventList({ eventClsfCd, eventSttsCd });
  const { categories } = useEventCategoryOptions();

  /** 누른 축만 바꾸고 나머지 필터는 URL에 남겨 둔다 (상태·분류는 AND로 함께 걸린다) */
  const applyFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) params.delete(key);
    else params.set(key, value);

    const qs = params.toString();
    // push라서 뒤로가기로 직전 필터가 되살아난다. scroll:false — 칩만 눌렀는데 맨 위로 튀지 않게
    router.push(qs ? `${ROUTES.events}?${qs}` : ROUTES.events, { scroll: false });
  };

  return (
    <>
      <PageHeader
        title="행사 관리"
        subtitle="작성 · 게시 · 보관과 분류 관리"
        action={{
          label: "+ 새 행사",
          onClick: () => router.push(ROUTES.eventNew),
          disabled: !canManage,
          title: canManage ? undefined : NO_MANAGE,
        }}
      />
      <PageBody>
        <div className="mb-4 flex flex-wrap items-center gap-[7px]">
          <Chip
            active={eventSttsCd === null}
            onClick={() => applyFilter(QUERY_STATUS, null)}
          >
            {ALL}
          </Chip>
          {/* 필터는 저장 상태 코드 자체를 고르는 자리다 — 파생 단계(eventPhase)가 아니다 */}
          {EVENT_STTS_CDS.map((cd) => (
            <Chip
              key={cd}
              active={eventSttsCd === cd}
              onClick={() => applyFilter(QUERY_STATUS, cd)}
            >
              {EVENT_STTS_NM[cd]}
            </Chip>
          ))}
          {/* 상태 축과 분류 축의 칸막이 — 좁은 화면에서는 가로선이 된다 (form-list와 같은 판단) */}
          <div className="mx-0 h-px w-full bg-line lg:mx-2 lg:h-5 lg:w-px" />
          <Chip
            active={eventClsfCd === null}
            onClick={() => applyFilter(QUERY_CATEGORY, null)}
          >
            {ALL}
          </Chip>
          {categories.map((c) => (
            <Chip
              key={c.eventClsfCd}
              active={eventClsfCd === c.eventClsfCd}
              onClick={() => applyFilter(QUERY_CATEGORY, c.eventClsfCd)}
            >
              {c.eventClsfNm}
            </Chip>
          ))}
        </div>

        {status === "loading" && (
          <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        )}

        {status === "error" && (
          <EmptyState
            message={errorMessage || "행사 목록을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: reload }}
          />
        )}

        {status === "ready" &&
          (events.length === 0 ? (
            <EmptyState
              message={
                eventSttsCd || eventClsfCd
                  ? "조건에 맞는 행사가 없습니다."
                  : "등록된 행사가 없습니다."
              }
              /* 빈 화면의 유도 버튼만은 감춘다 — 사유는 헤더의 잠긴 '+ 새 행사'가 이미 말한다 */
              action={
                canManage
                  ? { label: "+ 새 행사", onClick: () => router.push(ROUTES.eventNew) }
                  : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
              {events.map((e) => (
                <EventCard key={e.eventId} event={e} canManage={canManage} />
              ))}
            </div>
          ))}
      </PageBody>
    </>
  );
}
