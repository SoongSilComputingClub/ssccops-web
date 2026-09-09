"use client";

import { useState } from "react";
import type { AnswerValue } from "@ssccops/form-renderer";
import { toCurriculumRows, type CurriculumRow } from "./curriculum-rows";

/*
 * 커리큘럼 표의 행 상태 (#342).
 *
 * ── 왜 답에서 매번 되읽지 않는가 ────────────────────────────
 * 저장되는 답은 문자열 한 칸이고 표는 그것을 조립할 뿐이지만, **행 목록은 문자열로 되읽을 수
 * 없는 상태를 갖는다.** '회차 추가'를 눌러 만든 빈 행은 저장 문자열에 줄을 만들지 않으므로
 * (`toCurriculumText`가 빈 행을 건너뛴다), 답에서 행을 다시 만들면 방금 추가한 칸이 렌더
 * 한 번 만에 사라진다. 주제를 지우는 중인 행도 같다.
 *
 * ── 못 열면 null이고, 그 판단은 한 번뿐이다 ──────────────────
 * 표로 열 수 없는 답(자유 입력으로 낸 기존 기획안)은 `rows`가 null이고 화면은 지금까지 쓰던
 * 자유 입력을 그대로 그린다. 그 판정을 매 렌더 다시 하지 않는 것은, 사용자가 자유 입력에서
 * 우연히 형식에 맞는 문자열을 만든 순간 칸이 표로 튀지 않게 하려는 것이다 — 쓰던 화면이
 * 입력 도중에 바뀌면 커서와 방금 친 글자가 함께 사라진다.
 *
 * 두 폼(신규 작성 · 재제출)이 모두 **답이 준비된 뒤에야** 문항을 그리는 컴포넌트를 마운트하므로
 * (신규는 `loadingDraft`, 재제출은 SSR 로더의 `ready`), 첫 마운트의 초깃값이 곧 폼 초깃값이다 —
 * 동기화용 `useEffect`가 없는 것은 이 앱의 폼이 줄곧 지켜 온 규칙이다(AGENTS.md).
 */
export function useCurriculumRows(initialValue: AnswerValue | undefined) {
  const [rows, setRows] = useState<CurriculumRow[] | null>(() => {
    if (initialValue === undefined) return [];
    // rspns_cn은 JSONB라 모양을 DB가 보장하지 않는다 — 문자열이 아니면 자유 입력으로 떨어뜨린다
    if (typeof initialValue !== "string") return null;
    return toCurriculumRows(initialValue);
  });

  return { rows, setRows };
}
