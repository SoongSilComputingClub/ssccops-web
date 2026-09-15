"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  changeRagDocumentApplyStatus,
  deleteRagDocument,
  fetchRagDocuments,
  reindexRagDocument,
  type RagCorpusSummary,
  type RagDocument,
} from "@/entities/rag-document";
import { syncSessionOnForbidden } from "@/entities/session";
import { toRagDocumentErrorMessage } from "./rag-document-error";

/*
 * RAG 설정 화면의 목록·요약·폴링·변이 (#432).
 *
 * ── 요약을 따로 부르지 않는다 ───────────────────────────────────
 * 카드 셋(등록 문서·색인 완료·총 청크)은 **목록 응답의 `summary`를 그대로 쓴다.** 별도 요청으로
 * 나누면 두 요청 사이에 색인이 끝나 카드와 표가 다른 시점을 가리킨다(#401). 그래서 이 훅이
 * 돌려주는 `summary`와 `documents`는 언제나 같은 응답에서 온 짝이다.
 *
 * ── 폴링 ────────────────────────────────────────────────────
 * «대기»·«색인 중» 행이 **하나라도 있으면** 목록을 다시 부르고 **없으면 멈춘다.** 진행률이
 * 없으므로(서버가 배치로 임베딩을 부른다) 화면이 알아야 하는 것은 «끝났는가»뿐이다.
 *
 * 주기는 5초다. 서버 워커가 대기열을 10초마다 집고(`RagIndexingScheduler`의 `PT10S`) 동시
 * 실행이 1건이라, 그보다 촘촘히 물어도 새 상태가 나오지 않는다 — 워커 주기의 절반이면
 * 전이가 난 뒤 늦어도 한 주기 안에 화면에 뜬다.
 *
 * ── 폴링은 로딩이 아니다 ────────────────────────────────────────
 * 폴링 조회는 `requestKey`를 올리지 않고 **결과만 갈아 끼운다**. 키를 올리면 5초마다 표 전체가
 * 스켈레톤으로 깜빡이고, 그동안 열어 둔 시트의 대상 행이 사라진다(use-form-templates와 같은
 * 규칙). 검색어가 바뀔 때만 키가 오른다 — 그때는 다른 모집단이라 로딩을 보여 주는 것이 맞다.
 *
 * ── 변이 뒤에는 목록을 다시 받는다 ──────────────────────────────
 * 응답이 바뀐 행 하나를 주지만 부분 갱신하지 않는다. 시행 전환은 그 문서 하나만 바꾸지만
 * (서버 ADR-0034 — 예전에는 같은 문서의 기존 시행본이 함께 내려갔다), 재색인은 요약의
 * «색인 완료» 수를 움직이고 삭제는 총 청크를 바꾼다 — 화면이 그리는 다른 값까지 함께 움직이므로
 * 통째로 다시 부른다(AGENTS.md「부분 갱신과 재조회를 가른다」).
 */

/** 색인이 끝나기를 기다리는 동안의 재조회 주기 (ms) — 서버 워커 주기(10초)의 절반 */
export const RAG_POLL_INTERVAL_MS = 5_000;

export type RagDocumentsStatus = "loading" | "ready" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedRagDocuments {
  key: string;
  summary: RagCorpusSummary;
  documents: RagDocument[];
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

const EMPTY_SUMMARY: RagCorpusSummary = {
  registeredCount: 0,
  indexedCount: 0,
  totalChunkCount: 0,
};

/** 색인이 아직 끝나지 않은 행 — 이것이 하나라도 있으면 폴링이 돈다 */
function isIndexing(doc: RagDocument): boolean {
  return doc.indexStatus === "PENDING" || doc.indexStatus === "INDEXING";
}

export interface RagDocumentAdmin {
  documents: RagDocument[];
  summary: RagCorpusSummary;
  status: RagDocumentsStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;
  /** 색인이 끝나기를 기다리는 중인가 — 화면이 «자동으로 새로고침합니다»를 알리는 근거 */
  polling: boolean;

  /** 변이 요청이 진행 중인 문서 — 중복 클릭 방지용 */
  isBusy: (ragDocId: number) => boolean;
  /** 마지막 변이가 실패한 사유. 비어 있으면 정상 */
  actionErrorMessage: string;
  clearActionError: () => void;

  reindex: (doc: RagDocument) => Promise<void>;
  remove: (doc: RagDocument) => Promise<void>;
  /** `DRAFT → EFFECTIVE`(시행 중으로 올리기) · `EFFECTIVE → SUPERSEDED`(내려두기) */
  makeEffective: (doc: RagDocument) => Promise<void>;
  supersede: (doc: RagDocument) => Promise<void>;
  /** 업로드 직후 — 응답이 목록 한 행과 같은 모양이라 그대로 꽂고 요약은 다시 받는다 */
  refresh: () => Promise<void>;
}

export function useRagDocuments(keyword = ""): RagDocumentAdmin {
  const [loaded, setLoaded] = useState<LoadedRagDocuments | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [actionErrorMessage, setActionErrorMessage] = useState("");
  const [busyIds, setBusyIds] = useState<readonly number[]>([]);

  const requestKey = `${keyword}:${reloadKey}`;

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    fetchRagDocuments(keyword)
      .then((list) => {
        if (alive) {
          setLoaded({ key: requestKey, ...list, errorMessage: "" });
        }
      })
      .catch((error: unknown) => {
        if (alive) {
          setLoaded({
            key: requestKey,
            summary: EMPTY_SUMMARY,
            documents: [],
            errorMessage: toRagDocumentErrorMessage(error),
          });
        }
      });

    return () => {
      alive = false;
    };
  }, [requestKey, keyword]);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: RagDocumentsStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";
  const documents = current?.documents ?? [];
  const summary = current?.summary ?? EMPTY_SUMMARY;

  /** 변이 함수가 실행되는 시점에 읽을 최신 requestKey (use-form-templates와 같은 패턴) */
  const keyRef = useRef(requestKey);
  useEffect(() => {
    keyRef.current = requestKey;
  });
  /** 폴링 타이머가 읽을 최신 검색어 — 타이머를 검색어마다 새로 걸지 않기 위해서다 */
  const keywordRef = useRef(keyword);
  useEffect(() => {
    keywordRef.current = keyword;
  });

  /**
   * 같은 키 위에 결과만 갈아 끼운다 (로딩 표시 없음).
   *
   * **키를 요청 전이 아니라 응답 뒤에 읽는다.** 조회가 도는 동안 검색어가 바뀌면 그 사이에
   * 키도 바뀌는데, 요청 전에 잡아 둔 키로 쓰면 **옛 검색어로 받은 목록이 새 검색어의 자리에**
   * 꽂힌다 — 표에는 검색어와 맞지 않는 행이 뜨고, 그것을 걸러 낼 근거가 화면에 없다.
   * 응답 뒤에 읽어 그때의 검색어와 다르면 버린다: 새 키의 조회는 이미 따로 돌고 있다.
   */
  const refresh = useCallback(async (): Promise<void> => {
    const keyword = keywordRef.current;
    const next = await fetchRagDocuments(keyword);
    // 받는 사이에 검색어가 바뀌었으면 이 결과는 이미 다른 모집단의 것이다
    if (!aliveRef.current || keywordRef.current !== keyword) return;
    setLoaded({ key: keyRef.current, ...next, errorMessage: "" });
  }, []);

  /*
   * 폴링 — «대기»·«색인 중»이 하나라도 있는 동안만 돈다.
   *
   * `setInterval`이 아니라 한 번짜리 `setTimeout`을 조건이 참인 동안 다시 거는 방식이다:
   * 조회가 느릴 때 요청이 겹쳐 쌓이지 않고, 상태가 전부 끝나면 다음 타이머가 애초에 걸리지
   * 않아 **스스로 멈춘다**. 조회 실패는 삼킨다 — 일시적인 네트워크 오류로 표가 오류 화면으로
   * 바뀌면 이미 보고 있던 값까지 사라진다(다음 주기가 다시 시도한다).
   */
  const pending = documents.some(isIndexing);
  const polling = status === "ready" && pending;

  useEffect(() => {
    if (!polling) return;
    const timer = setTimeout(() => {
      void refresh().catch(() => {});
    }, RAG_POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
    /*
     * `documents`가 아니라 `loaded`를 의존성에 둔다 — 폴링이 결과를 갈아 끼울 때마다 이 효과가
     * 다시 돌아 다음 타이머를 걸고, 상태가 전부 끝난 응답에서는 `polling`이 false가 되어 줄이
     * 끊긴다.
     */
  }, [polling, loaded, refresh]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const clearActionError = useCallback(() => setActionErrorMessage(""), []);

  /*
   * 중복 제출 잠금은 상태가 아니라 ref로 건다 — 같은 틱에 두 번 눌린 클릭 사이에는 렌더가
   * 없어 상태 값이 아직 갱신되지 않는다. 화면 표시는 상태로, 실제 차단은 ref로 한다.
   */
  const busyRef = useRef(new Set<number>());

  /** 변이 하나를 감싼다 — 잠금·오류 문구·재조회가 네 조작에서 모두 같다 */
  const run = useCallback(
    async (ragDocId: number, action: () => Promise<unknown>): Promise<void> => {
      if (busyRef.current.has(ragDocId)) return;

      busyRef.current.add(ragDocId);
      setBusyIds((ids) => [...ids, ragDocId]);
      setActionErrorMessage("");

      try {
        await action();
        // 조작 자체는 끝났다 — 재조회 실패를 조작 실패로 보이게 하지 않는다
        await refresh().catch(() => {});
      } catch (error: unknown) {
        // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
        syncSessionOnForbidden(error);
        if (aliveRef.current) setActionErrorMessage(toRagDocumentErrorMessage(error));
        /*
         * 없는 문서(404)·성립하지 않는 전이면 화면이 들고 있는 목록이 이미 낡았다는 뜻이다 —
         * 그 상태로 두면 사라진 행을 계속 누르게 되므로 조용히 다시 받는다.
         */
        await refresh().catch(() => {});
      } finally {
        busyRef.current.delete(ragDocId);
        if (aliveRef.current) {
          setBusyIds((ids) => ids.filter((id) => id !== ragDocId));
        }
      }
    },
    [refresh],
  );

  const reindex = useCallback(
    (doc: RagDocument) => run(doc.ragDocId, () => reindexRagDocument(doc.ragDocId)),
    [run],
  );

  const remove = useCallback(
    (doc: RagDocument) => run(doc.ragDocId, () => deleteRagDocument(doc.ragDocId)),
    [run],
  );

  /*
   * 발효일을 실어 보내지 않는다 — 비우면 서버가 오늘을 넣는다(#401). 의결일이 따로 있는
   * 경우를 위해 API는 날짜를 받지만, 이 화면에 그 입력란을 만들지 않았다: 화면에 없는 값을
   * 입력란만 두면 사용자가 넣은 값이 저장 없이 사라지고, 반대로 지금은 «오늘부터 시행»이
   * 언제나 참이다.
   */
  const makeEffective = useCallback(
    (doc: RagDocument) =>
      run(doc.ragDocId, () => changeRagDocumentApplyStatus(doc.ragDocId, "EFFECTIVE")),
    [run],
  );

  const supersede = useCallback(
    (doc: RagDocument) =>
      run(doc.ragDocId, () => changeRagDocumentApplyStatus(doc.ragDocId, "SUPERSEDED")),
    [run],
  );

  const isBusy = useCallback((ragDocId: number) => busyIds.includes(ragDocId), [busyIds]);

  return {
    documents,
    summary,
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
    polling,
    isBusy,
    actionErrorMessage,
    clearActionError,
    reindex,
    remove,
    makeEffective,
    supersede,
    refresh,
  };
}
