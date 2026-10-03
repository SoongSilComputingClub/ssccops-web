"use client";

import { useState } from "react";
import type { MeetingAgenda, MeetingAgendaPromoteInput } from "@/entities/meeting";
import { CAPABILITY, useSessionStore } from "@/entities/session";
import {
  AssignableMemberSelect,
  assignableBlockReason,
  isAssignablePick,
  useAssignableMembers,
} from "@/features/member";
import {
  PRRTY_RNK_CDS,
  PRRTY_RNK_NM,
  WORK_TYPE_CDS,
  WORK_TYPE_NM,
  type PrrtyRnkCd,
  type WorkTypeCd,
} from "@/shared/config/codes";
import { FIELD_LABEL } from "@/shared/config/labels";
import { fromInput } from "@/shared/lib/date";
import { Chip, Field, Sheet, TextField, flash } from "@/shared/ui";

/*
 * 드래프트 안건 «업무로 만들기» 시트 (ADR-0059 · 서버 #625).
 *
 * **업무 등록 화면(views/operation-create)의 업무 칸을 그대로 옮겼다** — 제목·담당자·우선순위·
 * 시작/종료 일시·업무 유형. 승격의 필수 값을 서버가 지어내지 않으므로(ADR-0059 «승격의 필수 값»)
 * 화면이 등록과 같은 칸으로 받고, 제목만 안건 제목으로 미리 채운다. 등록 화면을 띄우지 않고
 * 시트로 연 것은 회의 중에 화면을 떠나지 않게 하기 위해서다 — views 슬라이스끼리는 참조하지 않아
 * 등록 화면의 상태 기계를 가져올 수도 없다.
 *
 * 빠진 칸은 총평(회고) 하나다 — 운영이 끝난 뒤 쓰는 값이라 만드는 순간에는 늘 비어 있다.
 *
 * 담당자 셀렉트·잠금 판정은 등록·수정 화면과 같은 `features/member` 한 벌이고, 후보는 업무 등록과
 * 같이 WORK_MANAGE 보유자다(#71). 시트는 열릴 때만 마운트되므로 `useState` 초깃값이 곧 폼 초깃값이다.
 */
export function PromoteAgendaSheet({
  agenda,
  pending,
  onClose,
  onSubmit,
}: Readonly<{
  agenda: MeetingAgenda;
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: MeetingAgendaPromoteInput) => void;
}>) {
  const sessionMember = useSessionStore((s) => s.member);
  const assignable = useAssignableMembers(CAPABILITY.WORK_MANAGE);

  const [title, setTitle] = useState(agenda.agendaName ?? "");
  const [pickedOwnerId, setPickedOwnerId] = useState<number | null>(null);
  const [workTypeCd, setWorkTypeCd] = useState<WorkTypeCd>("EVENT");
  const [prrtyRnkCd, setPrrtyRnkCd] = useState<PrrtyRnkCd>("NORMAL");
  const [bgngDt, setBgngDt] = useState("");
  const [endDt, setEndDt] = useState("");

  /* 기본값은 세션 본인 — 상태에 미리 넣지 않고 파생시킨다(등록 화면의 picId와 같은 이유) */
  const ownerId = pickedOwnerId ?? sessionMember?.memberId ?? null;
  const ownerReady = isAssignablePick(assignable, ownerId);
  const ownerBlockReason = assignableBlockReason(assignable, ownerReady);

  const submit = () => {
    if (!title.trim() || !bgngDt) {
      flash("제목과 시작 일시는 필수입니다");
      return;
    }
    if (ownerId === null || !ownerReady) {
      flash(ownerBlockReason || "담당자를 선택하세요");
      return;
    }
    onSubmit({
      title: title.trim(),
      itemType: workTypeCd,
      ownerId,
      startAt: fromInput(bgngDt, true),
      endAt: endDt ? fromInput(endDt, true) : null,
      priority: prrtyRnkCd,
    });
  };

  return (
    <Sheet
      open
      title="업무로 만들기"
      hint="등록하면 이 안건이 새 업무에 연결됩니다."
      onClose={onClose}
      onOk={submit}
      okLabel={pending ? "등록하는 중…" : "업무 등록"}
      okDisabled={pending || ownerBlockReason !== ""}
      okTitle={ownerBlockReason || undefined}
    >
      <div className="flex flex-col gap-[14px]">
        <Field label={FIELD_LABEL.operationTitle} required>
          <TextField
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={256}
            autoFocus
          />
        </Field>
        <Field label="담당자" required>
          <AssignableMemberSelect
            assignable={assignable}
            value={ownerId}
            onChange={setPickedOwnerId}
            blockReason={ownerBlockReason}
            hint={
              ownerId === sessionMember?.memberId
                ? "비우면 본인이 담당자가 됩니다"
                : "선택한 회원이 담당자로 등록됩니다"
            }
          />
        </Field>
        <Field label={FIELD_LABEL.workType}>
          <div className="flex flex-wrap gap-[7px] pt-[6px]">
            {WORK_TYPE_CDS.map((cd) => (
              <Chip key={cd} active={workTypeCd === cd} onClick={() => setWorkTypeCd(cd)}>
                {WORK_TYPE_NM[cd]}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label={FIELD_LABEL.priority}>
          <div className="flex flex-wrap gap-[7px] pt-[6px]">
            {PRRTY_RNK_CDS.map((cd) => (
              <Chip key={cd} active={prrtyRnkCd === cd} onClick={() => setPrrtyRnkCd(cd)}>
                {PRRTY_RNK_NM[cd]}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label={FIELD_LABEL.startAt} required>
          <TextField
            type="datetime-local"
            value={bgngDt}
            onChange={(e) => setBgngDt(e.target.value)}
          />
        </Field>
        <Field label={FIELD_LABEL.endAt}>
          <TextField
            type="datetime-local"
            value={endDt}
            onChange={(e) => setEndDt(e.target.value)}
          />
        </Field>
      </div>
    </Sheet>
  );
}
