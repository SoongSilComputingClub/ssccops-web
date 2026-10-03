"use client";

import { useState } from "react";
import type { WorkTag } from "@/entities/work";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { useWorkTags } from "@/features/work";
import { Button, Card, EmptyState, PageBody, PageHeader, Sheet, TextField, flash } from "@/shared/ui";

/*
 * 업무 태그 관리 (/operations/work-tags · #757 · 서버 #631 · ssccops#565).
 *
 * 모양은 폼 라벨 관리(views/form-labels)이고 행 편집·삭제는 행사 분류 관리(views/event-categories)를
 * 따른다. 폼 라벨과 갈리는 자리는 서버와 같다 — 사용_여부 토글이 없고 **이름 바꾸기·지우기**가 있다.
 * 지우면 달려 있던 업무에서 태그만 떨어지고 업무는 그대로라, 삭제 확인 창이 그 건수를 말한다.
 *
 * ── 권한 ───────────────────────────────────────────────────────
 * 목록은 WORK_READ(국원도 목록 필터로 쓰는 태그가 무엇인지 본다), 만들기·이름 바꾸기·지우기는
 * WORK_MANAGE다. 권한이 없으면 추가 줄과 «관리» 열의 수정·삭제를 잠그고 이유(`title`)와 사유 한
 * 줄을 둔다 — 행사 분류 관리와 같다(#767 · 화면 안의 버튼은 숨기지 않고 잠근다).
 */

const NO_MANAGE = "태그를 바꿀 권한이 없습니다 — 업무 관리(WORK_MANAGE) 권한이 필요합니다";

/* 오류 문구를 입력란에 묶어 준다 — 색과 위치만으로는 어느 칸의 이야기인지 전달되지 않는다 */
const ADD_ERROR_ID = "work-tag-add-error";
const ROW_ERROR_ID = "work-tag-row-error";

export function WorkTagsPage() {
  const admin = useWorkTags();
  const canManage = useCan(CAPABILITY.WORK_MANAGE);

  const [newTagNm, setNewTagNm] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [editTagNm, setEditTagNm] = useState("");
  const [deleting, setDeleting] = useState<WorkTag | null>(null);

  /* 훅은 마지막 변이의 실패 사유 하나만 든다 — 어디에 붙일지는 화면이 정한다 (행사 분류와 같다) */
  const [errorScope, setErrorScope] = useState<"add" | "row">("add");
  const addError = Boolean(admin.mutationErrorMessage) && errorScope === "add";
  const rowError = Boolean(admin.mutationErrorMessage) && errorScope === "row";

  const add = async () => {
    const tagNm = newTagNm.trim();
    setErrorScope("add");
    if (await admin.create(newTagNm)) {
      setNewTagNm("");
      flash(`${tagNm} 태그 추가됨`);
    }
  };

  const saveEdit = async (t: WorkTag) => {
    const next = editTagNm.trim();
    setErrorScope("row");
    if (await admin.rename(t.workTagId, editTagNm)) {
      setEditing(null);
      flash(next === t.tagNm ? `${t.tagNm} 그대로 저장됨` : `${t.tagNm} → ${next}`);
    }
  };

  const startEdit = (t: WorkTag) => {
    admin.clearMutationError();
    setEditing(t.workTagId);
    setEditTagNm(t.tagNm);
  };

  const confirmDelete = async (t: WorkTag) => {
    setDeleting(null);
    setErrorScope("row");
    if (await admin.remove(t.workTagId)) flash(`${t.tagNm} 태그 삭제됨`);
  };

  return (
    <>
      <PageHeader title="업무 태그 관리" subtitle="업무에 다는 태그 목록" />
      <PageBody>
        <div className="mb-4 max-w-[640px]">
          {/*
            추가 행에는 라벨을 세우지 않는다 — 입력과 «추가» 버튼이 한 줄에 서는 자리다.
            placeholder에 보이는 이름을 `aria-label`로 붙인다 (폼 라벨 관리와 같다 · #486).
          */}
          <div className="flex items-center gap-2">
            <TextField
              aria-label="태그 이름"
              value={newTagNm}
              onChange={(e) => setNewTagNm(e.target.value)}
              // 엔터로도 추가한다 — 여러 개를 이어서 넣는 화면이라 매번 버튼까지 가지 않게
              onKeyDown={(e) => {
                if (e.key === "Enter" && canManage) void add();
              }}
              disabled={!canManage}
              invalid={addError}
              aria-describedby={addError ? ADD_ERROR_ID : undefined}
              placeholder="새 태그 이름 (예: 학술국)"
              /* min-w-0: input 기본 폭 아래로 줄게 · 16px: iOS 확대 방지 (폼 라벨 관리와 같다) */
              className="w-full max-w-[260px] min-w-0 text-[16px] lg:text-[15.5px]"
            />
            <Button
              onClick={() => void add()}
              disabled={admin.busy || !canManage}
              title={canManage ? undefined : NO_MANAGE}
            >
              {admin.busy ? "처리 중…" : "추가"}
            </Button>
          </div>
          {addError && (
            <div
              id={ADD_ERROR_ID}
              role="alert"
              className="mt-[6px] text-[13.5px] text-danger"
            >
              {admin.mutationErrorMessage}
            </div>
          )}
          {!canManage && (
            <div className="mt-[6px] text-[13px] text-n500">{NO_MANAGE}</div>
          )}
        </div>

        {admin.status === "loading" && <EmptyState message="불러오는 중…" />}
        {admin.status === "error" && (
          <EmptyState
            message={admin.errorMessage || "태그를 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: admin.reload }}
          />
        )}

        {admin.status === "ready" &&
          (admin.tags.length === 0 ? (
            <EmptyState message="아직 태그가 없습니다." />
          ) : (
            <>
              {rowError && (
                <div
                  id={ROW_ERROR_ID}
                  role="alert"
                  className="mb-3 max-w-[640px] text-[13.5px] text-danger"
                >
                  {admin.mutationErrorMessage}
                </div>
              )}
              <Card className="max-w-[640px] px-5 pt-4 pb-[6px]">
                <div className="grid grid-cols-[1fr_64px_96px] lg:grid-cols-[1fr_96px_120px]">
                  {["태그 이름", "업무", "관리"].map((h) => (
                    <div key={h} className="pb-[10px] text-[13px] tracking-[.3px] text-n500">
                      {h}
                    </div>
                  ))}
                  {admin.tags.map((t) => (
                    <TagRow
                      key={t.workTagId}
                      tag={t}
                      canManage={canManage}
                      busy={admin.busy}
                      isEditing={editing === t.workTagId}
                      editTagNm={editTagNm}
                      rowError={rowError}
                      onEditChange={setEditTagNm}
                      onStartEdit={() => startEdit(t)}
                      onSave={() => void saveEdit(t)}
                      onCancel={() => setEditing(null)}
                      onDelete={() => setDeleting(t)}
                    />
                  ))}
                </div>
              </Card>
            </>
          ))}

        <div className="mt-3 max-w-[640px] text-[13.5px] leading-[1.7] text-n500">
          업무에는 여기서 만든 태그만 달 수 있습니다. 이름을 바꾸면 달려 있는 업무에도 새 이름으로
          보입니다.
        </div>

        <Sheet
          open={deleting !== null}
          title="태그 삭제"
          hint={
            deleting && deleting.usageCount > 0
              ? `이 태그가 달린 업무 ${deleting.usageCount}건에서 태그가 떨어집니다. 업무는 그대로 남습니다.`
              : "이 태그가 달린 업무는 없습니다."
          }
          okLabel="삭제"
          okDisabled={admin.busy}
          onClose={() => setDeleting(null)}
          onOk={() => {
            if (deleting) void confirmDelete(deleting);
          }}
        >
          <div className="text-[15px] font-semibold">{deleting?.tagNm}</div>
        </Sheet>
      </PageBody>
    </>
  );
}

/** 표 한 행 — 이름 칸이 보기·편집 둘을 오간다 */
function TagRow({
  tag,
  canManage,
  busy,
  isEditing,
  editTagNm,
  rowError,
  onEditChange,
  onStartEdit,
  onSave,
  onCancel,
  onDelete,
}: Readonly<{
  tag: WorkTag;
  canManage: boolean;
  busy: boolean;
  isEditing: boolean;
  editTagNm: string;
  rowError: boolean;
  onEditChange: (value: string) => void;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}>) {
  return (
    <div className="contents">
      <div className="min-w-0 border-t border-hairline py-3 text-[15px]">
        {isEditing ? (
          <input
            value={editTagNm}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave();
              if (e.key === "Escape") onCancel();
            }}
            autoFocus
            aria-label={`${tag.tagNm} 태그 이름`}
            aria-invalid={rowError || undefined}
            aria-describedby={rowError ? ROW_ERROR_ID : undefined}
            className="w-full max-w-[240px] rounded-[8px] border border-accent bg-bg px-2 py-1 text-[16px] outline-none focus-visible:ring-2 focus-visible:ring-accent/40 lg:text-[14.5px]"
          />
        ) : (
          <span className="font-medium break-words">{tag.tagNm}</span>
        )}
      </div>
      <div className="border-t border-hairline py-3 text-[14.5px] text-n400">{tag.usageCount}건</div>
      <div className="flex gap-3 border-t border-hairline py-3 text-[14px]">
        {isEditing ? (
          <>
            <button
              type="button"
              onClick={onSave}
              disabled={busy}
              className="cursor-pointer text-accent disabled:cursor-not-allowed disabled:opacity-45"
            >
              저장
            </button>
            <button type="button" onClick={onCancel} className="cursor-pointer text-n400">
              취소
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onStartEdit}
              disabled={!canManage || busy}
              title={canManage ? undefined : NO_MANAGE}
              className="cursor-pointer text-accent disabled:cursor-not-allowed disabled:opacity-45"
            >
              수정
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={!canManage || busy}
              title={canManage ? undefined : NO_MANAGE}
              className="cursor-pointer text-n400 hover:text-danger disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:text-n400"
            >
              삭제
            </button>
          </>
        )}
      </div>
    </div>
  );
}
