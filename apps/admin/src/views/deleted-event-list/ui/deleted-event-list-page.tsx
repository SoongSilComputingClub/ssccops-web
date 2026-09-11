"use client";

import { useRouter } from "next/navigation";
import { DELETED_EVENT_BADGE, type EventSummary } from "@/entities/event";
import { useCan } from "@/features/auth";
import {
  EVENT_DELETE_CAPABILITY,
  EVENT_RESTORE_NOTE,
  NO_EVENT_DELETE,
  useEventDelete,
  useEventList,
} from "@/features/event";
import { ROUTES } from "@/shared/config/routes";
import { formatDt } from "@/shared/lib/date";
import {
  Badge,
  Card,
  EmptyState,
  PageBody,
  PageHeader,
  Pill,
  flash,
} from "@/shared/ui";

/*
 * 지운 행사 (ssccops-web#391 · ADR-0020 · 서버 ssccops-server#347).
 *
 * 형판은 views/deleted-form-list다 — 있는 이유도 같다. "참가자가 있는 행사도 지운다"는 결정
 * (ADR-0020 규칙표)의 대가는 **참가자의 '내 신청'에서도 그 행사가 사라진다**는 것이고, 그 대가를
 * 감당 가능하게 만드는 유일한 조건이 되돌릴 수 있다는 것이다. 되돌리는 자리가 없으면 하드
 * 삭제와 다를 것이 없다. **이 화면은 부속물이 아니라 그 결정의 전제다.**
 *
 * ── 왜 행사 목록의 칩이 아니라 별도 화면인가 ───────────────────
 * 근거는 shared/config/routes.ts의 `eventsDeleted` 주석에 적었다. 요약하면 상태·분류는 같은
 * 무리를 좁히는 축이고 삭제는 다른 모집단이며, 특히 상태 축에 이미 «보관»이 있어 «삭제됨»을
 * 나란히 세우면 뜻이 다른 두 장치가 같은 종류로 읽힌다.
 *
 * ── 왜 복구에는 확인을 받지 않는가 ─────────────────────────────
 * 폼과 같은 판단이다. 잘못 눌러도 그 자리에서 다시 지울 수 있고, 되돌아오는 것은 지우기 전
 * 그대로라 새로 생기는 피해가 없다. 확인을 양쪽에 다 붙이면 정작 삭제 확인이 습관적으로
 * 넘겨진다. 다만 **게시 중이던 행사를 되살리면 공개 화면에도 다시 뜬다** — 그 사실은 카드의
 * 저장 상태가 아니라(지워진 행사에는 그 배지를 그리지 않는다) 머리말이 한 번 말한다.
 *
 * ── 왜 필터도 URL 쿼리도 없는가 ────────────────────────────────
 * 지운 행사는 치우려고 지운 것이라 남에게 보내는 목록이 아니고, 쌓아 두는 화면도 아니다
 * (되살리거나 그대로 두거나 둘 중 하나다). 실을 상태가 없어 `Suspense` 경계도 필요 없다
 * (app/(admin)/events/page.tsx가 감싸는 이유가 여기엔 없다).
 */

function DeletedEventCard({
  event,
  restoring,
  canRestore,
  onRestore,
}: Readonly<{
  event: EventSummary;
  /** 이 카드의 복구가 진행 중인가 — 연타로 요청이 두 번 나가는 것을 막는다 */
  restoring: boolean;
  canRestore: boolean;
  onRestore: () => void;
}>) {
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        {/*
          저장 상태·단계·모집 배지를 그리지 않는다 — 근거는 entities/event의 DELETED_EVENT_BADGE
          주석. 지워진 행사의 '게시'는 이미 사실이 아니고(공개에서도 빠졌다), 그 배지를 보고 아직
          회원에게 보이는 중이라고 읽으면 되살릴지 판단하는 기준이 통째로 어긋난다.
        */}
        <Badge tone={DELETED_EVENT_BADGE.tone}>{DELETED_EVENT_BADGE.label}</Badge>
        <div className="flex-1" />
        {/* 이 숫자가 곧 참가자 쪽에서 함께 빠져 있는 사람 수다 — 복구를 판단하는 값이라 크게 둔다 */}
        <div className="text-[13.5px] text-n500">확정 {event.confirmedCount}</div>
      </div>
      {/*
        제목을 수정 화면으로 가는 링크로 만들지 않는다. 지워진 행사는 단건 조회에서도 빠지므로
        (서버 #347이 모든 조회에 DeletedAtIsNull을 건다) 누르면 "행사를 찾을 수 없습니다"로
        떨어진다 — 갈 수 없는 곳을 누를 수 있게 두면 화면이 고장 난 것으로 읽힌다.
      */}
      <div className="mt-2 text-[18px] leading-[1.35] font-semibold">{event.eventTtl}</div>
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
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-hairline pt-3 text-[14px]">
        {/* 권한이 없으면 감추지 않고 잠근다 — 근거는 features/auth/model/use-can.ts */}
        <button
          type="button"
          disabled={restoring || !canRestore}
          title={canRestore ? EVENT_RESTORE_NOTE : NO_EVENT_DELETE}
          onClick={onRestore}
          className="cursor-pointer text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {restoring ? "되살리는 중…" : "되살리기"}
        </button>
        <div className="flex-1" />
        {/*
          지운 일시가 이 화면의 핵심 값이다 — 방금 실수로 지운 것과 지난 학기에 치운 것을 가르는
          유일한 단서라, 없으면 무엇을 되살려야 하는지 고를 수 없다. 목록 카드의 수정 일자와 달리
          **일자가 아니라 일시**인 것은 되살릴 대상이 대개 조금 전에 지운 것이고, 같은 날 여러 개를
          치운 날에는 일자만으로 갈리지 않기 때문이다. 값이 형식에 안 맞으면 `formatDt`가 빈
          문자열을 준다 — 그때 '지움 '만 남기지 않도록 자리표시자를 둔다.
        */}
        <div className="text-[13px] text-n500">지움 {formatDt(event.delDt) || "-"}</div>
      </div>
    </Card>
  );
}

export function DeletedEventListPage() {
  const router = useRouter();
  const { events, status, errorMessage, reload } = useEventList({ deleted: true });
  const deletion = useEventDelete();
  const canRestore = useCan(EVENT_DELETE_CAPABILITY);

  /*
   * **서버가 지운 행사만 줬는지 응답으로 한 번 더 본다.** 폼 휴지통이 실제로 겪은 일이 근거다
   * (ssccops-web#362 — 서버가 모르는 파라미터를 조용히 무시해 살아 있는 폼 전부가 200으로 왔고,
   * 이 한 줄이 그것을 "삭제됨" 배지와 함께 세우는 것을 막았다). 경로가 별도 자원이라 지금은
   * 전부 통과하지만, 모르는 배포에서 조용히 다른 답이 오는 자리를 화면이 스스로 막고 있어야 한다.
   */
  const deletedEvents = events.filter((e) => e.delDt !== null);

  const runRestore = async (eventId: number) => {
    const { outcome, message } = await deletion.restore(eventId);
    if (outcome === "busy") return;

    flash(message);
    /*
     * 성공도 stale(이미 되살아났다·사라졌다)도 똑같이 다시 부른다. 되살린 행사는 이 목록에서
     * 빠져야 하고, stale은 뜻 자체가 "화면이 낡았다"라 할 일이 최신 목록을 가져오는 것이다.
     * 낙관적으로 카드만 지우지 않는 것은 행사 목록·수정이 쓰는 방식과 같다(재조회).
     */
    if (outcome === "done" || outcome === "stale") reload();
  };

  return (
    <>
      <PageHeader
        title="지운 행사"
        subtitle="되살리면 행사 목록으로 돌아옵니다"
        action={{ label: "행사 목록", onClick: () => router.push(ROUTES.events) }}
      />
      <PageBody>
        {/*
          **참가자 쪽에서 무슨 일이 일어나 있는지를 이 화면이 말한다.** 지울 때 확인 시트가 한 번
          알리지만 그것은 누르는 순간뿐이고, 그 뒤로 그 사실이 남아 있는 자리는 여기뿐이다 —
          여기 없으면 운영진은 지운 행사가 자기 목록에서만 빠진 줄 안다. 보관과 다르다는 것도
          한 번 짚는다 — 이 화면에 끝난 행사를 두러 오는 사람이 있으면 그것은 보관의 자리다.
        */}
        <div className="mb-4 rounded-[12px] bg-bg px-[14px] py-[10px] text-[13px] leading-[1.6] text-n400">
          지운 행사는 행사 목록과 공개 화면에서 빠지고, 참가자의 &lsquo;내 신청&rsquo;에서도
          보이지 않습니다. {EVENT_RESTORE_NOTE} — 게시 중이던 행사는 공개 화면에도 다시 뜹니다.
          끝난 행사를 내리는 자리는 여기가 아니라 <b>보관</b>입니다.
        </div>

        {status === "loading" && <EmptyState message="불러오는 중…" />}

        {status === "error" && (
          <EmptyState
            message={errorMessage || "지운 행사를 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: reload }}
          />
        )}

        {status === "ready" &&
          (deletedEvents.length === 0 ? (
            <EmptyState message="지운 행사가 없습니다." />
          ) : (
            <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
              {deletedEvents.map((e) => (
                <DeletedEventCard
                  key={e.eventId}
                  event={e}
                  restoring={deletion.pendingEventId === e.eventId}
                  canRestore={canRestore}
                  onRestore={() => void runRestore(e.eventId)}
                />
              ))}
            </div>
          ))}
      </PageBody>
    </>
  );
}
