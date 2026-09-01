"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchSubWork } from "@/entities/sub-work";
import { fetchWork } from "@/entities/work";
import { mtgSttsTone, prcsSeTone, type MeetingAgenda, type MeetingTransition } from "@/entities/meeting";
import { CAPABILITY } from "@/entities/session";
import { useSessionStore } from "@/entities/session";
import { useCan } from "@/features/auth";
import { useMeetingActions, useMeetingDetail } from "@/features/meeting";
import { useSubWorkList } from "@/features/sub-work";
import { useWorkList } from "@/features/work";
import {
  AGND_PRCS_SE_CDS,
  AGND_PRCS_SE_NM,
  ATND_TRGT_NM,
  MTG_SE_NM,
  MTG_STTS_NM,
  OPER_TYPE_NM,
  PRRTY_RNK_NM,
  WORK_STTS_NM,
  WORK_TYPE_NM,
  type AgndPrcsSeCd,
} from "@/shared/config/codes";
import { FIELD_LABEL } from "@/shared/config/labels";
import { ROUTES } from "@/shared/config/routes";
import { formatDt } from "@/shared/lib/date";
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  KeyValueGrid,
  PageBody,
  PageHeader,
  SectionLabel,
  Sheet,
  TextArea,
  TextField,
  flash,
} from "@/shared/ui";

/*
 * 회의 상세 (ssccops-server OPS-025 조회 · OPS-026 전이 · OPS-027~029 안건, #83 ·
 * ssccops-web#56).
 *
 * 좌측 상세 카드와 우측 안건 목록을 **이 한 번의 호출로** 채운다(work-detail-page.tsx와
 * 같은 이행). 목 스토어에서 oper·mbr 테이블을 조합하던 계산은 전부 사라졌다.
 *
 * ── 버튼은 '지금 할 수 있는 전이' 하나만 그린다 ────────────────────
 * 전이표(TR-M1~M4)는 예정 →(개회) 진행 →(회의록작성) 회의록작성 →(종료) 종료이고, 취소는
 * 예정에서만 할 수 있다. 개회·회의록작성·종료는 **회의 책임자 본인만** 할 수 있어(서버
 * MeetingEntity.applyTransition) 그 버튼은 책임자가 아닌 회원에게는 아예 그리지 않는다 —
 * 눌러도 403이 날 버튼을 보여주는 대신, 책임자가 누구인지는 상세 카드에 이미 나와 있다.
 */

/** 안건으로 연결할 수 있는 운영 건 후보 — 업무·하위 업무 목록 카드에서 뽑은 표시용 값 */
interface AgendaTargetOption {
  kind: "WORK" | "SUB_WORK";
  /** work_id 또는 sub_work_id — oper_id가 아니다. 제출 시점에 상세 조회로 oper_id를 구한다 */
  refId: number;
  ttl: string;
  meta: string;
}

function DetailSkeleton() {
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_1.6fr]">
      <Card className="animate-pulse">
        <div className="h-[22px] w-[96px] rounded-full bg-black/5" />
        <div className="mt-3 h-[28px] w-3/5 rounded bg-black/5" />
        <div className="mt-6 h-[220px] w-full rounded bg-black/5" />
      </Card>
      <Card className="animate-pulse">
        <div className="h-[18px] w-[80px] rounded bg-black/5" />
        <div className="mt-4 h-[220px] w-full rounded bg-black/5" />
      </Card>
    </div>
  );
}

/** 취소 사유 입력 시트 — 사유는 필수다(서버 422 REASON_REQUIRED) */
function CancelSheet({
  open,
  onClose,
  onCancel,
}: {
  open: boolean;
  onClose: () => void;
  onCancel: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  if (!open) return null;

  const close = () => {
    setReason("");
    onClose();
  };

  return (
    <Sheet
      open
      title="회의 취소"
      hint="취소 사유를 입력하세요 (필수)"
      onClose={close}
      onOk={() => {
        if (!reason.trim()) {
          flash("취소 사유를 입력해야 합니다");
          return;
        }
        onCancel(reason.trim());
        close();
      }}
      okLabel="취소"
    >
      <TextField
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="예: 우천으로 일정 취소"
        maxLength={500}
        autoFocus
      />
    </Sheet>
  );
}

function AgendaCard({
  agenda,
  editable,
  pending,
  onUpdate,
  onWithdraw,
  withdrawable,
}: {
  agenda: MeetingAgenda;
  editable: boolean;
  pending: boolean;
  onUpdate: (content: string, resultContent: string, processStatus: AgndPrcsSeCd) => void;
  onWithdraw: () => void;
  withdrawable: boolean;
}) {
  const router = useRouter();
  const [content, setContent] = useState(agenda.content ?? "");
  const [resultContent, setResultContent] = useState(agenda.resultContent ?? "");
  const dirty = content !== (agenda.content ?? "") || resultContent !== (agenda.resultContent ?? "");

  return (
    <div className="rounded-[12px] border border-line p-[14px]">
      <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
        <div className="text-[15px] font-semibold">안건 {agenda.agendaOrder ?? "-"}</div>
        <span className="font-mono text-[12px] text-n500">안건 #{agenda.agendaId}</span>
        <div className="flex-1" />
        <span className="text-[12.5px] text-n500">제출 {agenda.submitter?.name || "-"}</span>
        {editable && withdrawable && (
          <button
            type="button"
            disabled={pending}
            onClick={onWithdraw}
            className="cursor-pointer text-[13.5px] text-n400 hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
          >
            삭제
          </button>
        )}
      </div>
      {agenda.targetOperation ? (
        <div
          onClick={() =>
            router.push(
              agenda.targetOperation!.operationType === "WORK"
                ? ROUTES.workDetail(agenda.targetOperation!.operationId)
                : ROUTES.subWorkDetail(agenda.targetOperation!.operationId),
            )
          }
          className="mt-3 cursor-pointer rounded-[10px] bg-bg p-3 transition-opacity hover:opacity-80"
        >
          <div className="flex items-center gap-2">
            <Badge tone={agenda.targetOperation.operationType === "WORK" ? "blue" : "grey"}>
              {OPER_TYPE_NM[agenda.targetOperation.operationType]}
            </Badge>
            <span className="font-mono text-[12.5px] text-n500">
              운영 #{agenda.targetOperation.operationId}
            </span>
          </div>
          <div className="mt-1 text-[15.5px] font-semibold">{agenda.targetOperation.title}</div>
        </div>
      ) : (
        <div className="mt-3 rounded-[10px] bg-bg p-3 text-[14px] text-n500">
          {agenda.agendaName ?? "제목 없음"} · 연결된 운영 없음
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-[7px] lg:flex-nowrap">
        {AGND_PRCS_SE_CDS.map((cd) => (
          <Chip
            key={cd}
            active={agenda.processStatus === cd}
            onClick={() => editable && onUpdate(content, resultContent, cd)}
          >
            {AGND_PRCS_SE_NM[cd]}
          </Chip>
        ))}
        <div className="flex-1" />
        <Badge tone={prcsSeTone(agenda.processStatus)}>
          {agenda.processStatus ? AGND_PRCS_SE_NM[agenda.processStatus] : "-"}
        </Badge>
      </div>
      <div className="mt-3">
        <div className="mb-[6px] text-[13.5px] text-n400">{FIELD_LABEL.agendaContent}</div>
        <TextArea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="논의할 내용을 작성하세요"
          disabled={!editable}
        />
      </div>
      <div className="mt-3">
        <div className="mb-[6px] text-[13.5px] text-n400">{FIELD_LABEL.agendaResult}</div>
        <TextField
          value={resultContent}
          onChange={(e) => setResultContent(e.target.value)}
          placeholder="예: 원안 가결"
          disabled={!editable}
        />
      </div>
      {editable && dirty && (
        <Button
          className="mt-3"
          size="sm"
          disabled={pending}
          onClick={() => onUpdate(content, resultContent, agenda.processStatus ?? "PENDING")}
        >
          안건 내용 저장
        </Button>
      )}
    </div>
  );
}

export function MeetingDetailPage({ mtgId }: { mtgId: number }) {
  const router = useRouter();
  const { meeting, status, errorMessage, reload, applyAgendaUpsert, applyAgendaRemoval } =
    useMeetingDetail(mtgId);
  const { pending, transition, addAgenda, updateAgenda, withdrawAgenda, remove } =
    useMeetingActions(mtgId);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const sessionMember = useSessionStore((s) => s.member);
  const canManage = useCan(CAPABILITY.MEETING_MANAGE);
  /*
   * 삭제는 개회·종료·취소(canManage)와 다른 권한이다(서버 #125) — 회의 책임자 본인이거나
   * MEETING_MANAGE를 가졌어도 MEETING_DELETE가 따로 없으면 잠근다. 상태와 무관하게 항상
   * 노출한다(취소 버튼처럼 SCHEDULED로 좁히지 않는다) — 종료·취소된 회의도 삭제 가능하다.
   */
  const canDelete = useCan(CAPABILITY.MEETING_DELETE);
  /*
   * 안건 쓰기는 회의 관리와 **다른 권한이다** (서버 #101 · ssccops-web#82). 서버는
   * POST·PATCH·DELETE /v1/meetings/{id}/agendas 에 MEETING_AGENDA_WRITE 를 요구하고, 그 권한을
   * 국원 역할에도 준 것은 "국원은 회의를 열거나 닫지는 못해도 안건은 작성할 수 있어야 한다"는
   * 뜻이었다. 안건 UI 를 MEETING_MANAGE 로 잠가 두면 서버가 허용하는 일을 화면에서 할 수 없다 —
   * 개회·종료·취소(상태 전이)만 canManage 로 남긴다.
   */
  const canWriteAgenda = useCan(CAPABILITY.MEETING_AGENDA_WRITE);

  /*
   * 안건으로 연결할 업무·하위 업무 후보. 목록 API(OPS-008·OPS-020)는 카드에 필요한 값만
   * 내리고 oper_id를 담지 않으므로, 고른 뒤(제출 시점에) 상세 조회로 operationId를 다시
   * 구한다 — resolveTargetOperationId 참고.
   */
  const workList = useWorkList();
  const subWorkList = useSubWorkList("전체");
  const [selectedTarget, setSelectedTarget] = useState<AgendaTargetOption | null>(null);
  const [resolvingTarget, setResolvingTarget] = useState(false);
  const [newProcessStatus, setNewProcessStatus] = useState<AgndPrcsSeCd>("PENDING");
  const [newContent, setNewContent] = useState("");

  if (status !== "ready" || !meeting) {
    return (
      <>
        <PageHeader title="회의 상세" showBack />
        <PageBody>
          {status === "loading" && <DetailSkeleton />}
          {status === "not-found" && (
            <EmptyState
              message="회의를 찾을 수 없습니다 — 이미 삭제된 회의일 수 있습니다."
              action={{ label: "회의 목록", onClick: () => router.replace(ROUTES.meetings) }}
            />
          )}
          {status !== "loading" && status !== "not-found" && (
            <EmptyState
              message={errorMessage || "회의를 불러오지 못했습니다."}
              action={{ label: "다시 시도", onClick: reload }}
            />
          )}
        </PageBody>
      </>
    );
  }

  const isChair =
    sessionMember != null &&
    meeting.personInCharge != null &&
    sessionMember.memberId === meeting.personInCharge.memberId;
  const isEditable = meeting.meetingStatus !== "CLOSED" && meeting.meetingStatus !== "CANCELED";
  const isWithdrawable = meeting.meetingStatus === "SCHEDULED";

  /*
   * 전이 뒤에는 상세를 통째로 다시 부른다 — 응답에는 회의_상태밖에 없는데 화면은 미처리
   * 안건 유무처럼 다른 값과 맞물려 그려야 하기 때문이다(use-sub-work-detail의 같은 판단).
   */
  const runTransition = async (action: MeetingTransition, reason?: string) => {
    const { result, message } = await transition(action, reason ?? null);
    if (message) flash(message);
    if (result) reload();
  };

  /*
   * 고른 업무·하위 업무의 oper_id를 구한다. 목록 응답(OPS-008·OPS-020)에는 이 값이 없어
   * 상세 조회 한 번이 더 필요하다 — work_id·sub_work_id와 oper_id는 다른 식별자다.
   */
  const resolveTargetOperationId = async (target: AgendaTargetOption): Promise<number | null> => {
    try {
      return target.kind === "WORK"
        ? (await fetchWork(target.refId)).operationId
        : (await fetchSubWork(target.refId)).operationId;
    } catch {
      return null;
    }
  };

  const submitNewAgenda = async () => {
    if (!selectedTarget) {
      flash("안건으로 연결할 업무 또는 하위 업무를 선택하세요");
      return;
    }

    setResolvingTarget(true);
    const targetOperationId = await resolveTargetOperationId(selectedTarget);
    setResolvingTarget(false);
    if (targetOperationId === null) {
      flash("선택한 항목을 다시 불러오지 못했습니다. 목록을 새로고침한 뒤 다시 시도해주세요");
      return;
    }

    const { result, message } = await addAgenda({
      targetOperationId,
      agendaName: null,
      processStatus: newProcessStatus,
      content: newContent.trim() || null,
    });
    if (message) flash(message);
    if (result) {
      applyAgendaUpsert(result);
      setSelectedTarget(null);
      setNewProcessStatus("PENDING");
      setNewContent("");
    }
  };

  const saveAgenda = async (
    agendaId: number,
    content: string,
    resultContent: string,
    processStatus: AgndPrcsSeCd,
  ) => {
    const { result, message } = await updateAgenda(agendaId, {
      content: content || null,
      resultContent: resultContent || null,
      processStatus,
    });
    // 처리 구분 칩은 즉시 반영되는 것 자체가 결과다 — 실패했을 때만 문구가 필요하다
    if (message) flash(message);
    if (result) applyAgendaUpsert(result);
  };

  const removeAgenda = async (agendaId: number) => {
    const { result, message } = await withdrawAgenda(agendaId);
    if (message) flash(message);
    if (result) applyAgendaRemoval(agendaId);
  };

  const targetOptions: AgendaTargetOption[] = [
    ...workList.works.map((w) => ({
      kind: "WORK" as const,
      refId: w.workId,
      ttl: w.title,
      meta: `${WORK_TYPE_NM[w.workType]} · ${WORK_STTS_NM[w.workStatus]}`,
    })),
    ...subWorkList.subWorks.map((sw) => ({
      kind: "SUB_WORK" as const,
      refId: sw.subWorkId,
      ttl: sw.title,
      meta:
        `${sw.subWorkTypeName} · ${WORK_STTS_NM[sw.workStatus]}` +
        (sw.approvalStatus === "PENDING" ? " · 승인 대기" : ""),
    })),
  ];
  const isSameTarget = (a: AgendaTargetOption, b: AgendaTargetOption) =>
    a.kind === b.kind && a.refId === b.refId;

  const loadMoreTargets = async (list: "WORK" | "SUB_WORK") => {
    const message =
      list === "WORK" ? await workList.loadMore() : await subWorkList.loadMore();
    if (message) flash(message);
  };

  /* 지금 상태에서 회의 책임자가 누를 수 있는 전이 하나. 예정 → 개회, 진행 → 회의록작성, 회의록작성 → 종료 */
  const chairAction: { label: string; action: MeetingTransition } | null =
    meeting.meetingStatus === "SCHEDULED"
      ? { label: "개회", action: "OPEN" }
      : meeting.meetingStatus === "IN_PROGRESS"
        ? { label: "회의록작성", action: "WRITE_MINUTES" }
        : meeting.meetingStatus === "MINUTES"
          ? { label: "종료", action: "CLOSE" }
          : null;

  return (
    <>
      <PageHeader title="회의 상세" subtitle="안건 · 처리 결과" showBack />
      <PageBody>
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_1.6fr]">
          <Card>
            <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
              <Badge tone={mtgSttsTone(meeting.meetingStatus)}>
                {meeting.meetingStatus ? MTG_STTS_NM[meeting.meetingStatus] : "-"}
              </Badge>
              <span className="rounded-[6px] bg-bg px-[7px] py-[2px] font-mono text-[12.5px] text-n400">
                {FIELD_LABEL.operationId} · {meeting.operationId}
              </span>
              <div className="flex-1" />
              {isChair && chairAction && (
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => void runTransition(chairAction.action)}
                >
                  {chairAction.label}
                </Button>
              )}
              {canManage && meeting.meetingStatus === "SCHEDULED" && (
                <Button
                  variant="ghost-danger"
                  size="sm"
                  disabled={pending}
                  onClick={() => setCancelOpen(true)}
                >
                  취소
                </Button>
              )}
              <Button
                variant="danger"
                size="sm"
                disabled={!canDelete || pending}
                title={
                  canDelete
                    ? undefined
                    : "회의를 삭제할 권한이 없습니다 — 회의 삭제(MEETING_DELETE) 권한이 필요합니다"
                }
                onClick={() => setDeleteOpen(true)}
              >
                삭제
              </Button>
            </div>
            <div className="mt-2 text-[22px] font-medium">{meeting.title}</div>

            <SectionLabel className="mt-5">상위 속성 · oper</SectionLabel>
            <KeyValueGrid
              className="mt-[10px] border-b border-black/8 pb-[14px]"
              labelWidth={88}
              items={[
                {
                  k: FIELD_LABEL.operationId,
                  v: <span className="font-mono text-[13.5px]">{meeting.operationId}</span>,
                },
                { k: FIELD_LABEL.operationType, v: OPER_TYPE_NM[meeting.operationType] },
                { k: FIELD_LABEL.operationTitle, v: meeting.title },
                { k: FIELD_LABEL.startAt, v: formatDt(meeting.startAt) || "-" },
                { k: FIELD_LABEL.priority, v: PRRTY_RNK_NM[meeting.priority] },
                { k: "담당자", v: meeting.personInCharge?.name || "-" },
              ]}
            />

            <SectionLabel className="mt-4 mb-[10px]">확장 속성 · mtg</SectionLabel>
            <KeyValueGrid
              labelWidth={88}
              items={[
                {
                  k: FIELD_LABEL.meetingId,
                  v: <span className="font-mono text-[13.5px]">{meeting.meetingId}</span>,
                },
                {
                  k: FIELD_LABEL.meetingCategory,
                  v: meeting.meetingCategory ? MTG_SE_NM[meeting.meetingCategory] : "-",
                },
                { k: FIELD_LABEL.meetingPlace, v: meeting.location ?? "-" },
                { k: FIELD_LABEL.meetingOwner, v: meeting.personInCharge?.name || "-" },
                {
                  k: FIELD_LABEL.attendeeTarget,
                  v: meeting.attendeeScope ? ATND_TRGT_NM[meeting.attendeeScope] : "-",
                },
                { k: FIELD_LABEL.internalMeetingDetail, v: meeting.internalDetail ?? "-" },
                { k: FIELD_LABEL.externalMeetingSummary, v: meeting.externalSummary ?? "-" },
              ]}
            />
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <SectionLabel className="mb-3">안건 {meeting.agendas.length}건</SectionLabel>
              {meeting.agendas.length === 0 ? (
                <EmptyState message="상정된 안건이 없습니다." padding="sm" />
              ) : (
                <div className="flex flex-col gap-4">
                  {meeting.agendas.map((a) => (
                    <AgendaCard
                      key={a.agendaId}
                      agenda={a}
                      editable={isEditable && canWriteAgenda}
                      pending={pending}
                      withdrawable={isWithdrawable}
                      onUpdate={(content, resultContent, cd) =>
                        void saveAgenda(a.agendaId, content, resultContent, cd)
                      }
                      onWithdraw={() => void removeAgenda(a.agendaId)}
                    />
                  ))}
                </div>
              )}
            </Card>

            {isEditable && canWriteAgenda && (
              <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-[18px]">
                <div className="text-[16px] font-medium">안건 추가</div>
                <div className="mt-1 text-[13.5px] text-n500">
                  안건으로 올릴 업무 또는 하위 업무를 선택하고 내용을 작성하세요.
                </div>

                <div className="mt-3 flex max-h-[260px] flex-col gap-2 overflow-y-auto">
                  {(workList.status === "loading" || subWorkList.status === "loading") && (
                    <div className="p-3 text-[13.5px] text-n500">불러오는 중입니다</div>
                  )}
                  {workList.status === "error" && (
                    <div className="p-3 text-[13.5px] text-danger">
                      {workList.errorMessage || "업무 목록을 불러오지 못했습니다."}
                    </div>
                  )}
                  {subWorkList.status === "error" && (
                    <div className="p-3 text-[13.5px] text-danger">
                      {subWorkList.errorMessage || "하위 업무 목록을 불러오지 못했습니다."}
                    </div>
                  )}
                  {workList.status === "ready" &&
                    subWorkList.status === "ready" &&
                    targetOptions.length === 0 && (
                      <div className="p-3 text-[13.5px] text-n500">
                        연결할 수 있는 업무·하위 업무가 없습니다.
                      </div>
                    )}
                  {targetOptions.map((ref) => (
                    <div
                      key={`${ref.kind}-${ref.refId}`}
                      onClick={() => setSelectedTarget(ref)}
                      className={
                        selectedTarget && isSameTarget(selectedTarget, ref)
                          ? "cursor-pointer rounded-[10px] bg-accent/8 p-3 shadow-[inset_0_0_0_1px_#3182f6]"
                          : "cursor-pointer rounded-[10px] border border-line p-3 hover:border-accent"
                      }
                    >
                      <div className="flex items-center gap-2">
                        <Badge tone={ref.kind === "WORK" ? "blue" : "grey"}>
                          {ref.kind === "WORK" ? "업무" : "하위 업무"}
                        </Badge>
                      </div>
                      <div className="mt-1 text-[15px] font-semibold">{ref.ttl}</div>
                      <div className="mt-[2px] text-[13px] text-n500">{ref.meta}</div>
                    </div>
                  ))}
                  {workList.hasNext && (
                    <button
                      type="button"
                      disabled={workList.loadingMore}
                      onClick={() => void loadMoreTargets("WORK")}
                      className="cursor-pointer py-1 text-[13.5px] text-accent hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {workList.loadingMore ? "업무 불러오는 중…" : "업무 더 보기"}
                    </button>
                  )}
                  {subWorkList.hasNext && (
                    <button
                      type="button"
                      disabled={subWorkList.loadingMore}
                      onClick={() => void loadMoreTargets("SUB_WORK")}
                      className="cursor-pointer py-1 text-[13.5px] text-accent hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {subWorkList.loadingMore ? "하위 업무 불러오는 중…" : "하위 업무 더 보기"}
                    </button>
                  )}
                </div>
                {selectedTarget && (
                  <div className="mt-3 text-[13.5px] text-accent">선택됨 · {selectedTarget.ttl}</div>
                )}

                <div className="mt-3 flex gap-[7px]">
                  {AGND_PRCS_SE_CDS.map((cd) => (
                    <Chip
                      key={cd}
                      active={newProcessStatus === cd}
                      onClick={() => setNewProcessStatus(cd)}
                    >
                      {AGND_PRCS_SE_NM[cd]}
                    </Chip>
                  ))}
                </div>
                <TextArea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder={`${FIELD_LABEL.agendaContent} (선택)`}
                  className="mt-3"
                />
                <Button
                  className="mt-3"
                  disabled={pending || resolvingTarget || !selectedTarget}
                  onClick={() => void submitNewAgenda()}
                >
                  {resolvingTarget ? "연결하는 중…" : "안건 추가"}
                </Button>
              </div>
            )}
          </div>
        </div>

        <CancelSheet
          open={cancelOpen}
          onClose={() => setCancelOpen(false)}
          onCancel={(reason) => void runTransition("CANCEL", reason)}
        />

        <Sheet
          open={deleteOpen}
          title="회의 삭제"
          hint="삭제하면 되돌릴 수 없습니다."
          onClose={() => setDeleteOpen(false)}
          onOk={() => {
            setDeleteOpen(false);
            void (async () => {
              const { result, message } = await remove();
              if (message) flash(message);
              if (result) router.replace(ROUTES.meetings);
            })();
          }}
          okLabel="삭제"
        />
      </PageBody>
    </>
  );
}
