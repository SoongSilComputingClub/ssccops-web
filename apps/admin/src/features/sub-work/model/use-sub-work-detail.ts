"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchSubWork,
  SUB_WORK_ERROR,
  type SubWorkChecklistRemoval,
  type SubWorkChecklistUpdate,
  type SubWorkDetail,
} from "@/entities/sub-work";
import { ApiError } from "@/shared/lib/api/client";
import { toSubWorkErrorMessage } from "./sub-work-error";

/*
 * 하위 업무 단건 조회 훅 (OPS-009). 구조의 근거는 features/work의 use-work-detail과 같다.
 *
 * "없는 하위 업무"를 오류가 아니라 별도 상태로 나눈 것도 같은 이유다 — 오류는 재시도 버튼을
 * 주지만, 없는 건은 아무리 다시 불러도 없다. 목록으로 돌아갈 길을 준다. 소프트 삭제된 건도
 * 여기로 떨어진다(서버가 404로 막는다).
 *
 * ── 왜 체크만 따로 반영하는가 ────────────────────────────────────
 * 체크박스 하나를 누를 때마다 상세를 다시 부르면 조회가 클릭 수만큼 나가고, 그 사이 화면이
 * 잠깐 이전 상태로 돌아간다. 체크 응답(OPS-013)은 바뀐 항목과 **다시 센 요약**을 함께 주므로
 * 그 두 값만 갈아 끼우면 서버와 어긋날 여지가 없다 — 요약을 여기서 다시 세지 않는 이유다.
 *
 * 상태 전이는 반대로 **통째로 다시 부른다**(reload). 전이는 업무_상태·승인_상태만 바꾸는 것이
 * 아니라 직전 반려·완료 일시·지연 판정·정족수까지 함께 움직이는데, 전이 응답에는 앞의 둘밖에
 * 없다. 응답으로 부분 갱신하면 반려 직후 화면에 이전 반려 사유가 남는다.
 *
 * ── 항목 편집도 부분 갱신이다 (서버 #307) ────────────────────────
 * 항목 추가·문구 수정·삭제 응답도 바뀐 항목과 **다시 센 요약**을 함께 준다 — 체크와 같은
 * 규칙으로 그 두 값만 갈아 끼운다. 다만 **실패했을 때는 뷰가 reload를 부른다.** 서버가
 * 거부했다는 것은 그 사이 다른 사람이 상태를 옮겼을 수 있다는 뜻이고, 그러면 `isChecklist
 * ItemEditable`·`isDeletable`까지 낡은 값이라 목록을 새로 받아야 한다.
 */

export type SubWorkDetailStatus = "loading" | "ready" | "not-found" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedSubWorkDetail {
  key: string;
  subWork: SubWorkDetail | null;
  outcome: Exclude<SubWorkDetailStatus, "loading">;
  errorMessage: string;
}

export interface SubWorkDetailQuery {
  subWork: SubWorkDetail | null;
  status: SubWorkDetailStatus;
  errorMessage: string;
  reload: () => void;
  /** 체크·해제·문구 수정 응답을 화면에 반영한다 (다시 조회하지 않는다) */
  applyChecklistUpdate: (update: SubWorkChecklistUpdate) => void;
  /** 항목 추가 응답을 목록 끝에 붙인다 (서버 #307) */
  applyChecklistInsert: (update: SubWorkChecklistUpdate) => void;
  /**
   * 항목 삭제 응답을 반영한다 (서버 #307).
   *
   * 요약이 안 왔으면 **아무것도 하지 않고 false를 돌려준다** — 목록에서만 빼고 요약을 그대로
   * 두면 '3/4 완료'인데 줄이 셋만 보이는 화면이 된다. 그때는 뷰가 reload를 부른다.
   */
  applyChecklistRemoval: (removal: SubWorkChecklistRemoval) => boolean;
}

export function useSubWorkDetail(subWorkId: number): SubWorkDetailQuery {
  const [loaded, setLoaded] = useState<LoadedSubWorkDetail | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const requestKey = `${subWorkId}|${reloadKey}`;

  /*
   * URL의 subWorkId는 사용자가 손으로 고칠 수 있다. 숫자가 아니면 서버까지 갈 것 없이 없는
   * 하위 업무로 끊는다 — `/v1/sub-works/NaN` 같은 요청이 나가는 것을 막는다.
   */
  const isFetchable = Number.isInteger(subWorkId) && subWorkId > 0;

  useEffect(() => {
    if (!isFetchable) return;

    let alive = true;

    fetchSubWork(subWorkId)
      .then((next) => {
        if (alive) {
          setLoaded({
            key: requestKey,
            subWork: next,
            outcome: "ready",
            errorMessage: "",
          });
        }
      })
      .catch((error: unknown) => {
        if (!alive) return;

        const notFound =
          error instanceof ApiError && error.code === SUB_WORK_ERROR.NOT_FOUND;

        setLoaded({
          key: requestKey,
          subWork: null,
          outcome: notFound ? "not-found" : "error",
          errorMessage: notFound ? "" : toSubWorkErrorMessage(error),
        });
      });

    return () => {
      alive = false;
    };
  }, [subWorkId, isFetchable, requestKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const applyChecklistUpdate = useCallback((update: SubWorkChecklistUpdate) => {
    setLoaded((current) => {
      if (!current?.subWork) return current;
      return {
        ...current,
        subWork: {
          ...current.subWork,
          checklist: current.subWork.checklist.map((item) =>
            item.checklistItemId === update.item.checklistItemId ? update.item : item,
          ),
          checklistSummary: update.checklistSummary,
        },
      };
    });
  }, []);

  const applyChecklistInsert = useCallback((update: SubWorkChecklistUpdate) => {
    setLoaded((current) => {
      if (!current?.subWork) return current;
      /*
       * 서버가 끝에 붙이므로 화면도 끝에 붙인다 — sortOrder로 다시 정렬하지 않는 것은 서버가
       * 이미 그 순서로 내려주고 있어서다(SubWorkChecklistItem.sortOrder 주석).
       */
      return {
        ...current,
        subWork: {
          ...current.subWork,
          checklist: [...current.subWork.checklist, update.item],
          checklistSummary: update.checklistSummary,
        },
      };
    });
  }, []);

  const applyChecklistRemoval = useCallback((removal: SubWorkChecklistRemoval) => {
    if (!removal.checklistSummary) return false;
    const summary = removal.checklistSummary;
    setLoaded((current) => {
      if (!current?.subWork) return current;
      return {
        ...current,
        subWork: {
          ...current.subWork,
          checklist: current.subWork.checklist.filter(
            (item) => item.checklistItemId !== removal.checklistItemId,
          ),
          checklistSummary: summary,
        },
      };
    });
    return true;
  }, []);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: SubWorkDetailStatus = !isFetchable
    ? "not-found"
    : (current?.outcome ?? "loading");

  return {
    subWork: status === "ready" ? (current?.subWork ?? null) : null,
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
    applyChecklistUpdate,
    applyChecklistInsert,
    applyChecklistRemoval,
  };
}
