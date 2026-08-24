"use client";

import { useRouter } from "next/navigation";
import type { EventSaveInput } from "@/entities/event";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { EventForm, useSaveEvent } from "@/features/event";
import { ROUTES } from "@/shared/config/routes";
import { PageBody, PageHeader, flash } from "@/shared/ui";

/*
 * 행사 등록 (#136 · POST /v1/events).
 *
 * 새 행사는 항상 작성 중(DRAFT)으로 만들어진다(D9) — 게시 버튼이 이 화면에 없는 이유다.
 * 저장이 성공하면 **수정 화면으로 이동한다**: 상태 전이(게시)와 삭제가 그 화면에 있어,
 * 등록 → 게시로 이어지는 흐름이 화면 이동 한 번으로 끝난다(목록에서 방금 만든 행사를
 * 눈으로 찾게 하지 않는다 — 폼 복제 후 편집 이동과 같은 판단).
 */

const NO_MANAGE = "행사를 등록할 권한이 없습니다 — 행사 관리(EVENT_MANAGE) 권한이 필요합니다";

export function EventNewPage() {
  const router = useRouter();
  const { pending, create } = useSaveEvent();
  const canManage = useCan(CAPABILITY.EVENT_MANAGE);

  const save = async (input: EventSaveInput) => {
    const { event, message } = await create(input);
    if (!message) return; // 진행 중 중복 클릭 — 아무것도 보내지 않았다

    flash(message);
    if (event) router.replace(ROUTES.eventEdit(event.eventId));
  };

  return (
    <>
      <PageHeader title="행사 등록" subtitle="등록 직후에는 작성 중 상태입니다 — 게시는 저장 후 이어집니다" showBack />
      <PageBody>
        <EventForm
          initial={null}
          busy={pending}
          canManage={canManage}
          lockedHint={NO_MANAGE}
          submitLabel="등록"
          onSubmit={(input) => void save(input)}
        />
      </PageBody>
    </>
  );
}
