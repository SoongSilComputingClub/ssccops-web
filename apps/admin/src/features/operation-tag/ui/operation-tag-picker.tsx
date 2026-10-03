"use client";

import Link from "next/link";
import type { OperationTagSummary } from "@/entities/operation-tag";
import { ROUTES } from "@/shared/config/routes";
import { Chip, FilterBar, Pill } from "@/shared/ui";
import { useOperationTagOptions } from "../model/use-operation-tag-options";

/*
 * 운영 태그 칩 (#757 · ssccops#565 → 운영 건 단위 #771 · ssccops#576).
 *
 * 표시(`OperationTagPills`)는 업무·하위 업무·회의의 목록·상세와 운영 통합이, 고르기
 * (`OperationTagPicker`)는 세 상세의 «태그 편집»과 업무 등록이, 거르기(`OperationTagFilter`)는 세
 * 목록과 운영 통합이 쓴다 — 셋이 한 태그 목록이라 칩도 한 벌이다. 고르기는 폼 편집기의 라벨 칩과
 * 같은 모양이다 — 관리 화면에서 만든 태그 중에서 켜고 끄기만 하고, 입력해서 새 태그를 만드는 길은
 * 없다(운영진 결정 · 사람마다 다르게 적으면 업무명 접두처럼 다시 난잡해진다).
 */

/** 태그 칩 표시 — 없으면 아무것도 그리지 않는다 */
export function OperationTagPills({
  tags,
  className,
}: Readonly<{ tags: readonly OperationTagSummary[]; className?: string }>) {
  if (tags.length === 0) return null;
  return (
    <div className={className ?? "flex flex-wrap gap-[6px]"}>
      {tags.map((t) => (
        <Pill key={t.operationTagId} tone="blue">
          {t.tagNm}
        </Pill>
      ))}
    </div>
  );
}

/**
 * 태그 고르기 — 고른 목록은 호출부가 쥐고, 저장(전체 교체)도 호출부가 한다.
 *
 * 후보는 이 컴포넌트가 마운트될 때 받는다 — 상세는 «태그 편집»을 열 때, 등록은 업무 유형을 골랐을
 * 때만 그리므로 보기만 하는 사람·회의 등록에 태그 목록 조회가 붙지 않는다.
 */
export function OperationTagPicker({
  selected,
  onToggle,
  disabled,
}: Readonly<{
  selected: readonly number[];
  onToggle: (operationTagId: number) => void;
  disabled?: boolean;
}>) {
  const options = useOperationTagOptions();
  if (options.loading) {
    return <div className="text-[13.5px] text-n500">태그를 불러오는 중…</div>;
  }
  if (options.errorMessage) {
    return <div className="text-[13.5px] text-danger">{options.errorMessage}</div>;
  }
  if (options.tags.length === 0) {
    return (
      <div className="text-[13.5px] text-n500">
        만든 태그가 없습니다.{" "}
        <Link href={ROUTES.operationTags} className="text-accent hover:underline">
          태그 관리
        </Link>
        에서 만들어주세요.
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-[7px]">
      {options.tags.map((t) => (
        <Chip
          key={t.operationTagId}
          active={selected.includes(t.operationTagId)}
          onClick={() => onToggle(t.operationTagId)}
          disabled={disabled}
        >
          {t.tagNm}
        </Chip>
      ))}
    </div>
  );
}

/**
 * 태그 거르기 줄 — «전체» + 태그 하나. 고른 값은 호출부가 쥐고 서버에 `tagId`로 보낸다.
 *
 * 상태 칩 줄과 다른 축이라 줄을 가른다 — 태그는 운영진이 만드는 대로 늘어 한 줄에 섞으면 상태 칩이
 * 밀려난다. 태그가 없거나 못 받았으면 줄째 없다(목록은 그대로 쓴다). 다만 이미 고른 태그가 있으면
 * 줄을 남긴다 — 후보를 다시 받다 실패해도 «전체»로 풀 길이 있어야 한다.
 */
export function OperationTagFilter({
  tagId,
  onChange,
  className,
}: Readonly<{
  tagId: number | null;
  onChange: (tagId: number | null) => void;
  className?: string;
}>) {
  const options = useOperationTagOptions();
  if (options.tags.length === 0 && tagId === null) return null;
  return (
    <FilterBar className={className ?? "-mt-[4px]"}>
      <span className="mr-[2px] text-[13.5px] text-n500">태그</span>
      <Chip active={tagId === null} onClick={() => onChange(null)}>
        전체
      </Chip>
      {options.tags.map((t) => (
        <Chip
          key={t.operationTagId}
          active={tagId === t.operationTagId}
          onClick={() => onChange(tagId === t.operationTagId ? null : t.operationTagId)}
        >
          {t.tagNm}
        </Chip>
      ))}
    </FilterBar>
  );
}
