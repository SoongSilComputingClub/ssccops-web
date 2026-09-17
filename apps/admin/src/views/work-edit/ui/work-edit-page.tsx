"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CAPABILITY } from "@/entities/session";
import type { WorkDetail } from "@/entities/work";
import { useCan } from "@/features/auth";
import {
  AssignableMemberSelect,
  assignableBlockReason,
  assignableEditHint,
  isAssignablePick,
  useAssignableMembers,
} from "@/features/member";
import { useUpdateWork, useWorkDetail } from "@/features/work";
import {
  PRRTY_RNK_CDS,
  PRRTY_RNK_NM,
  WORK_TYPE_CDS,
  WORK_TYPE_NM,
  type PrrtyRnkCd,
  type WorkTypeCd,
} from "@/shared/config/codes";
import { FIELD_LABEL } from "@/shared/config/labels";
import { ROUTES } from "@/shared/config/routes";
import { fromInput, toInput } from "@/shared/lib/date";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  PageBody,
  PageHeader,
  SectionLabel,
  TextArea,
  TextField,
  flash,
} from "@/shared/ui";

/*
 * 업무 수정 (ssccops-server OPS-004 · PATCH /v1/works/{workId}).
 *
 * 등록 화면(운영 등록 · views/operation-create)과 입력란 구성은 같지만 그 컴포넌트를 그대로
 * 재사용하지 않는다 — 그쪽은 업무·하위 업무·회의 세 종류를 한 상태 기계로 다루고 회의는
 * 아직 목 스토어라, 수정 하나를 얹으려면 '종류 고정·기존 값 불러오기·제출 시 등록 대신 수정
 * 호출'을 그 얽힌 분기 속에 끼워 넣어야 한다. 이 화면은 업무 하나만 다루므로 따로 둔다.
 *
 * **담당자는 등록 화면과 같은 셀렉트로 바꾼다**(#435 · ssccops#333). 후보는 같은 훅
 * (`useAssignableMembers` · GET /v1/members/assignable)에서 받고, 업무는 등록과 같이
 * WORK_MANAGE를 행사할 수 있는 회원으로 좁힌다. 기본값은 현재 담당자이고 요청 본문의 ownerId는
 * 고른 값이다 — 요청에 ownerId가 필수라 안 보내면 담당자가 지워진다. 후보 조회가 실패하면
 * 저장 버튼을 잠근다(등록 규칙). 현재 담당자가 후보에서 빠졌으면 «현재: 이름»으로 남겨 두고
 * 그대로 저장할 수 있게 한다 — 거절은 서버가 한다(OWNER_NOT_ACTIVE_MEMBER → VALIDATION_FAILED,
 * 문구는 서버 것을 그대로 띄운다). 위임 액션·권한 판정을 웹에 따로 두지 않는다.
 *
 * 상태(workStatus)는 이 폼에 없다 — 서버 요청 DTO 자체에 그 필드가 없어(POL-003) 상태는
 * 상세 화면의 전이 버튼으로만 바뀐다.
 */

function EditSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="h-[22px] w-2/5 rounded bg-fill" />
      <div className="mt-4 h-[200px] w-full rounded bg-fill" />
    </Card>
  );
}

export function WorkEditPage({ workId }: Readonly<{ workId: number }>) {
  const router = useRouter();
  const { work, status, errorMessage, reload } = useWorkDetail(workId);
  const canManage = useCan(CAPABILITY.WORK_MANAGE);

  if (status !== "ready" || !work) {
    return (
      <>
        <PageHeader title="업무 수정" showBack />
        <PageBody>
          {status === "loading" && <EditSkeleton />}
          {status === "not-found" && (
            <EmptyState
              message="없는 업무입니다. 목록으로 돌아가주세요."
              action={{ label: "업무 목록", onClick: () => router.replace(ROUTES.works) }}
            />
          )}
          {status !== "loading" && status !== "not-found" && (
            <EmptyState
              message={errorMessage || "업무를 불러오지 못했습니다."}
              action={{ label: "다시 시도", onClick: reload }}
            />
          )}
        </PageBody>
      </>
    );
  }

  return <WorkEditForm work={work} canManage={canManage} />;
}

/*
 * 로딩이 끝난 뒤에야 마운트되는 내부 폼이다 — useState 초깃값을 work로 잡아 두면 그 시점의
 * 스냅샷이 그대로 입력란 초깃값이 되므로, 비동기 로딩을 기다리는 동기화 로직(useEffect)이
 * 따로 필요 없다.
 */
function WorkEditForm({
  work,
  canManage,
}: Readonly<{
  work: WorkDetail;
  canManage: boolean;
}>) {
  const router = useRouter();
  const { pending, update } = useUpdateWork();
  const assignable = useAssignableMembers(CAPABILITY.WORK_MANAGE);

  const [title, setTitle] = useState(work.title);
  /* 담당자 — 기본값은 현재 담당자. 서버는 담당자 없는 업무를 만들지 않으므로 null은 정상 경로가 아니다 */
  const [ownerId, setOwnerId] = useState<number | null>(work.owner?.memberId ?? null);
  const [workType, setWorkType] = useState<WorkTypeCd>(work.workType);
  const [startAt, setStartAt] = useState(toInput(work.startAt, true));
  const [endAt, setEndAt] = useState(toInput(work.endAt, true));
  const [priority, setPriority] = useState<PrrtyRnkCd>(work.priority);
  const [generalReview, setGeneralReview] = useState(work.generalReview ?? "");

  const ownerReady = isAssignablePick(assignable, ownerId, work.owner);
  /** 담당자를 확정하지 못한 이유 — 빈 문자열이면 확정됐다. 저장 버튼의 잠금 근거이자 title이다 */
  const ownerBlockReason = assignableBlockReason(assignable, ownerReady);

  const save = async () => {
    if (!title.trim() || !startAt) {
      flash("제목과 시작 일시는 필수입니다");
      return;
    }
    if (ownerId === null || !ownerReady) {
      // 버튼이 이미 잠겨 있어 정상 경로로는 나오지 않는다
      flash(ownerBlockReason || "담당자를 선택하세요");
      return;
    }

    const { work: updated, message } = await update(work.workId, {
      title: title.trim(),
      itemType: workType,
      ownerId,
      startAt: fromInput(startAt, true),
      endAt: endAt ? fromInput(endAt, true) : null,
      priority,
      review: generalReview.trim() || null,
    });

    if (!message) return; // 진행 중 중복 클릭 — 아무것도 보내지 않았다
    flash(message);
    if (updated) router.replace(ROUTES.workDetail(work.workId));
  };

  return (
    <>
      <PageHeader title="업무 수정" subtitle={work.title} showBack />
      <PageBody>
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.1fr_1fr]">
          <Card>
            <SectionLabel className="mb-3">상위 속성 · oper</SectionLabel>
            <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
              <Field
                label={FIELD_LABEL.operationTitle}
                required
                className="col-span-1 lg:col-span-2"
              >
                <TextField value={title} onChange={(e) => setTitle(e.target.value)} />
              </Field>
              <Field label="담당자" required>
                <AssignableMemberSelect
                  assignable={assignable}
                  value={ownerId}
                  onChange={setOwnerId}
                  current={work.owner}
                  blockReason={ownerBlockReason}
                  hint={assignableEditHint(assignable, ownerId, work.owner)}
                />
              </Field>
              <Field label={FIELD_LABEL.priority}>
                <div className="flex flex-wrap gap-[7px] pt-[6px]">
                  {PRRTY_RNK_CDS.map((cd) => (
                    <Chip key={cd} active={priority === cd} onClick={() => setPriority(cd)}>
                      {PRRTY_RNK_NM[cd]}
                    </Chip>
                  ))}
                </div>
              </Field>
              <Field label={FIELD_LABEL.startAt} required>
                <TextField
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                />
              </Field>
              <Field label={FIELD_LABEL.endAt}>
                <TextField
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                />
              </Field>
            </div>
          </Card>

          <Card>
            <SectionLabel className="mb-3">추가 정보</SectionLabel>
            <div className="mb-2 text-[13.5px] text-n400">{FIELD_LABEL.workType}</div>
            <div className="mb-4 flex flex-wrap gap-[7px]">
              {WORK_TYPE_CDS.map((cd) => (
                <Chip key={cd} active={workType === cd} onClick={() => setWorkType(cd)}>
                  {WORK_TYPE_NM[cd]}
                </Chip>
              ))}
            </div>
            <Field label={FIELD_LABEL.generalReview}>
              <TextArea
                value={generalReview}
                onChange={(e) => setGeneralReview(e.target.value)}
                placeholder="운영이 끝난 뒤 쓰는 회고 (비워도 됩니다)"
              />
            </Field>
          </Card>
        </div>

        <div className="mt-5">
          <Button
            className="px-[26px] py-[11px]"
            onClick={() => void save()}
            disabled={pending || !canManage || ownerBlockReason !== ""}
            title={
              canManage
                ? ownerBlockReason || undefined
                : "업무를 수정할 권한이 없습니다 — 업무 관리(WORK_MANAGE) 권한이 필요합니다"
            }
          >
            {pending ? "저장하는 중…" : "저장"}
          </Button>
          {!canManage && (
            <div className="mt-2 text-[13.5px] text-n500">
              업무를 수정할 권한이 없습니다 — 업무 관리(WORK_MANAGE) 권한이 필요합니다
            </div>
          )}
        </div>
      </PageBody>
    </>
  );
}
