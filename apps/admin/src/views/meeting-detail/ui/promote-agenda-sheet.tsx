"use client";

import { useState } from "react";
import type {
  MeetingAgenda,
  MeetingAgendaPromoteInput,
  MeetingAgendaPromoteSubWorkInput,
} from "@/entities/meeting";
import { CAPABILITY, useSessionStore } from "@/entities/session";
import {
  AssignableMemberSelect,
  assignableBlockReason,
  isAssignablePick,
  useAssignableMembers,
} from "@/features/member";
import { useActiveSubWorkTypes } from "@/features/sub-work-type";
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
import { Chip, Field, Segmented, Sheet, TextField, flash } from "@/shared/ui";
import { ParentWorkPicker, type PickedParentWork } from "./parent-work-picker";

/** 시트 맨 위의 «무엇으로 만들까» (#775 · ssccops#580) */
const PROMOTE_TARGETS = ["업무로", "하위 업무로"] as const;
type PromoteTarget = (typeof PROMOTE_TARGETS)[number];

/** 대상마다 갈리는 글자 — 시트 제목·안내·확인 버튼·끝 일시 칸 */
const TARGET_COPY: Record<
  PromoteTarget,
  { title: string; hint: string; okLabel: string; endLabel: string; endBeforeStart: string }
> = {
  업무로: {
    title: "업무로 만들기",
    hint: "등록하면 이 안건이 새 업무에 연결됩니다.",
    okLabel: "업무 등록",
    endLabel: FIELD_LABEL.endAt,
    endBeforeStart: "종료 일시가 시작 일시보다 빠릅니다",
  },
  "하위 업무로": {
    title: "하위 업무로 만들기",
    hint: "등록하면 이 안건이 새 하위 업무에 연결됩니다.",
    okLabel: "하위 업무 등록",
    endLabel: FIELD_LABEL.dueAt,
    endBeforeStart: "마감 일시가 시작 일시보다 빠릅니다",
  },
};

/*
 * 드래프트 안건 «업무로 만들기» 시트 (ADR-0059 · 서버 #625 · 하위 업무 #775 · 서버 #644).
 *
 * 맨 위 «업무로 / 하위 업무로»가 만들 대상을 가른다. 회의에서 나온 논의가 이미 있는 업무의 한
 * 갈래인 경우가 많아서다(ssccops#580). 시트를 띄우고 등록 화면으로 보내지 않는 것은 회의 화면을
 * 떠나면 안건 연결이 끊기기 때문이다 — views 슬라이스끼리는 참조하지 않아 등록 화면의 상태 기계를
 * 가져올 수도 없다.
 *
 * **칸은 등록 화면(views/operation-create)을 그대로 옮겼다.** 승격의 필수 값을 서버가 지어내지
 * 않으므로(ADR-0059 «승격의 필수 값») 화면이 등록과 같은 칸으로 받고, 제목만 안건 제목으로 미리 채운다.
 *
 * - 업무: 제목·담당자·업무 유형·우선순위·시작/종료 일시. 총평(회고)만 뺐다 — 운영이 끝난 뒤 쓰는 값이다.
 * - 하위 업무: 상위 업무·하위 업무 유형·제목·담당자·우선순위·시작/마감 일시. 등록 화면처럼 «마감
 *   일시» 한 칸이 `endAt`·`dueAt`을 함께 채운다(한쪽만 채우면 지연 판정이나 상세의 기간이 빈다 ·
 *   operation-create의 submitSubWork 주석). 업무 내용·외부 URL은 뺐다 — 선택 칸이고 상세에서 고친다.
 *
 * 제목·담당자·우선순위·두 일시는 두 대상이 함께 쓴다 — 대상을 바꿔도 적어 둔 값이 남는다(등록
 * 화면이 유형을 바꿀 때와 같다). 담당자 후보만 대상마다 다르다: 업무는 WORK_MANAGE 보유자(#71),
 * 하위 업무는 활동 회원 전체(국원도 담당자가 된다 · 등록 화면과 같다).
 *
 * 시작 일시는 등록 화면과 달리 비워 둘 수 있다(#765) — 종료된 회의의 안건을 뒤늦게 만들 때는 시작
 * 시점이 아직 정해지지 않은 경우가 많다. 비우면 `startAt`을 보내지 않는다. 종료(마감) 일시는 시작
 * 일시가 있을 때만 그보다 앞서지 않는지 본다 — 서버 규칙
 * `startAt == null || endAt == null || !endAt.isBefore(startAt)`과 같다.
 *
 * 시트는 열릴 때만 마운트되므로 `useState` 초깃값이 곧 폼 초깃값이다.
 */
export function PromoteAgendaSheet({
  agenda,
  pending,
  onClose,
  onSubmitWork,
  onSubmitSubWork,
}: Readonly<{
  agenda: MeetingAgenda;
  pending: boolean;
  onClose: () => void;
  onSubmitWork: (input: MeetingAgendaPromoteInput) => void;
  onSubmitSubWork: (input: MeetingAgendaPromoteSubWorkInput) => void;
}>) {
  const sessionMember = useSessionStore((s) => s.member);
  const [target, setTarget] = useState<PromoteTarget>("업무로");
  const toSubWork = target === "하위 업무로";
  const copy = TARGET_COPY[target];
  const assignable = useAssignableMembers(toSubWork ? undefined : CAPABILITY.WORK_MANAGE);

  const [title, setTitle] = useState(agenda.agendaName ?? "");
  const [pickedOwnerId, setPickedOwnerId] = useState<number | null>(null);
  const [prrtyRnkCd, setPrrtyRnkCd] = useState<PrrtyRnkCd>("NORMAL");
  const [bgngDt, setBgngDt] = useState("");
  const [endDt, setEndDt] = useState("");
  /* 업무만 */
  const [workTypeCd, setWorkTypeCd] = useState<WorkTypeCd>("EVENT");
  /* 하위 업무만 */
  const [parentWork, setParentWork] = useState<PickedParentWork | null>(null);
  const [subWorkTypeId, setSubWorkTypeId] = useState<number | null>(null);

  /* 기본값은 세션 본인 — 상태에 미리 넣지 않고 파생시킨다(등록 화면의 picId와 같은 이유) */
  const ownerId = pickedOwnerId ?? sessionMember?.memberId ?? null;
  const ownerReady = isAssignablePick(assignable, ownerId);
  const ownerBlockReason = assignableBlockReason(assignable, ownerReady);

  /* 두 대상이 함께 보는 검사. 통과하면 담당자 id, 막히면 null(문구는 이미 띄웠다) */
  const checkCommon = (): number | null => {
    if (!title.trim()) {
      flash("제목을 입력해주세요");
      return null;
    }
    /* datetime-local 값은 같은 길이의 "YYYY-MM-DDTHH:mm"이라 문자열 비교가 곧 시각 비교다 */
    if (bgngDt && endDt && endDt < bgngDt) {
      flash(copy.endBeforeStart);
      return null;
    }
    if (ownerId === null || !ownerReady) {
      flash(ownerBlockReason || "담당자를 선택하세요");
      return null;
    }
    return ownerId;
  };

  const submitWork = () => {
    const owner = checkCommon();
    if (owner === null) return;
    onSubmitWork({
      title: title.trim(),
      itemType: workTypeCd,
      ownerId: owner,
      startAt: bgngDt ? fromInput(bgngDt, true) : null,
      endAt: endDt ? fromInput(endDt, true) : null,
      priority: prrtyRnkCd,
    });
  };

  const submitSubWork = () => {
    if (!parentWork) {
      flash("상위 업무를 선택하세요");
      return;
    }
    if (!subWorkTypeId) {
      flash("하위 업무 유형을 선택하세요");
      return;
    }
    const owner = checkCommon();
    if (owner === null) return;
    const dueAt = endDt ? fromInput(endDt, true) : null;
    onSubmitSubWork({
      workId: parentWork.workId,
      title: title.trim(),
      subWorkTypeId,
      ownerId: owner,
      startAt: bgngDt ? fromInput(bgngDt, true) : null,
      endAt: dueAt,
      dueAt,
      priority: prrtyRnkCd,
    });
  };

  return (
    <Sheet
      open
      title={copy.title}
      hint={copy.hint}
      onClose={onClose}
      onOk={toSubWork ? submitSubWork : submitWork}
      okLabel={pending ? "등록하는 중…" : copy.okLabel}
      okDisabled={pending || ownerBlockReason !== ""}
      okTitle={ownerBlockReason || undefined}
    >
      <div className="flex flex-col gap-[14px]">
        <Segmented
          label="만들 대상"
          options={PROMOTE_TARGETS}
          value={target}
          onChange={setTarget}
        />
        {toSubWork && (
          <SubWorkPlacementFields
            parentWork={parentWork}
            onParentWorkChange={setParentWork}
            subWorkTypeId={subWorkTypeId}
            onSubWorkTypeChange={setSubWorkTypeId}
          />
        )}
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
        {!toSubWork && (
          <Field label={FIELD_LABEL.workType}>
            <div className="flex flex-wrap gap-[7px] pt-[6px]">
              {WORK_TYPE_CDS.map((cd) => (
                <Chip key={cd} active={workTypeCd === cd} onClick={() => setWorkTypeCd(cd)}>
                  {WORK_TYPE_NM[cd]}
                </Chip>
              ))}
            </div>
          </Field>
        )}
        <Field label={FIELD_LABEL.priority}>
          <div className="flex flex-wrap gap-[7px] pt-[6px]">
            {PRRTY_RNK_CDS.map((cd) => (
              <Chip key={cd} active={prrtyRnkCd === cd} onClick={() => setPrrtyRnkCd(cd)}>
                {PRRTY_RNK_NM[cd]}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label={FIELD_LABEL.startAt}>
          <TextField
            type="datetime-local"
            value={bgngDt}
            onChange={(e) => setBgngDt(e.target.value)}
          />
        </Field>
        <Field label={copy.endLabel}>
          <TextField
            type="datetime-local"
            value={endDt}
            min={bgngDt || undefined}
            onChange={(e) => setEndDt(e.target.value)}
          />
        </Field>
      </div>
    </Sheet>
  );
}

/*
 * 하위 업무가 어디에 붙고 어떤 유형인가 — 상위 업무와 하위 업무 유형 (#775).
 *
 * 유형은 등록 화면과 같이 **사용 중인 것만** 받아 칩으로 하나만 고른다(OPS-018) — 꺼진 유형을 고르면
 * 서버가 400으로 끊는데 사용자 눈에는 목록에 있던 유형을 골랐을 뿐이다. 하위 업무를 고를 때만
 * 마운트되므로 업무로 만들 때는 유형 목록을 부르지 않는다.
 */
function SubWorkPlacementFields({
  parentWork,
  onParentWorkChange,
  subWorkTypeId,
  onSubWorkTypeChange,
}: Readonly<{
  parentWork: PickedParentWork | null;
  onParentWorkChange: (work: PickedParentWork) => void;
  subWorkTypeId: number | null;
  onSubWorkTypeChange: (subWorkTypeId: number) => void;
}>) {
  const types = useActiveSubWorkTypes();

  return (
    <>
      {/* `Field`로 감싸지 않는다 — 검색칸·후보 버튼·«더 보기»가 한 묶음이라 라벨을 이을 입력이 하나가 아니다.
          이름은 검색칸이 `label`로 갖는다 */}
      <div>
        <div className="mb-[6px] text-[13.5px] text-n400">
          상위 업무<span className="ml-[2px] text-accent">*</span>
        </div>
        <ParentWorkPicker value={parentWork} onChange={onParentWorkChange} />
      </div>
      <Field label={FIELD_LABEL.subWorkType} required>
        <div className="pt-[6px]">
          {types.status === "loading" && (
            <div className="text-[13.5px] text-n500">하위 업무 유형을 불러오는 중입니다</div>
          )}
          {types.status === "error" && (
            <div className="text-[13.5px] text-danger">
              {types.errorMessage}{" "}
              <button type="button" onClick={types.reload} className="cursor-pointer underline">
                다시 시도
              </button>
            </div>
          )}
          {types.status === "ready" && types.types.length === 0 && (
            <div className="text-[13.5px] text-n500">
              쓸 수 있는 하위 업무 유형이 없습니다 — 하위 업무 유형 관리에서 등록하거나 사용을
              켜주세요
            </div>
          )}
          <div className="flex flex-wrap gap-[7px]">
            {types.types.map((t) => (
              <Chip
                key={t.subWorkTypeId}
                active={subWorkTypeId === t.subWorkTypeId}
                onClick={() => onSubWorkTypeChange(t.subWorkTypeId)}
              >
                {t.typeName}
              </Chip>
            ))}
          </div>
        </div>
      </Field>
    </>
  );
}
