"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createWorkTag,
  deleteWorkTag,
  fetchWorkTags,
  renameWorkTag,
  TAG_NM_MAX_LENGTH,
  WORK_TAG_ERROR,
  type WorkTag,
} from "@/entities/work";
import { syncSessionOnForbidden } from "@/entities/session";
import { ApiError } from "@/shared/lib/api/client";
import { toWorkTagErrorMessage, toWorkTagListErrorMessage } from "./work-tag-error";

/*
 * 업무 태그 관리 화면(/operations/work-tags)의 조회·만들기·이름 바꾸기·지우기 (#757 · 서버 #631).
 *
 * 구조는 행사 분류 관리(use-event-categories)와 같다 —
 * - 결과에 요청 key를 실어 loading을 파생한다(이펙트 안 setState 없음).
 * - 변이 뒤에는 목록을 다시 받는다. 정렬(이름순)과 `usageCount`는 서버가 정한다. 이때 key는
 *   바꾸지 않아 표가 «불러오는 중»으로 깜빡이지 않는다.
 * - 없는 태그(404)·이름 중복(409)이면 화면이 낡았을 수 있어 조용히 다시 받는다.
 *
 * 후보만 필요한 곳(목록 필터·지정 칩)은 이 훅을 쓰지 않는다 — use-work-tag-options.
 */

export type WorkTagsStatus = "loading" | "ready" | "error";

interface LoadedWorkTags {
  key: number;
  tags: WorkTag[];
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

export interface WorkTagAdmin {
  tags: WorkTag[];
  status: WorkTagsStatus;
  errorMessage: string;
  reload: () => void;

  /** 만들기·이름 바꾸기·지우기 중 하나가 진행 중 */
  busy: boolean;
  /** 마지막 변이가 실패한 사유. 비어 있으면 정상 */
  mutationErrorMessage: string;
  clearMutationError: () => void;

  /** 성공하면 true — 화면은 이때만 입력란을 비우고 토스트를 띄운다 */
  create: (tagNm: string) => Promise<boolean>;
  rename: (workTagId: number, tagNm: string) => Promise<boolean>;
  remove: (workTagId: number) => Promise<boolean>;
}

/** 서버 400·409를 기다리지 않고 먼저 걸러 준다. 최종 판정은 서버다(동시에 같은 이름을 넣는 경우) */
function validateName(tagNm: string, tags: readonly WorkTag[], selfId?: number): string {
  if (!tagNm) return "태그 이름을 입력하세요";
  if (tagNm.length > TAG_NM_MAX_LENGTH) {
    return `태그 이름은 ${TAG_NM_MAX_LENGTH}자를 넘을 수 없습니다`;
  }
  if (tags.some((t) => t.tagNm === tagNm && t.workTagId !== selfId)) {
    return "이미 있는 태그입니다";
  }
  return "";
}

const STALE_CODES: ReadonlySet<string> = new Set([
  WORK_TAG_ERROR.WORK_TAG_NOT_FOUND,
  WORK_TAG_ERROR.WORK_TAG_NAME_DUPLICATED,
]);

export function useWorkTags(): WorkTagAdmin {
  const [loaded, setLoaded] = useState<LoadedWorkTags | null>(null);
  const [requestKey, setRequestKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [mutationErrorMessage, setMutationErrorMessage] = useState("");

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    fetchWorkTags()
      .then((tags) => {
        if (alive) setLoaded({ key: requestKey, tags, errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (alive) {
          setLoaded({ key: requestKey, tags: [], errorMessage: toWorkTagListErrorMessage(error) });
        }
      });

    return () => {
      alive = false;
    };
  }, [requestKey]);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: WorkTagsStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";
  const tags = current?.tags ?? [];

  /* 변이 함수가 실행되는 시점에 읽을 최신값. 콜백은 한 번만 만들어 둔다 */
  const contextRef = useRef({ tags, requestKey });
  useEffect(() => {
    contextRef.current = { tags, requestKey };
  });

  /** 같은 키 위에 결과만 갈아 끼운다 (로딩 표시 없음) */
  const refresh = useCallback(async (): Promise<void> => {
    const key = contextRef.current.requestKey;
    const next = await fetchWorkTags();
    if (aliveRef.current) setLoaded({ key, tags: next, errorMessage: "" });
  }, []);

  const reload = useCallback(() => setRequestKey((k) => k + 1), []);
  const clearMutationError = useCallback(() => setMutationErrorMessage(""), []);

  // 같은 틱에 두 번 눌린 클릭은 그 사이에 렌더가 없어 상태 값이 아직 갱신되지 않는다
  const busyRef = useRef(false);

  /** 변이 한 번의 공통 절차 — 잠금 · 오류 문구 · 성공 후 재조회(재조회 실패는 변이 실패가 아니다) */
  const run = useCallback(
    async (action: () => Promise<void>): Promise<boolean> => {
      if (busyRef.current) return false;
      busyRef.current = true;
      setBusy(true);
      setMutationErrorMessage("");

      try {
        await action();
        await refresh().catch(() => {});
        return true;
      } catch (error: unknown) {
        // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
        syncSessionOnForbidden(error);
        if (aliveRef.current) setMutationErrorMessage(toWorkTagErrorMessage(error));
        if (error instanceof ApiError && STALE_CODES.has(error.code)) {
          await refresh().catch(() => {});
        }
        return false;
      } finally {
        busyRef.current = false;
        if (aliveRef.current) setBusy(false);
      }
    },
    [refresh],
  );

  const create = useCallback(
    async (rawTagNm: string): Promise<boolean> => {
      const tagNm = rawTagNm.trim();
      const invalid = validateName(tagNm, contextRef.current.tags);
      if (invalid) {
        setMutationErrorMessage(invalid);
        return false;
      }
      return run(() => createWorkTag(tagNm));
    },
    [run],
  );

  const rename = useCallback(
    async (workTagId: number, rawTagNm: string): Promise<boolean> => {
      const tagNm = rawTagNm.trim();
      const invalid = validateName(tagNm, contextRef.current.tags, workTagId);
      if (invalid) {
        setMutationErrorMessage(invalid);
        return false;
      }
      return run(() => renameWorkTag(workTagId, tagNm));
    },
    [run],
  );

  const remove = useCallback(
    (workTagId: number): Promise<boolean> => run(() => deleteWorkTag(workTagId)),
    [run],
  );

  return {
    tags,
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
    busy,
    mutationErrorMessage,
    clearMutationError,
    create,
    rename,
    remove,
  };
}
