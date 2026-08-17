"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  SubWorkChecklistItem,
  SubWorkDetail,
  SubWorkTransition,
} from "@/entities/sub-work";
import { REJECT_REASON_MAX_LENGTH } from "@/entities/sub-work";
import { CAPABILITY, useSessionStore } from "@/entities/session";
import { useCan } from "@/features/auth";
import { RejectSheet } from "@/features/approval";
import { useSubWorkActions, useSubWorkDetail } from "@/features/sub-work";
import {
  APRV_STTS_NM,
  AUTZR_ROLE_NM,
  OPER_TYPE_NM,
  PRRTY_RNK_NM,
  WORK_STTS_CDS,
  WORK_STTS_NM,
  workSttsStep,
  type AutzrRoleCd,
} from "@/shared/config/codes";
import { FIELD_LABEL } from "@/shared/config/labels";
import { ROUTES } from "@/shared/config/routes";
import { ddayText, formatDt, todayInSeoul } from "@/shared/lib/date";
import {
  Badge,
  Button,
  Card,
  CircleStepper,
  EmptyState,
  KeyValueGrid,
  PageBody,
  PageHeader,
  SectionLabel,
  flash,
} from "@/shared/ui";

/*
 * 하위 업무 상세 (ssccops-server OPS-009 조회 · OPS-010 전이 · OPS-013 체크 · #39).
 *
 * 화면 한 장이 조회 **한 번**으로 채워진다 — 스테퍼·공통 속성·확장 속성·완료 점검 목록·
 * 승인 판단 근거가 모두 상세 응답에서 나온다. 목 스토어에서 회원·유형·승인 테이블을 조합하던
 * 계산은 전부 사라졌다.
 *
 * ── 버튼은 '지금 할 수 있는 전이' 하나만 그린다 ────────────────────
 * 서버의 전이표는 기획 →(착수) 진행 →(검토요청) 검토 →(승인·완료) 완료이고, 반려는 검토에서
 * 진행으로 돌아간다(TR-01~TR-04). 시안은 기획 상태의 카드에도 `완료 승인 요청`을 그리지만
 * 그 한 번으로 두 단계를 건너뛸 수는 없다 — 두 요청을 이어 보내면 앞만 성공한 채 끊겼을 때
 * 사용자가 누른 적 없는 '진행' 상태로 남는다. 그래서 기획에서는 `착수`를 보여 주고, 화면
 * 위쪽의 스테퍼가 가리키는 단계와 버튼이 언제나 같은 것을 말하게 했다.
 *
 * ── 권한과 선행 조건을 나눠서 본다 ───────────────────────────────
 * `canApprove`·`canReject`는 **권한만** 답한다(서버 #58). 버튼을 그릴지는 이 값으로 정하고,
 * 누를 수 있는지는 업무_상태·완료 점검 목록·정족수로 따로 판단한다. 둘을 한 조건에 섞으면
 * 정족수가 모자란 승인자와 권한이 아예 없는 사람이 같은 대접을 받아, 승인자에게도 버튼이
 * 사라진다. 권한 판정을 웹이 역할 이름으로 다시 계산하지 않는 것은 #29에서 정한 규칙이다.
 */

const STAGE_LABELS = WORK_STTS_CDS.map((cd) => WORK_STTS_NM[cd]);

/**
 * 완료 점검 목록을 다 채웠는가.
 *
 * 항목이 하나도 없는 유형은 **채운 것으로 본다** — 서버도 미완료 항목 수가 0인지로 판정하므로
 * (`countBySubWorkAndCompletedFalse`), 여기서 0/0을 미충족으로 두면 버튼은 잠겨 있는데 서버는
 * 허용하는 상태가 된다.
 */
function isChecklistDone(subWork: SubWorkDetail): boolean {
  const { completedCount, totalCount } = subWork.checklistSummary;
  return completedCount >= totalCount;
}

/** 완료 전환 안내 문구 — 유형이 승인자를 지정했으면 그 역할명으로 적는다 */
function approvalGuide(subWork: SubWorkDetail): string {
  if (!subWork.approvalRequired) return "승인이 필요하지 않은 유형입니다.";
  const roleName = AUTZR_ROLE_NM[subWork.authorizerRoleCode as AutzrRoleCd];
  return `완료 전환은 ${roleName ?? "승인자"} 승인이 필요합니다.`;
}

function DetailSkeleton() {
  return (
    <>
      <Card className="mb-4 animate-pulse">
        <div className="h-[28px] w-2/5 rounded bg-black/5" />
        <div className="mt-6 h-[60px] w-full rounded bg-black/5" />
      </Card>
      <div className="grid grid-cols-2 items-start gap-4">
        <Card className="animate-pulse">
          <div className="h-[240px] w-full rounded bg-black/5" />
        </Card>
        <Card className="animate-pulse">
          <div className="h-[140px] w-full rounded bg-black/5" />
        </Card>
      </div>
    </>
  );
}

export function SubWorkDetailPage({ subWorkId }: { subWorkId: number }) {
  const router = useRouter();
  const { subWork, status, errorMessage, reload, applyChecklistUpdate } =
    useSubWorkDetail(subWorkId);
  const { pending, transition, setChecklistItem } = useSubWorkActions(subWorkId);
  const [rejectOpen, setRejectOpen] = useState(false);
  const sessionMember = useSessionStore((s) => s.member);
  /* 기본 정보 수정도 WORK_MANAGE 다 (서버 SubWorkController 클래스 애노테이션) */
  const canManage = useCan(CAPABILITY.WORK_MANAGE);

  if (status !== "ready" || !subWork) {
    return (
      <>
        <PageHeader title="하위 업무 상세" showBack />
        <PageBody>
          {status === "loading" && <DetailSkeleton />}
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

  const checklistDone = isChecklistDone(subWork);
  const quorumUnmet = subWork.quorum.needed && subWork.quorum.met !== true;
  const isReview = subWork.workStatus === "REVIEW";
  const isDone = subWork.workStatus === "DONE";

  /*
   * 전이 뒤에는 상세를 통째로 다시 부른다. 전이 응답에는 업무_상태·승인_상태밖에 없는데
   * 화면은 직전 반려 사유·완료 일시·지연 여부·정족수까지 함께 그리기 때문이다 — 응답만으로
   * 부분 갱신하면 반려 직후 화면에 이전 반려 사유가 그대로 남는다.
   */
  const runTransition = async (action: SubWorkTransition, reason?: string) => {
    const { result, message } = await transition(action, reason ?? null);
    if (message) flash(message);
    if (result) reload();
  };

  const toggleChecklistItem = async (item: SubWorkChecklistItem) => {
    const { result, message } = await setChecklistItem(
      item.checklistItemId,
      !item.isCompleted,
    );
    // 성공 문구는 없다 — 체크박스가 즉시 바뀌는 것 자체가 결과다 (실패했을 때만 문구가 온다)
    if (message) flash(message);
    if (result) applyChecklistUpdate(result);
  };

  /*
   * 담당자 쪽 전이(착수·완료 승인 요청). 승인자 여부와 무관하게 업무를 다룰 수 있는 사람의
   * 몫이라 canApprove를 보지 않는다 — 서버도 이 둘에는 승인자 검사를 걸지 않는다.
   *
   * 완료 승인 요청을 완료 점검 목록으로 잠그는 것은 이슈 #39의 규칙이다. 서버는 이 단계에서
   * 체크를 보지 않지만(검사는 완료 승인에서 한다), 다 채우지 않은 채 올리면 승인자가 곧바로
   * 반려할 수밖에 없어 한 바퀴가 헛돈다.
   */
  const ownerAction: { label: string; action: SubWorkTransition } | null =
    subWork.workStatus === "PLANNING"
      ? { label: "착수", action: "START" }
      : subWork.workStatus === "IN_PROGRESS"
        ? { label: "완료 승인 요청", action: "REQUEST_REVIEW" }
        : null;
  const ownerActionBlocked = ownerAction?.action === "REQUEST_REVIEW" && !checklistDone;

  /*
   * WORK_MANAGE 보유자거나 담당자 본인만 착수·완료 승인 요청·수정을 시도할 수 있다
   * (서버 SubWorkOwnershipPolicy, #71) — 국원은 자신이 담당자인 건에서만 이 버튼들을 본다.
   * canApprove·canReject(완료 승인·반려)는 이것과 별개 축이라(승인자 판정) 그대로 둔다.
   */
  const isOwner =
    sessionMember != null &&
    subWork.owner != null &&
    sessionMember.memberId === subWork.owner.memberId;
  const canActOnOwnerTasks = canManage || isOwner;

  const approveBlockReason = !checklistDone
    ? "완료 점검 목록을 모두 체크해야 완료 승인할 수 있습니다"
    : quorumUnmet
      ? "정족수를 채워야 완료 승인할 수 있습니다"
      : "";

  const dday = ddayText(subWork.dueAt, todayInSeoul());

  return (
    <>
      <PageHeader title="하위 업무 상세" subtitle="상태 · 점검 목록 · 승인" showBack />
      <PageBody>
        <Card className="mb-4">
          <div className="flex items-center gap-[10px]">
            <div className="text-[24px] font-medium">{subWork.title}</div>
            <Badge tone="outline">{subWork.subWorkTypeName}</Badge>
            {subWork.approvalRequired && subWork.approvalStatus !== "APPROVED" && (
              <Badge tone={subWork.approvalStatus === "REJECTED" ? "red" : "amber"}>
                {APRV_STTS_NM[subWork.approvalStatus]}
              </Badge>
            )}
            {subWork.isDelayed && <Badge tone="red">지연</Badge>}
            <div className="flex-1" />
            {canActOnOwnerTasks && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(ROUTES.subWorkEdit(subWork.subWorkId))}
              >
                수정
              </Button>
            )}
            {isReview ? (
              <div className="flex gap-[9px]">
                {subWork.canReject && (
                  /*
                   * 반려는 완료 점검 목록으로 잠그지 않는다. 잠그면 항목이 덜 채워진 채 올라온
                   * 건을 승인자가 되돌릴 방법이 없어 검토 단계에 갇힌다 — 반려는 '무언가 잘못됐다'를
                   * 말하는 동작이라 조건이 갖춰졌을 때만 열리면 뜻이 뒤집힌다.
                   */
                  <Button
                    variant="ghost-danger"
                    disabled={pending}
                    onClick={() => setRejectOpen(true)}
                  >
                    반려
                  </Button>
                )}
                {subWork.canApprove && (
                  <Button
                    disabled={pending || approveBlockReason !== ""}
                    title={approveBlockReason || undefined}
                    onClick={() => void runTransition("APPROVE_COMPLETE")}
                  >
                    완료 승인
                  </Button>
                )}
              </div>
            ) : (
              ownerAction && canActOnOwnerTasks && (
                <Button
                  disabled={pending || ownerActionBlocked}
                  title={
                    ownerActionBlocked
                      ? "완료 점검 목록을 모두 체크해야 요청할 수 있습니다"
                      : undefined
                  }
                  onClick={() => void runTransition(ownerAction.action)}
                >
                  {ownerAction.label}
                </Button>
              )
            )}
          </div>

          <CircleStepper
            steps={STAGE_LABELS}
            current={workSttsStep(subWork.workStatus)}
            className="mt-[22px]"
          />

          <div className="mt-[14px] text-center text-[13.5px] text-n400">
            {isDone
              ? `완료했습니다 · ${formatDt(subWork.completedAt) || "완료 일시 없음"}`
              : approvalGuide(subWork)}
          </div>

          {/*
           * 정족수는 완료 승인의 선행 조건이라 여기서 진행을 보여 준다. **찬반 버튼은 두지 않는다** —
           * 투표(OPS-015)는 승인함 화면의 동작이고, 이 화면의 시안에도 그 버튼이 없다.
           */}
          {subWork.quorum.needed && !isDone && (
            <div className="mt-2 text-center text-[13.5px] text-n400">
              정족수 {subWork.quorum.currentCount ?? 0}/{subWork.quorum.requiredCount ?? 0}{" "}
              동의
              {subWork.quorum.met !== true && " · 승인함에서 찬성 표를 받아야 합니다"}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-2 items-start gap-4">
          <Card>
            <SectionLabel>상위 속성 · oper</SectionLabel>
            <KeyValueGrid
              className="mt-[10px] border-b border-black/8 pb-[14px]"
              items={[
                {
                  k: FIELD_LABEL.operationId,
                  v: (
                    <span className="font-mono text-[13.5px]">{subWork.operationId}</span>
                  ),
                },
                { k: FIELD_LABEL.operationType, v: OPER_TYPE_NM[subWork.operationType] },
                { k: FIELD_LABEL.operationTitle, v: subWork.title },
                { k: FIELD_LABEL.priority, v: PRRTY_RNK_NM[subWork.priority] },
                { k: "담당자", v: subWork.owner?.name || "-" },
                // 이관 데이터는 등록자가 없다 — 서버가 null로 내린다
                { k: "등록자", v: subWork.registrant?.name || "-" },
                {
                  k: "상위 업무",
                  v: subWork.workId ? (
                    <button
                      type="button"
                      onClick={() => router.push(ROUTES.workDetail(subWork.workId))}
                      className="cursor-pointer truncate text-left hover:text-accent"
                    >
                      {subWork.workTitle || `업무 ${subWork.workId}`}
                    </button>
                  ) : (
                    <Badge tone="red">미연결</Badge>
                  ),
                },
              ]}
            />
            <SectionLabel className="mt-4 mb-[10px]">확장 속성 · sub_work</SectionLabel>
            <KeyValueGrid
              items={[
                {
                  k: FIELD_LABEL.subWorkId,
                  v: <span className="font-mono text-[13.5px]">{subWork.subWorkId}</span>,
                },
                { k: FIELD_LABEL.subWorkType, v: subWork.subWorkTypeName || "-" },
                {
                  k: "협업자",
                  /*
                   * 배정 테이블(sub_work_pic_altmnt)이 아직 매핑되지 않아 서버가 늘 빈 배열을
                   * 내린다. 행을 지우지 않는 것은 배정 기능이 붙는 순간 그대로 채워질 자리이기
                   * 때문이며, 값이 없어도 필드는 내린다는 서버의 판단과 짝이다.
                   */
                  v: subWork.collaborators.map((m) => m.name).join(", ") || "-",
                },
                {
                  k: FIELD_LABEL.dueAt,
                  v: (
                    <span className="flex items-center gap-2">
                      {formatDt(subWork.dueAt) || "-"}
                      {dday && <span className="text-n500">({dday})</span>}
                      {/* 지연은 마감 일시로 되짚지 않고 **서버 판정값**을 쓴다 */}
                      {subWork.isDelayed && <Badge tone="red">지연</Badge>}
                    </span>
                  ),
                },
                { k: FIELD_LABEL.workStatus, v: WORK_STTS_NM[subWork.workStatus] },
                { k: FIELD_LABEL.approvalStatus, v: APRV_STTS_NM[subWork.approvalStatus] },
                { k: FIELD_LABEL.workContent, v: subWork.content || "-" },
                // 등록 화면에 입력란이 없어 지금은 늘 비어 있다 (서버 #70)
                { k: FIELD_LABEL.completionCriteria, v: subWork.completionCriteria || "-" },
              ]}
            />
            {subWork.externalLink && (
              <a
                href={subWork.externalLink}
                target="_blank"
                rel="noreferrer"
                className="mt-[14px] block truncate text-[14.5px] text-accent"
              >
                {subWork.externalLink} ↗
              </a>
            )}
            {/*
             * 직전 반려 사유. 알림 채널이 없는 지금 담당자가 '무엇을 고쳐야 하는가'를 볼 수 있는
             * 유일한 자리다 — 반려 모달의 "사유는 요청자에게 전달됩니다"가 지켜지는 곳이다.
             */}
            {subWork.latestRejection && (
              <div className="mt-3 rounded-[10px] bg-danger/5 px-3 py-[10px] text-[14px] text-danger">
                <div>반려 사유 · {subWork.latestRejection.reason}</div>
                <div className="mt-[3px] text-[13px] opacity-70">
                  {subWork.latestRejection.rejector?.name || "-"} ·{" "}
                  {formatDt(subWork.latestRejection.rejectedAt) || "-"}
                </div>
              </div>
            )}
          </Card>

          <Card>
            <SectionLabel className="mb-[14px]">완료 점검 목록</SectionLabel>
            {subWork.checklist.length === 0 ? (
              <EmptyState message="이 유형에는 완료 점검 항목이 없습니다." padding="sm" />
            ) : (
              <div className="flex flex-col gap-[13px]">
                {subWork.checklist.map((item) => (
                  <button
                    key={item.checklistItemId}
                    type="button"
                    // 완료된 건은 체크를 되돌릴 수 없다 (서버 409) — 누를 수 없게 해 이유를 붙인다
                    disabled={isDone || pending}
                    title={isDone ? "완료된 하위 업무는 점검 목록을 바꿀 수 없습니다" : undefined}
                    onClick={() => void toggleChecklistItem(item)}
                    className="flex cursor-pointer items-center gap-[11px] text-left disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span
                      className={
                        item.isCompleted
                          ? "flex size-[18px] flex-none items-center justify-center rounded-[6px] bg-accent-strong text-[11px] text-white"
                          : "size-[18px] flex-none rounded-[6px] shadow-[inset_0_0_0_1px_#d1d6db]"
                      }
                    >
                      {item.isCompleted ? "✓" : ""}
                    </span>
                    <span
                      className={
                        item.isCompleted ? "text-[15.5px] text-n400" : "text-[15.5px]"
                      }
                    >
                      {item.article}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {/* '2/4 완료'는 목록 길이로 다시 세지 않고 서버가 준 요약을 그대로 쓴다 */}
            <div className="mt-4 text-[14px] text-n500">
              {subWork.checklistSummary.completedCount}/
              {subWork.checklistSummary.totalCount} 완료
            </div>
          </Card>
        </div>

        <RejectSheet
          open={rejectOpen}
          onClose={() => setRejectOpen(false)}
          maxLength={REJECT_REASON_MAX_LENGTH}
          onReject={(reason) => void runTransition("REJECT", reason)}
        />
      </PageBody>
    </>
  );
}
