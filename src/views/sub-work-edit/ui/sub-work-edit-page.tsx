"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CAPABILITY } from "@/entities/session";
import type { SubWorkDetail } from "@/entities/sub-work";
import { useCan } from "@/features/auth";
import { useSubWorkDetail, useUpdateSubWork } from "@/features/sub-work";
import { FIELD_LABEL } from "@/shared/config/labels";
import { PRRTY_RNK_CDS, PRRTY_RNK_NM, type PrrtyRnkCd } from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import { fromInput, toInput } from "@/shared/lib/date";
import {
  Badge,
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
 * 하위 업무 수정 (ssccops-server OPS-030 · PATCH /v1/sub-works/{subWorkId}).
 *
 * 등록 화면(운영 등록 · views/operation-create)의 하위 업무 폼과 입력란은 거의 같지만
 * 그 컴포넌트를 재사용하지 않는다 — 그쪽은 업무·하위 업무·회의 세 종류를 한 상태 기계로
 * 다루고, 무엇보다 **유형 선택 UI를 그대로 쓸 수 없다**: 등록은 유형을 고르는 화면이지만
 * 수정은 유형을 바꿀 수 없다(서버가 요청에 subWorkTypeId를 아예 받지 않는다 — 유형이 바뀌면
 * 승인 필요 여부·승인자·정족수·완료 점검 항목이 통째로 달라지는데 그 값들은 등록 시점에
 * 이미 복사돼 있다, #43 소급 금지). 유형은 읽기 전용 배지로만 보여준다.
 *
 * **담당자·상위 업무도 여기서 바꿀 수 없다.** 담당자는 회원 목록 API가 없어서(등록 화면과
 * 같은 제약), 상위 업무는 진행률 집계 경계를 다시 정의하는 별개의 결정이라 이 화면 범위 밖이다.
 *
 * 상태(workStatus)·승인_상태도 이 폼에 없다 — 서버 요청 DTO에 그 필드가 없어(POL-003) 상태는
 * 상세 화면의 전이 버튼으로만 바뀐다.
 */

function EditSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="h-[22px] w-2/5 rounded bg-black/5" />
      <div className="mt-4 h-[240px] w-full rounded bg-black/5" />
    </Card>
  );
}

export function SubWorkEditPage({ subWorkId }: { subWorkId: number }) {
  const router = useRouter();
  const { subWork, status, errorMessage, reload } = useSubWorkDetail(subWorkId);
  const canManage = useCan(CAPABILITY.WORK_MANAGE);

  if (status !== "ready" || !subWork) {
    return (
      <>
        <PageHeader title="하위 업무 수정" showBack />
        <PageBody>
          {status === "loading" && <EditSkeleton />}
          {status === "not-found" && (
            <EmptyState
              message="하위 업무를 찾을 수 없습니다. 이미 삭제된 하위 업무일 수 있습니다."
              action={{
                label: "하위 업무 목록",
                onClick: () => router.replace(ROUTES.subWorks),
              }}
            />
          )}
          {status !== "loading" && status !== "not-found" && (
            <EmptyState
              message={errorMessage || "하위 업무를 불러오지 못했습니다."}
              action={{ label: "다시 시도", onClick: reload }}
            />
          )}
        </PageBody>
      </>
    );
  }

  return <SubWorkEditForm subWork={subWork} canManage={canManage} />;
}

/*
 * 로딩이 끝난 뒤에야 마운트되는 내부 폼이다 — useState 초깃값을 subWork로 잡아 두면 그
 * 시점의 스냅샷이 그대로 입력란 초깃값이 되므로, 비동기 로딩을 기다리는 동기화 로직
 * (useEffect)이 따로 필요 없다.
 */
function SubWorkEditForm({
  subWork,
  canManage,
}: {
  subWork: SubWorkDetail;
  canManage: boolean;
}) {
  const router = useRouter();
  const { pending, update } = useUpdateSubWork();

  const [title, setTitle] = useState(subWork.title);
  const [startAt, setStartAt] = useState(toInput(subWork.startAt, true));
  /*
   * 등록 화면과 같은 규칙이다 — 화면의 '마감_일시' 한 칸이 endAt(oper 종료)과 dueAt(sub_work
   * 마감)을 함께 채운다. 값이 갈리면 지연 판정·상세의 '기간' 중 하나가 조용히 빈다.
   */
  const [dueAt, setDueAt] = useState(toInput(subWork.dueAt ?? subWork.endAt, true));
  const [priority, setPriority] = useState<PrrtyRnkCd>(subWork.priority);
  const [content, setContent] = useState(subWork.content ?? "");
  const [completionCriteria, setCompletionCriteria] = useState(
    subWork.completionCriteria ?? "",
  );
  const [externalLink, setExternalLink] = useState(subWork.externalLink ?? "");

  const save = async () => {
    if (!title.trim() || !startAt) {
      flash("운영 제목 · 시작 일시는 필수입니다");
      return;
    }
    if (!subWork.owner) {
      // 서버는 담당자 없는 하위 업무를 만들지 않으므로 정상 경로로는 나오지 않는다
      flash("담당자 정보를 확인할 수 없어 저장할 수 없습니다. 화면을 새로고침해주세요");
      return;
    }

    const ddlnDt = dueAt ? fromInput(dueAt, true) : null;
    const { subWork: updated, message } = await update(subWork.subWorkId, {
      title: title.trim(),
      ownerId: subWork.owner.memberId,
      startAt: fromInput(startAt, true),
      endAt: ddlnDt,
      dueAt: ddlnDt,
      priority,
      content: content.trim() || null,
      completionCriteria: completionCriteria.trim() || null,
      externalLink: externalLink.trim() || null,
    });

    if (!message) return; // 진행 중 중복 클릭 — 아무것도 보내지 않았다
    flash(message);
    if (updated) router.replace(ROUTES.subWorkDetail(subWork.subWorkId));
  };

  return (
    <>
      <PageHeader title="하위 업무 수정" subtitle={subWork.title} showBack />
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
                  <div className="text-[15px]">{subWork.owner?.name ?? "-"}</div>
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
              <Field label={FIELD_LABEL.dueAt}>
                <TextField
                  type="datetime-local"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                />
              </Field>
            </div>
          </Card>

          <Card>
            <SectionLabel className="mb-3">확장 속성 · sub_work</SectionLabel>
            <div className="mb-4 flex items-center gap-[8px]">
              <div className="text-[13.5px] text-n400">{FIELD_LABEL.subWorkType}</div>
              <Badge tone="outline">{subWork.subWorkTypeName}</Badge>
              <div className="text-[13px] text-n500">수정 화면에서는 바꿀 수 없습니다</div>
            </div>
            <div className="mb-4 text-[13.5px] text-n400">
              상위 업무 ·{" "}
              <span className="text-n300">{subWork.workTitle || `업무 #${subWork.workId}`}</span>
            </div>
            <div className="flex flex-col gap-[14px]">
              <Field label={FIELD_LABEL.workContent}>
                <TextField
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="무엇을 하는 하위 업무인지"
                />
              </Field>
              <Field label={FIELD_LABEL.completionCriteria}>
                <TextArea
                  value={completionCriteria}
                  onChange={(e) => setCompletionCriteria(e.target.value)}
                  placeholder="완료로 인정하는 기준 · 비워도 됩니다"
                />
              </Field>
              <Field label={FIELD_LABEL.externalUrl}>
                <TextField
                  value={externalLink}
                  onChange={(e) => setExternalLink(e.target.value)}
                  placeholder="https:// 로 시작하는 문서 · 시트 URL"
                />
              </Field>
            </div>
          </Card>
        </div>

        <div className="mt-5">
          <Button
            className="px-[26px] py-[11px]"
            onClick={() => void save()}
            disabled={pending || !canManage}
            title={
              canManage ? undefined : "하위 업무를 수정할 권한이 없습니다 — 운영진 권한이 필요합니다"
            }
          >
            {pending ? "저장하는 중…" : "저장"}
          </Button>
          {!canManage && (
            <div className="mt-2 text-[13.5px] text-n500">
              하위 업무를 수정할 권한이 없습니다 — 운영진 권한이 필요합니다
            </div>
          )}
        </div>
      </PageBody>
    </>
  );
}
