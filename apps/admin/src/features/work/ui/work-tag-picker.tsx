"use client";

import Link from "next/link";
import type { WorkTagSummary } from "@/entities/work";
import { ROUTES } from "@/shared/config/routes";
import { Chip, Pill } from "@/shared/ui";
import { useWorkTagOptions } from "../model/use-work-tag-options";

/*
 * 업무 태그 칩 (#757 · ssccops#565).
 *
 * 표시(`WorkTagPills`)는 목록 카드·상세가, 고르기(`WorkTagPicker`)는 상세·등록이 쓴다. 고르기는
 * 폼 편집기의 라벨 칩과 같은 모양이다 — 관리 화면에서 만든 태그 중에서 켜고 끄기만 하고, 입력해서
 * 새 태그를 만드는 길은 없다(운영진 결정 · 사람마다 다르게 적으면 업무명 접두처럼 다시 난잡해진다).
 */

/** 태그 칩 표시 — 없으면 아무것도 그리지 않는다 */
export function WorkTagPills({
  tags,
  className,
}: Readonly<{ tags: readonly WorkTagSummary[]; className?: string }>) {
  if (tags.length === 0) return null;
  return (
    <div className={className ?? "flex flex-wrap gap-[6px]"}>
      {tags.map((t) => (
        <Pill key={t.workTagId} tone="blue">
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
export function WorkTagPicker({
  selected,
  onToggle,
  disabled,
}: Readonly<{
  selected: readonly number[];
  onToggle: (workTagId: number) => void;
  disabled?: boolean;
}>) {
  const options = useWorkTagOptions();
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
        <Link href={ROUTES.workTags} className="text-accent hover:underline">
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
          key={t.workTagId}
          active={selected.includes(t.workTagId)}
          onClick={() => onToggle(t.workTagId)}
          disabled={disabled}
        >
          {t.tagNm}
        </Chip>
      ))}
    </div>
  );
}
