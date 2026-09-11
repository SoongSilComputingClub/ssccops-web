"use client";

import { useRouter } from "next/navigation";
import {
  eventSttsBadge,
  type EventDetail,
  type EventSaveInput,
  type EventStatusAction,
} from "@/entities/event";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { EventForm, useEventDetail, useEventStatus, useSaveEvent } from "@/features/event";
import { EventShareButton } from "@/features/share";
import type { EventSttsCd } from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageBody,
  PageHeader,
  SectionLabel,
  flash,
} from "@/shared/ui";

/*
 * 행사 수정 (#136 · PUT /v1/events/{eventId}).
 *
 * 상태 전이(게시·게시 철회·보관·재공개)도 이 화면에 있다 — 행사 상세 화면이 따로 없으므로
 * (라우트 주석 참고) 행사 정보와 전이 버튼이 같은 자리에서 같은 것을 본다.
 *
 * **삭제 버튼은 없다** (ssccops ADR-0014). 서버에서 삭제 API가 사라졌고, 치우는 길은 보관
 * 하나로 모였다 — 작성 중인 행사도 보관할 수 있게 열린 것이 그 때문이다.
 *
 * 상세 조회가 ready가 되기 전에는 폼을 마운트하지 않는다 — useState 초깃값이 곧 폼
 * 초깃값이라 동기화용 useEffect가 필요 없다(work-edit과 같은 판단).
 */

const NO_MANAGE = "행사를 수정할 권한이 없습니다 — 행사 관리(EVENT_MANAGE) 권한이 필요합니다";

/**
 * 지금 상태에서 할 수 있는 전이만 그린다.
 *
 * PUBLISHED에 버튼이 둘인 것은 두 단계를 이어 보내는 것이 아니라 **갈 수 있는 다음 상태가
 * 둘**(작성 중으로 철회 · 보관)이기 때문이다 — 어느 쪽도 한 번의 전이다(AGENTS.md의 "버튼은
 * 지금 할 수 있는 전이 하나만" 원칙과 어긋나지 않는다). 전이표 자체의 판정은 서버가 한다.
 */
const TRANSITIONS: Record<
  EventSttsCd,
  { action: EventStatusAction; label: string; primary?: boolean }[]
> = {
  DRAFT: [
    { action: "PUBLISH", label: "게시", primary: true },
    // 삭제가 없어진 뒤로 잘못 만든 행사를 치우는 유일한 길이다 (ssccops ADR-0014)
    { action: "ARCHIVE", label: "보관" },
  ],
  PUBLISHED: [
    { action: "RETRACT", label: "게시 철회" },
    { action: "ARCHIVE", label: "보관" },
  ],
  ARCHIVED: [{ action: "REPUBLISH", label: "다시 게시", primary: true }],
};

function EditSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="h-[22px] w-2/5 rounded bg-fill" />
      <div className="mt-4 h-[200px] w-full rounded bg-fill" />
    </Card>
  );
}

export function EventEditPage({ eventId }: Readonly<{ eventId: number }>) {
  const router = useRouter();
  const { event, status, errorMessage, reload } = useEventDetail(eventId);
  const canManage = useCan(CAPABILITY.EVENT_MANAGE);

  if (status !== "ready" || !event) {
    return (
      <>
        <PageHeader title="행사 수정" showBack />
        <PageBody>
          {status === "loading" && <EditSkeleton />}
          {status === "not-found" && (
            <EmptyState
              message="행사를 찾을 수 없습니다."
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

  return <EventEditView event={event} canManage={canManage} reload={reload} />;
}

/*
 * 로딩이 끝난 뒤에야 마운트되는 본문. 상태 전이가 성공하면 상세를 **통째로 다시 부른다** —
 * eventPhase 같은 파생값까지 함께 움직이므로 전이 응답으로 부분 갱신하지 않는다(AGENTS.md).
 * 재조회로 폼이 다시 마운트되며 저장하지 않은 입력은 초기화된다 — 전이는 편집과 별개의
 * 행위라 그 편이 "화면이 서버와 같은 것을 본다"에 가깝다.
 */
function EventEditView({
  event,
  canManage,
  reload,
}: Readonly<{
  event: EventDetail;
  canManage: boolean;
  reload: () => void;
}>) {
  const router = useRouter();
  const save = useSaveEvent();
  const statusControl = useEventStatus();

  const stts = eventSttsBadge(event.eventSttsCd);
  const busy = save.pending || statusControl.pending;

  const submit = async (input: EventSaveInput) => {
    const { event: updated, message } = await save.update(event.eventId, input);
    if (!message) return; // 진행 중 중복 클릭 — 아무것도 보내지 않았다

    flash(message);
    if (updated) router.replace(ROUTES.events);
  };

  const runTransition = async (action: EventStatusAction) => {
    const { outcome, message } = await statusControl.transition(event.eventId, action);
    if (message) flash(message);

    // 전이표 밖(stale)도 성공도 최신 상태를 다시 본다 — 화면이 낡은 채로 두지 않는다
    if (outcome === "changed" || outcome === "stale") reload();
    if (outcome === "missing") router.replace(ROUTES.events);
  };

  return (
    <>
      {/*
        신청·참가자는 별도 화면이다 (#145) — 여기에 탭으로 얹으면 저장하지 않은 입력을 쥔
        폼과 목록을 오가는 작업이 한 상태에 갇힌다(routes.ts의 eventParticipants 주석).
      */}
      <PageHeader
        title="행사 수정"
        subtitle={event.eventTtl}
        showBack
        action={{
          label: "신청 · 참가자",
          onClick: () => router.push(ROUTES.eventParticipants(event.eventId)),
        }}
      />
      <PageBody>
        <Card className="mb-4">
          <SectionLabel className="mb-3">게시 상태</SectionLabel>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={stts.tone}>{stts.label}</Badge>
            <div className="text-[13.5px] text-n500">
              {event.eventSttsCd === "DRAFT" &&
                "게시 전에는 회원에게 보이지 않습니다"}
              {event.eventSttsCd === "PUBLISHED" &&
                "회원에게 공개된 상태입니다 — 철회하면 작성 중으로 돌아갑니다"}
              {event.eventSttsCd === "ARCHIVED" &&
                "보관된 행사는 목록에서 내려가고 다시 게시할 수 있습니다"}
            </div>
            <div className="flex-1" />
            {TRANSITIONS[event.eventSttsCd].map((t) => (
              <Button
                key={t.action}
                variant={t.primary ? "primary" : "ghost"}
                size="sm"
                disabled={busy || !canManage}
                title={canManage ? undefined : NO_MANAGE}
                onClick={() => void runTransition(t.action)}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </Card>

        {/*
          공유 (ssccops#254 · ssccops-web#338).

          **게시 상태 카드와 나란히 두되 섞지 않는다.** 저 카드의 버튼은 전부 상태를 바꾸는
          것이고 공유는 아무것도 바꾸지 않는다 — 한 줄에 세우면 '게시'와 '공유하기'가 같은
          무게로 보인다. 대신 바로 아래에 두는 것은 **공유가 무엇을 건네는지가 위 카드의
          상태에서 곧바로 따라 나오기 때문**이다(게시 전이면 토큰 링크, 게시됐으면 공개 주소).

          공유는 권한을 넓히지 않으므로 별도 잠금이 없다 — 토큰이 주는 것은 제목·요약
          미리보기까지이고(ADR-0016), 이 화면을 여는 것 자체가 이미 행사 관리 권한을 지난
          것이다(조회부터 EVENT_MANAGE다). 업무·회의 상세와 같은 판단이다.
        */}
        <Card className="mb-4">
          <SectionLabel className="mb-3">공유</SectionLabel>
          <EventShareButton
            eventId={event.eventId}
            eventSttsCd={event.eventSttsCd}
            title={event.eventTtl}
          />
        </Card>

        <EventForm
          initial={event}
          eventId={event.eventId}
          busy={busy}
          canManage={canManage}
          lockedHint={NO_MANAGE}
          submitLabel="저장"
          onSubmit={(input) => void submit(input)}
        />

      </PageBody>
    </>
  );
}
