"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchSubWorkChecklistHistory, type SubWorkChecklistHistoryItem } from "@/entities/sub-work";
import { toSubWorkErrorMessage } from "./sub-work-error";

/*
 * 점검 목록 변경 이력 (#543 · 서버 #307).
 *
 * 상세 조회에 얹지 않고 **절을 펼칠 때** 부른다 — 이력은 대부분의 방문에서 읽히지 않고, 상세는
 * 전이·체크마다 다시 부르므로 거기 얹으면 그때마다 이력까지 왕복한다(콘텐츠 이력 탭과 같은 판단).
 * `version`은 항목 편집이 성공할 때마다 화면이 올려 주는 값 — 펼쳐 둔 채 항목을 고치면 방금 남긴
 * 이력이 바로 보여야 한다.
 */

export type ChecklistHistoryStatus = "idle" | "loading" | "ready" | "error";

interface Loaded {
  key: string;
  items: SubWorkChecklistHistoryItem[];
  outcome: "ready" | "error";
  errorMessage: string;
}

export function useSubWorkChecklistHistory(
  subWorkId: number,
  open: boolean,
  version: number,
): {
  items: SubWorkChecklistHistoryItem[];
  status: ChecklistHistoryStatus;
  errorMessage: string;
  reload: () => void;
} {
  const [tick, setTick] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const key = `${subWorkId}|${version}|${tick}`;

  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetchSubWorkChecklistHistory(subWorkId)
      .then((items) => {
        if (alive) setLoaded({ key, items, outcome: "ready", errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (alive) {
          setLoaded({ key, items: [], outcome: "error", errorMessage: toSubWorkErrorMessage(error) });
        }
      });
    return () => {
      alive = false;
    };
  }, [subWorkId, open, key]);

  if (!open) return { items: [], status: "idle", errorMessage: "", reload };
  const current = loaded && loaded.key === key ? loaded : null;
  return {
    items: current?.items ?? [],
    status: current ? current.outcome : "loading",
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}
