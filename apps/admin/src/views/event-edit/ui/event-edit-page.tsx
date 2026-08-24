"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  eventSttsBadge,
  type EventDetail,
  type EventSaveInput,
  type EventStatusAction,
} from "@/entities/event";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import {
  EventForm,
  useDeleteEvent,
  useEventDetail,
  useEventStatus,
  useSaveEvent,
} from "@/features/event";
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
  Sheet,
  flash,
} from "@/shared/ui";

/*
 * 행사 수정 (#136 · PUT /v1/events/{eventId}).
 *
 * 상태 전이(게시·게시 철회·보관·재공개)와 삭제도 이 화면에 있다 — 행사 상세 화면이 따로
 * 없으므로(라우트 주석 참고) 행사 정보와 전이 버튼이 같은 자리에서 같은 것을 본다.
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
  DRAFT: [{ action: "PUBLISH", label: "게시", primary: true }],
  PUBLISHED: [
    { action: "RETRACT", label: "게시 철회" },
    { action: "ARCHIVE", label: "보관" },
  ],
  ARCHIVED: [{ action: "REPUBLISH", label: "다시 게시", primary: true }],
};

function EditSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="h-[22px] w-2/5 rounded bg-black/5" />
      <div className="mt-4 h-[200px] w-full rounded bg-black/5" />
    </Card>
  );
}

export function EventEditPage({ eventId }: { eventId: number }) {
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
}: {
  event: EventDetail;
  canManage: boolean;
  reload: () => void;
}) {
  const router = useRouter();
  const save = useSaveEvent();
  const statusControl = useEventStatus();
  const deletion = useDeleteEvent();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const stts = eventSttsBadge(event.eventSttsCd);
  const busy = save.pending || statusControl.pending || deletion.pending;

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
            <Button
              variant="ghost-danger"
              size="sm"
              disabled={busy || !canManage}
              title={canManage ? undefined : NO_MANAGE}
              onClick={() => setDeleteOpen(true)}
            >
              삭제
            </Button>
          </div>
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

        <Sheet
          open={deleteOpen}
          title="행사 삭제"
          hint="삭제하면 되돌릴 수 없습니다. 참가자가 있는 행사는 삭제할 수 없으며 보관으로 전환해주세요."
          onClose={() => setDeleteOpen(false)}
          onOk={() => {
            setDeleteOpen(false);
            void (async () => {
              const { deleted, message } = await deletion.remove(event.eventId);
              if (message) flash(message);
              if (deleted) router.replace(ROUTES.events);
            })();
          }}
          okLabel="삭제"
        />
      </PageBody>
    </>
  );
}
