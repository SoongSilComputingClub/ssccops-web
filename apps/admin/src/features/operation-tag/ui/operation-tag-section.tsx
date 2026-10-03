"use client";

import { useState } from "react";
import type { OperationTagSummary } from "@/entities/operation-tag";
import { Button, SectionLabel, flash } from "@/shared/ui";
import { useAssignOperationTags } from "../model/use-assign-operation-tags";
import type { OperationTagSubject } from "../model/operation-tag-error";
import { OperationTagPicker, OperationTagPills } from "./operation-tag-picker";

/** 잠긴 «태그 편집»의 사유 — 업무·하위 업무·회의 모두 WORK_MANAGE다(서버 #640) */
const NO_TAG_MANAGE = "태그를 편집할 권한이 없습니다 — 업무 관리(WORK_MANAGE) 권한이 필요합니다";

/**
 * 상세의 태그 줄 (#757 · #771 · ssccops#576). 칩을 보여 주고, «태그 편집»으로 고른다.
 *
 * 업무·하위 업무·회의 상세가 같은 것을 쓴다 — 저장은 고른 목록 통째로다
 * (`PUT /v1/operations/{operationId}/tags` · 전체 교체). 세 수정(PATCH) 본문은 태그를 받지 않는다.
 * `canManage`(WORK_MANAGE)가 없으면 «태그 편집»을 잠그고 이유(`title`)를 보인다(수정·삭제와 같다 ·
 * #767 — 조회는 각 화면의 읽기 권한으로 된다). 권한 판정은 호출부가 한다(features끼리 참조하지 않는다).
 * 후보는 편집을 열 때 처음 받는다(OperationTagPicker가 마운트될 때).
 *
 * 호출부는 `key`에 칩 id를 실어 둔다 — 다시 불러온 상세가 오면 편집 상태를 버리고 새 칩으로 그린다.
 */
export function OperationTagSection({
  operationId,
  subject,
  tags,
  canManage,
  onSaved,
  className,
}: Readonly<{
  /** 상위 oper 식별자 — 업무·하위 업무·회의 id가 아니다 */
  operationId: number;
  subject: OperationTagSubject;
  tags: readonly OperationTagSummary[];
  canManage: boolean;
  onSaved: () => void;
  className?: string;
}>) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const { pending, assign } = useAssignOperationTags();

  const open = () => {
    setSelected(tags.map((t) => t.operationTagId));
    setEditing(true);
  };
  const toggle = (operationTagId: number) =>
    setSelected((ids) =>
      ids.includes(operationTagId)
        ? ids.filter((id) => id !== operationTagId)
        : [...ids, operationTagId],
    );
  const save = async () => {
    const { tags: saved, message } = await assign(operationId, selected, subject);
    if (!message) return; // 진행 중 중복 클릭
    flash(message);
    if (saved) {
      setEditing(false);
      onSaved();
    }
  };

  if (editing) {
    return (
      <div className={className ?? "mt-4 border-t border-hairline pt-4"}>
        <SectionLabel className="mb-3">태그</SectionLabel>
        <OperationTagPicker selected={selected} onToggle={toggle} disabled={pending} />
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={() => void save()} disabled={pending}>
            {pending ? "저장하는 중…" : "저장"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
            취소
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-[6px]">
      <OperationTagPills tags={tags} className="contents" />
      {tags.length === 0 && <span className="text-[13.5px] text-n500">태그 없음</span>}
      <Button
        variant="link"
        size="sm"
        onClick={open}
        disabled={!canManage}
        title={canManage ? undefined : NO_TAG_MANAGE}
      >
        태그 편집
      </Button>
    </div>
  );
}
