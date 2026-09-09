"use client";

import { useState } from "react";
import type { AnswerValue } from "@ssccops/form-renderer";
import { toScheduleParts, type ScheduleParts } from "./schedule-text";

/*
 * 정기 일정 드롭다운의 선택 상태 (#349).
 *
 * ── 왜 답에서 매번 되읽지 않는가 ────────────────────────────
 * 저장되는 답은 문자열 한 칸이고 드롭다운은 그것을 조립할 뿐이지만, **선택 상태는 문자열로
 * 되읽을 수 없는 중간 상태를 갖는다.** 주기만 고르고 요일을 아직 안 고른 순간의 저장 값은
 * 빈 문자열이므로(`toScheduleText`가 반쪽 문장을 만들지 않는다), 답에서 선택을 다시 만들면
 * 방금 고른 '매주'가 렌더 한 번 만에 풀린다.
 *
 * ── 못 열면 null이고, 그 판단은 한 번뿐이다 ──────────────────
 * 드롭다운으로 열 수 없는 답(자유 입력으로 낸 기존 기획안)은 `parts`가 null이고 화면은
 * 지금까지 쓰던 자유 입력을 그대로 그린다. 그 판정을 매 렌더 다시 하지 않는 것은, 사용자가
 * 자유 입력에서 우연히 형식에 맞는 문자열을 만든 순간 칸이 드롭다운으로 튀지 않게 하려는
 * 것이다 — 쓰던 화면이 입력 도중에 바뀌면 커서와 방금 친 글자가 함께 사라진다.
 *
 * `use-curriculum-rows`와 같은 구조다. 두 문항이 같은 화면에서 같은 방식으로 동작해야
 * 하므로 한쪽만 다르게 두지 않는다.
 */
export function useScheduleParts(initialValue: AnswerValue | undefined) {
  const [parts, setParts] = useState<ScheduleParts | null>(() => {
    if (initialValue === undefined) return toScheduleParts("");
    // rspns_cn은 JSONB라 모양을 DB가 보장하지 않는다 — 문자열이 아니면 자유 입력으로 떨어뜨린다
    if (typeof initialValue !== "string") return null;
    return toScheduleParts(initialValue);
  });

  return { parts, setParts };
}
