"use client";

import { useState } from "react";
import type { SubWorkChecklistItem, SubWorkDetail } from "@/entities/sub-work";
import { WORK_STTS_NM } from "@/shared/config/codes";
import { Button, Card, EmptyState, SectionLabel, TextField } from "@/shared/ui";

/*
 * 완료 점검 목록 카드 — 체크·해제(OPS-013)와 **항목 편집**(추가·문구 수정·삭제, 서버 #307).
 *
 * ── 화면이 판정하지 않는다 ──────────────────────────────────────
 * 편집을 열지 말지는 **서버가 준 두 값**이 정한다.
 *
 * | 값 | 무엇을 여는가 |
 * |---|---|
 * | `subWork.isChecklistItemEditable` | 이 하위 업무에서 항목을 더하고 고치고 지울 수 있는가 |
 * | `item.isDeletable` | **그 항목 하나**를 지울 수 있는가 |
 *
 * 업무_상태를 보고 여기서 다시 계산하지 않는다. 규칙이 두 벌이 되면 서버 판정과 갈리고
 * **그 어긋남은 목록에서만 보인다** — `isDelayed`가 서버에서 오는 것과 같은 이유이며 이
 * 저장소가 그 자리에서 두 번 데었다(서버 #121 · #194). 이 카드가 `workStatus`를 읽는 곳은
 * 딱 하나, **지금 단계 이름을 문장에 넣을 때**뿐이다 — 그것은 판정이 아니라 표기다.
 *
 * ── 왜 잠겼는지 화면이 말한다 ───────────────────────────────────
 * 잠금은 세 갈래이고 **푸는 사람이 다르다.** 한 문장으로 뭉치면 사용자는 자기가 풀 수 있는
 * 것과 없는 것을 구별하지 못한다.
 *
 * | 갈래 | 근거 | 누가 푸나 |
 * |---|---|---|
 * | 권한 | `canActOnOwnerTasks` | 담당자·업무 관리 권한이 있는 사람 |
 * | 단계 | `isChecklistItemEditable` | 상태를 되돌릴 수 있는 사람 |
 * | 체크됨 | `item.isDeletable` | **본인** — 체크를 해제하면 풀린다 |
 *
 * ── 체크된 항목에는 삭제 버튼을 그리지 않는다 ────────────────────
 * 눌렀다 거부당하는 것보다 없는 편이 낫다. 다만 **버튼이 없는 이유는 목록 아래에 적는다** —
 * 소리 없이 사라지면 기능이 없어진 것인지 조건 때문인지 알 수 없다(AGENTS.md의 '이동은
 * 감추고, 동작은 잠근다'와 같은 판단이다).
 */

/** 항목 편집의 주체 — 서버 SubWorkOwnershipPolicy(#101)와 같은 말. 상세 화면의 수정 버튼과도 같다 */
const OWNER_OR_MANAGER = "담당자나 업무 관리(WORK_MANAGE) 권한이 있는 사람";

export interface ChecklistCardProps {
  subWork: SubWorkDetail;
  /** 하위 업무 쓰기 작업이 하나라도 날아가는 중인가 — 전이·체크·항목 편집이 잠금을 나눠 쓴다 */
  pending: boolean;
  /** 착수·완료 승인 요청·수정과 같은 축의 권한 판정 (서버 SubWorkOwnershipPolicy) */
  canActOnOwnerTasks: boolean;
  onToggle: (item: SubWorkChecklistItem) => void;
  /** 성공했으면 true — 그때만 입력칸을 비운다 */
  onAdd: (article: string) => Promise<boolean>;
  onRename: (checklistItemId: number, article: string) => Promise<boolean>;
  onRemove: (checklistItemId: number) => Promise<boolean>;
}

/** 항목 편집이 왜 잠겼는가 — 비어 있으면 잠기지 않았다 */
function editLockReason(
  subWork: SubWorkDetail,
  canActOnOwnerTasks: boolean,
): string {
  if (!canActOnOwnerTasks) {
    return `점검 항목은 ${OWNER_OR_MANAGER}이 더하고 고치고 지울 수 있습니다.`;
  }
  if (subWork.isChecklistItemEditable) return "";
  /*
   * 단계 이름은 서버가 준 업무_상태의 표시명이다(codes.ts). "검토부터 잠긴다" 같은 규칙을
   * 여기 적지 않는 이유는 그것이 서버의 판정 기준이라 바뀌면 화면 문구만 낡기 때문이다 —
   * 지금 단계를 말하고 무엇이 막혔는지만 밝힌다.
   */
  return `${WORK_STTS_NM[subWork.workStatus]} 단계에서는 점검 항목을 더하거나 고치거나 지울 수 없습니다 — 체크·해제만 할 수 있습니다.`;
}

function ChecklistRow({
  item,
  editing,
  disabled,
  onToggle,
  onRename,
  onRemove,
}: {
  item: SubWorkChecklistItem;
  editing: boolean;
  disabled: boolean;
  onToggle: () => void;
  onRename: (article: string) => Promise<boolean>;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const isDrafting = draft !== null;

  const save = async () => {
    if (draft === null) return;
    if (await onRename(draft)) setDraft(null);
  };

  return (
    <div className="flex items-center gap-[11px]">
      <button
        type="button"
        // 완료된 건은 체크를 되돌릴 수 없다 (서버 409) — 누를 수 없게 해 이유를 붙인다
        disabled={disabled}
        title={disabled ? "완료된 하위 업무는 점검 목록을 바꿀 수 없습니다" : undefined}
        onClick={onToggle}
        className="flex flex-none cursor-pointer items-center disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span
          className={
            item.isCompleted
              ? "flex size-[18px] flex-none items-center justify-center rounded-[6px] bg-accent-strong text-[11px] text-on-solid"
              : "size-[18px] flex-none rounded-[6px] shadow-[inset_0_0_0_1px_var(--color-line-strong)]"
          }
        >
          {item.isCompleted ? "✓" : ""}
        </span>
      </button>

      {isDrafting ? (
        <>
          <TextField
            value={draft}
            autoFocus
            aria-label="점검 항목 내용"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save();
              if (e.key === "Escape") setDraft(null);
            }}
            className="min-w-0 flex-1 py-[5px] text-[15.5px]"
          />
          <Button size="sm" onClick={() => void save()}>
            저장
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
            취소
          </Button>
        </>
      ) : (
        <>
          <button
            type="button"
            disabled={disabled}
            onClick={onToggle}
            className="min-w-0 flex-1 cursor-pointer text-left disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className={item.isCompleted ? "text-[15.5px] text-n400" : "text-[15.5px]"}>
              {item.article}
            </span>
          </button>
          {editing && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setDraft(item.article)}>
                수정
              </Button>
              {/*
                * 지울 수 있는 항목에만 버튼을 그린다 — 판정은 서버의 isDeletable이고, 없는
                * 이유는 목록 아래 문장이 말한다.
                */}
              {item.isDeletable && (
                <Button variant="ghost-danger" size="sm" onClick={onRemove}>
                  삭제
                </Button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export function ChecklistCard({
  subWork,
  pending,
  canActOnOwnerTasks,
  onToggle,
  onAdd,
  onRename,
  onRemove,
}: ChecklistCardProps) {
  const [editing, setEditing] = useState(false);
  const [newArticle, setNewArticle] = useState("");

  const isDone = subWork.workStatus === "DONE";
  const lockReason = editLockReason(subWork, canActOnOwnerTasks);
  const locked = lockReason !== "";
  /*
   * 잠긴 사이 상태가 바뀌면(다른 사람이 검토로 올렸다) 편집 모드가 켜진 채로 남지 않게 한다 —
   * 켜진 모드에서 버튼만 사라지면 무엇이 달라졌는지 화면이 말하지 않는다.
   */
  const isEditing = editing && !locked;

  const checkedLocked = subWork.checklist.some((i) => i.isCompleted && !i.isDeletable);
  const otherLocked = subWork.checklist.some((i) => !i.isCompleted && !i.isDeletable);

  const submitNew = async () => {
    if (await onAdd(newArticle)) setNewArticle("");
  };

  return (
    <Card>
      <div className="mb-[14px] flex items-center gap-2">
        <SectionLabel className="flex-1">완료 점검 목록</SectionLabel>
        {/*
          * 잠겨 있어도 버튼은 남기고 사유를 붙인다 — 이미 이 화면을 보고 있는 사람에게서
          * 버튼만 소리 없이 사라지면 기능이 없어진 것인지 조건 때문인지 알 수 없다.
          */}
        <Button
          variant="ghost"
          size="sm"
          disabled={locked}
          title={lockReason || undefined}
          onClick={() => setEditing((v) => !v)}
        >
          {isEditing ? "편집 마침" : "항목 편집"}
        </Button>
      </div>

      {subWork.checklist.length === 0 && !isEditing ? (
        <EmptyState message="이 유형에는 완료 점검 항목이 없습니다." padding="sm" />
      ) : (
        <div className="flex flex-col gap-[13px]">
          {subWork.checklist.map((item) => (
            <ChecklistRow
              key={item.checklistItemId}
              item={item}
              editing={isEditing}
              disabled={isDone || pending}
              onToggle={() => onToggle(item)}
              onRename={(article) => onRename(item.checklistItemId, article)}
              onRemove={() => void onRemove(item.checklistItemId)}
            />
          ))}
        </div>
      )}

      {isEditing && (
        <div className="mt-[13px] flex items-center gap-2">
          <TextField
            value={newArticle}
            placeholder="추가할 점검 항목"
            aria-label="추가할 점검 항목"
            onChange={(e) => setNewArticle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submitNew();
            }}
            className="min-w-0 flex-1 py-[5px] text-[15.5px]"
          />
          <Button size="sm" disabled={pending} onClick={() => void submitNew()}>
            추가
          </Button>
        </div>
      )}

      {/*
       * 잠긴 이유. 편집 중에도 **지울 수 없는 항목**의 사유는 따로 말한다 — 단계 잠금은 다른
       * 사람이 풀지만 체크 잠금은 본인이 체크를 해제하면 풀린다.
       */}
      {locked && <div className="mt-3 text-[13px] text-n400">{lockReason}</div>}
      {isEditing && checkedLocked && (
        <div className="mt-3 text-[13px] text-n400">
          체크된 항목에는 삭제 버튼이 없습니다 — 체크를 해제하면 지울 수 있습니다.
        </div>
      )}
      {isEditing && otherLocked && (
        <div className="mt-[6px] text-[13px] text-n400">
          지금 지울 수 없는 항목이 있습니다 — 화면을 다시 불러오면 달라질 수 있습니다.
        </div>
      )}

      {/* '2/4 완료'는 목록 길이로 다시 세지 않고 서버가 준 요약을 그대로 쓴다 */}
      <div className="mt-4 text-[14px] text-n500">
        {subWork.checklistSummary.completedCount}/{subWork.checklistSummary.totalCount} 완료
      </div>
    </Card>
  );
}
