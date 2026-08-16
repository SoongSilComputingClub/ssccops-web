"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CAPABILITY } from "@/entities/session";
import type { WorkDetail } from "@/entities/work";
import { useCan } from "@/features/auth";
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
 * **담당자는 여기서 바꿀 수 없다.** 서버에 회원 목록 API가 없어(등록 화면과 같은 제약) 고를
 * 후보를 받아올 데가 없다. 현재 담당자 이름만 보여주고 그 식별자를 그대로 실어 보낸다 —
 * 요청 본문에 ownerId가 필수라 안 보내면 이 화면에서 담당자가 지워진다.
 *
 * 상태(workStatus)는 이 폼에 없다 — 서버 요청 DTO 자체에 그 필드가 없어(POL-003) 상태는
 * 상세 화면의 전이 버튼으로만 바뀐다.
 */

function EditSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="h-[22px] w-2/5 rounded bg-black/5" />
      <div className="mt-4 h-[200px] w-full rounded bg-black/5" />
    </Card>
  );
}

export function WorkEditPage({ workId }: { workId: number }) {
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
              message="업무를 찾을 수 없습니다. 이미 삭제된 업무일 수 있습니다."
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
}: {
  work: WorkDetail;
  canManage: boolean;
}) {
  const router = useRouter();
  const { pending, update } = useUpdateWork();

  const [title, setTitle] = useState(work.title);
  const [workType, setWorkType] = useState<WorkTypeCd>(work.workType);
  const [startAt, setStartAt] = useState(toInput(work.startAt, true));
  const [endAt, setEndAt] = useState(toInput(work.endAt, true));
  const [priority, setPriority] = useState<PrrtyRnkCd>(work.priority);
  const [generalReview, setGeneralReview] = useState(work.generalReview ?? "");

  const save = async () => {
    if (!title.trim() || !startAt) {
      flash("운영 제목 · 시작 일시는 필수입니다");
      return;
    }
    if (!work.owner) {
      // 서버는 담당자 없는 업무를 만들지 않으므로 정상 경로로는 나오지 않는다
      flash("담당자 정보를 확인할 수 없어 저장할 수 없습니다. 화면을 새로고침해주세요");
      return;
    }

    const { work: updated, message } = await update(work.workId, {
      title: title.trim(),
      itemType: workType,
      ownerId: work.owner.memberId,
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
        <div className="grid grid-cols-[1.1fr_1fr] items-start gap-4">
          <Card>
            <SectionLabel className="mb-3">상위 속성 · oper</SectionLabel>
            <div className="grid grid-cols-2 gap-[14px]">
              <Field label={FIELD_LABEL.operationTitle} required className="col-span-2">
                <TextField value={title} onChange={(e) => setTitle(e.target.value)} />
              </Field>
              <Field label="담당자">
                <div className="pt-[6px]">
                  <div className="text-[15px]">{work.owner?.name ?? "-"}</div>
                  <div className="mt-1 text-[13px] text-n500">
                    담당자 위임은 추후 지원 — 지금은 바꿀 수 없습니다
                  </div>
                </div>
              </Field>
              <Field label={FIELD_LABEL.priority}>
                <div className="flex gap-[7px] pt-[6px]">
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
            <SectionLabel className="mb-3">확장 속성 · work</SectionLabel>
            <div className="mb-2 text-[13.5px] text-n400">{FIELD_LABEL.workType}</div>
            <div className="mb-4 flex gap-[7px]">
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
                placeholder="운영 종료 후 회고 · 비워도 됩니다"
              />
            </Field>
          </Card>
        </div>

        <div className="mt-5">
          <Button
            className="px-[26px] py-[11px]"
            onClick={() => void save()}
            disabled={pending || !canManage}
            title={canManage ? undefined : "업무를 수정할 권한이 없습니다 — 운영진 권한이 필요합니다"}
          >
            {pending ? "저장하는 중…" : "저장"}
          </Button>
          {!canManage && (
            <div className="mt-2 text-[13.5px] text-n500">
              업무를 수정할 권한이 없습니다 — 운영진 권한이 필요합니다
            </div>
          )}
        </div>
      </PageBody>
    </>
  );
}
