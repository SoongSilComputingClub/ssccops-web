"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  EVENT_PHASE_BADGE,
  EVENT_RECEIPT_BADGE,
  eventSttsBadge,
  type EventSummary,
} from "@/entities/event";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { useDuplicateEvent, useEventCategoryOptions, useEventList } from "@/features/event";
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
  flash,
} from "@/shared/ui";

/*
 * 행사 목록 (#136 · GET /v1/events).
 *
 * 구조의 근거는 views/form-list와 같다 — 필터는 컴포넌트 state가 아니라 URL 쿼리스트링에
 * 두고(새로고침·뒤로가기·링크 공유), 파라미터 이름을 서버 쿼리와 똑같이 맞춘다.
 *
 * 상세 화면이 따로 없다 — 제목을 누르면 곧장 수정 화면이다(라우트 주석 참고). 게시·보관
 * 전이도 그 화면에서 한다. **삭제는 없다** — 치우는 길은 보관 하나다(ssccops ADR-0014).
 */

const ALL = "전체";
const EXCEPT_ARCHIVED = "보관 제외";

/** 잠긴 버튼에 붙는 사유. 감추지 않고 잠그는 근거는 features/auth/model/use-can.ts */
const NO_MANAGE = "행사를 다룰 권한이 없습니다 — 행사 관리(EVENT_MANAGE) 권한이 필요합니다";

const QUERY_STATUS = "eventSttsCd";
const QUERY_CATEGORY = "eventClsfCd";

/** 상태 축의 '전체'. 기본값이 좁힌 목록이라 파라미터를 지우는 것으로는 넓힐 수 없다 */
const QUERY_STATUS_ALL = "ALL";

/*
 * 상태 축이 고를 수 있는 것 — 저장 상태 셋에 두 가지가 더 있다.
 *
 * `EXCEPT_ARCHIVED`가 **파라미터가 없을 때의 기본값**이다 (ssccops#267). 치우려고 보관을 눌러도
 * 목록에서 사라지지 않아, 지난 행사가 쌓일수록 지금 것을 찾기 어려웠다.
 *
 * ADR-0014가 삭제를 걷어내며 "보관된 행사가 운영진에게는 계속 보인다"를 근거의 하나로 적었는데,
 * 그 문장이 지키려던 것은 **보관해도 데이터가 사라지지 않고 찾아볼 수 있다**이다. 칩으로 볼 수
 * 있으면 그것은 그대로다.
 */
type EventStatusFilter = EventSttsCd | "ALL" | "EXCEPT_ARCHIVED";

/*
 * URL은 사용자가 손으로 고칠 수 있다 — 모르는 값은 필터 없음(전체)으로 떨어뜨린다.
 *
 * 파라미터가 **없는 것**과 **전체**가 다른 뜻이다. 없으면 기본값(보관 제외)이고, 전체는
 * `ALL`이라는 값으로 적는다.
 */
function parseEventStatusFilter(value: string | null): EventStatusFilter {
  if (value === null) return "EXCEPT_ARCHIVED";
  if (value === QUERY_STATUS_ALL) return "ALL";
  return EVENT_STTS_CDS.includes(value as EventSttsCd) ? (value as EventSttsCd) : "ALL";
}

function EventCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="h-[22px] w-[64px] rounded-full bg-fill" />
      <div className="mt-3 h-[22px] w-4/5 rounded bg-fill" />
      <div className="mt-2 h-[16px] w-3/5 rounded bg-fill" />
      <div className="mt-4 h-[16px] w-2/5 rounded bg-fill" />
    </Card>
  );
}

function EventCard({
  event,
  canManage,
  onDuplicated,
}: {
  event: EventSummary;
  canManage: boolean;
  onDuplicated: () => void;
}) {
  const router = useRouter();
  const { pending, duplicate } = useDuplicateEvent();
  /** 두 단계 확인의 첫 단계 — 권한 트리 삭제(views/authority-tree)와 같은 방식이다 */
  const [asking, setAsking] = useState(false);
  const stts = eventSttsBadge(event.eventSttsCd);

  /*
   * 복제가 끝나면 **사본의 수정 화면으로 간다.** 복제의 목적이 "고쳐서 쓰는 것"이라
   * 목록에 머무르면 사용자가 사본을 다시 찾아 들어가야 한다 — 절약한 손이 도로 든다.
   * 목록 갱신을 함께 부르는 것은 이동이 실패하거나 뒤로 돌아왔을 때 사본이 보이게 하기 위해서다.
   */
  const runDuplicate = async () => {
    const { duplicate: copy, message } = await duplicate(event.eventId);
    if (message) flash(message);
    setAsking(false);
    if (copy === null) return;
    onDuplicated();
    router.push(ROUTES.eventEdit(copy.eventId));
  };
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
      <div className="mt-3 flex items-center gap-3 border-t border-hairline pt-3 text-[14px]">
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
        {/*
         * 신청·참가자로 가는 길 (#145). 폼 없는 공지형 행사에도 남긴다 — 폼 없이도 회원을
         * 직접 명단에 올릴 수 있고(D5 수동 등록), 감추면 그 길이 화면에서 사라진다.
         */}
        <button
          type="button"
          disabled={!canManage}
          title={canManage ? undefined : NO_MANAGE}
          onClick={() => router.push(ROUTES.eventParticipants(event.eventId))}
          className="cursor-pointer text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          신청 · 참가자
        </button>
        {/*
         * 복제 (ssccops#198). 한 번 더 묻는 것은 **신청서 사본이 함께 생기기 때문**이다 —
         * 폼 목록에 (복사본)이 하나 늘어나는 것은 사용자가 이 화면에서 보지 못하는 변화이고,
         * 되돌리려면 행사와 폼을 각각 치워야 한다. 확인 방식은 권한 트리 삭제와 같은 자리에서
         * 쓰는 두 단계 인라인 확인이다(이 저장소에는 모달이 없다).
         */}
        <button
          type="button"
          disabled={!canManage || pending}
          title={canManage ? undefined : NO_MANAGE}
          onClick={() => (asking ? void runDuplicate() : setAsking(true))}
          className="cursor-pointer text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "복제 중…" : asking ? "복제할까요? 예" : "복제"}
        </button>
        {asking && !pending && (
          <button
            type="button"
            onClick={() => setAsking(false)}
            className="cursor-pointer text-n500"
          >
            아니오
          </button>
        )}
        <div className="flex-1" />
        {/* 되돌리기 번거로운 부수효과는 누르기 전에 말한다 — 신청서가 하나 더 생긴다 */}
        {asking && !pending && (
          <div className="text-[13px] text-n500">
            {event.formId === null ? "사본은 작성 중으로 만들어집니다" : "신청서 사본도 함께 생깁니다"}
          </div>
        )}
        {!asking && <div className="text-[13px] text-n500">수정 {formatYmd(event.mdfcnDt)}</div>}
      </div>
    </Card>
  );
}

export function EventListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canManage = useCan(CAPABILITY.EVENT_MANAGE);

  const statusFilter = parseEventStatusFilter(searchParams.get(QUERY_STATUS));
  const eventClsfCd = searchParams.get(QUERY_CATEGORY);

  /*
   * 단일 상태만 서버가 좁힌다. 기본(보관 제외)과 전체는 상태를 보내지 않고, 받아 온 뒤 화면에서
   * 판단한다 — 상태 파라미터가 단일 값이라 "보관만 빼고 나머지"를 서버로 보낼 수 없다.
   *
   * 화면에서 걸러도 되는 것은 **이 조회에 페이징이 없기 때문**이다. GET /v1/events는 조건에 맞는
   * 행사를 전량 List로 내려준다(서버 EventServiceImpl.getEvents). 커서 페이징이었다면 걸러낸
   * 만큼 한 페이지에 남는 개수가 흔들렸을 자리다.
   */
  const eventSttsCd =
    statusFilter === "ALL" || statusFilter === "EXCEPT_ARCHIVED" ? null : statusFilter;

  const fetched = useEventList({ eventClsfCd, eventSttsCd });
  const { status, errorMessage, reload } = fetched;
  const events =
    statusFilter === "EXCEPT_ARCHIVED"
      ? fetched.events.filter((e) => e.eventSttsCd !== "ARCHIVED")
      : fetched.events;
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
          {/* 기본값이라 파라미터를 지운다 — 값을 남기지 않는 쪽이 이 칩이고, 전체는 값을 남긴다 */}
          <Chip
            active={statusFilter === "EXCEPT_ARCHIVED"}
            onClick={() => applyFilter(QUERY_STATUS, null)}
          >
            {EXCEPT_ARCHIVED}
          </Chip>
          <Chip
            active={statusFilter === "ALL"}
            onClick={() => applyFilter(QUERY_STATUS, QUERY_STATUS_ALL)}
          >
            {ALL}
          </Chip>
          {/* 필터는 저장 상태 코드 자체를 고르는 자리다 — 파생 단계(eventPhase)가 아니다 */}
          {EVENT_STTS_CDS.map((cd) => (
            <Chip
              key={cd}
              active={statusFilter === cd}
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
                /* 기본값도 좁힌 조건이다 — 보관된 행사만 있을 때 "등록된 행사가 없습니다"는 거짓이다 */
                statusFilter !== "ALL" || eventClsfCd
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
                <EventCard
                  key={e.eventId}
                  event={e}
                  canManage={canManage}
                  onDuplicated={reload}
                />
              ))}
            </div>
          ))}
      </PageBody>
    </>
  );
}
