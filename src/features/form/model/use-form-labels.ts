"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createFormLabel,
  fetchFormLabels,
  FORM_LABEL_ERROR,
  LBL_NM_MAX_LENGTH,
  setFormLabelUse,
  type FormLabelSummary,
} from "@/entities/form";
import { ApiError } from "@/shared/lib/api/client";
import { toFormLabelErrorMessage } from "./form-error";

/*
 * 라벨 관리 화면(/forms/labels)의 목록·추가·사용_여부 토글.
 *
 * 후보 조회만 하는 use-form-label-options와 나누어 둔다 — 저쪽은 활성 라벨만 한 번 받아 오면
 * 끝이고(필터·편집기 칩), 이쪽은 비활성까지 전부 받은 뒤 계속 고친다. 한 훅에 합치면 필터
 * 화면까지 관리 화면의 변이 상태를 들고 다니게 된다.
 *
 * ── 로딩을 setState 하지 않는다 ────────────────────────────────
 * use-form-list.ts와 같은 방식이다. 조회 결과에 그 결과를 만든 요청의 key를 함께 담아 두고,
 * 지금 필요한 key와 같을 때만 결과로 인정한다 — loading은 저장하는 값이 아니라 렌더 중에
 * 계산되는 값이 되고, 이펙트 본문에서 setState 할 일이 없어진다
 * (react-hooks/set-state-in-effect).
 *
 * ── 변이 뒤에는 목록을 다시 받는다 ──────────────────────────────
 * 추가·토글이 성공해도 응답으로 배열을 고치지 않는다. "사용 중인 폼 N건"은 서버 집계
 * (`usageCount`)이고 정렬 순서도 서버가 정하는데, 웹이 그걸 흉내 내기 시작하면 화면 숫자와
 * 서버 숫자가 조용히 갈라진다.
 *
 * 단 이때 requestKey는 **바꾸지 않는다.** 키를 올리면 표 전체가 다시 "불러오는 중"으로
 * 돌아가, 토글 하나에 목록이 통째로 깜빡인다. 재조회는 같은 키 위에 결과만 갈아 끼운다 —
 * 사용자가 직접 누르는 재시도(reload)만 로딩 표시를 동반한다.
 */

export type FormLabelsStatus = "loading" | "ready" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedFormLabels {
  key: number;
  labels: FormLabelSummary[];
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

export interface FormLabelAdmin {
  labels: FormLabelSummary[];
  status: FormLabelsStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;

  /** 입력란 아래에 붙일 인라인 오류. 비어 있으면 정상 */
  addErrorMessage: string;
  adding: boolean;
  /** 성공하면 true — 화면은 이때만 입력란을 비운다 */
  add: (lblNm: string) => Promise<boolean>;

  /** 토글 요청이 진행 중인 라벨 — 중복 클릭 방지용 */
  isToggling: (formLblId: number) => boolean;
  /** 마지막 토글이 실패한 사유. 비어 있으면 정상 */
  toggleErrorMessage: string;
  toggle: (label: FormLabelSummary) => Promise<void>;
}

export function useFormLabels(): FormLabelAdmin {
  const [loaded, setLoaded] = useState<LoadedFormLabels | null>(null);
  const [requestKey, setRequestKey] = useState(0);

  const [addErrorMessage, setAddErrorMessage] = useState("");
  const [adding, setAdding] = useState(false);
  const [toggleErrorMessage, setToggleErrorMessage] = useState("");
  const [togglingIds, setTogglingIds] = useState<readonly number[]>([]);

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  /*
   * 관리 화면은 비활성 라벨까지 보여 준다 — useYn을 넘기지 않는 유일한 호출부다.
   * 여기서 활성만 받으면 "비활성화" 버튼을 누른 라벨이 목록에서 사라져, 되돌릴 방법이 없어진다.
   */
  useEffect(() => {
    let alive = true;

    fetchFormLabels()
      .then((labels) => {
        if (alive) setLoaded({ key: requestKey, labels, errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (alive) {
          setLoaded({
            key: requestKey,
            labels: [],
            errorMessage: toFormLabelErrorMessage(error),
          });
        }
      });

    return () => {
      alive = false;
    };
  }, [requestKey]);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: FormLabelsStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";
  const labels = current?.labels ?? [];

  /*
   * 변이 함수가 **실행되는 시점**에 읽을 최신값. 렌더마다 갱신한다(의존성 배열 없음) —
   * 콜백 자체는 의존성 없이 한 번만 만들어 두고, 값은 여기서 본다.
   * (use-form-editor.ts의 contextRef와 같은 패턴)
   */
  const contextRef = useRef({ labels, requestKey });
  useEffect(() => {
    contextRef.current = { labels, requestKey };
  });

  /*
   * 중복 제출 잠금은 상태가 아니라 ref로 건다. 같은 틱에 두 번 눌린 클릭은 그 사이에 렌더가
   * 없어 상태 값이 아직 갱신되지 않기 때문이다 — 화면 표시는 상태로, 실제 차단은 ref로 한다.
   */
  const busyRef = useRef({ adding: false, toggling: new Set<number>() });

  /** 같은 키 위에 결과만 갈아 끼운다 (로딩 표시 없음) */
  const refresh = useCallback(async (): Promise<void> => {
    const key = contextRef.current.requestKey;
    const next = await fetchFormLabels();
    if (aliveRef.current) setLoaded({ key, labels: next, errorMessage: "" });
  }, []);

  const reload = useCallback(() => setRequestKey((k) => k + 1), []);

  /* ── 추가 ─────────────────────────────────────────────────── */

  const add = useCallback(
    async (rawLblNm: string): Promise<boolean> => {
      const lblNm = rawLblNm.trim();

      /*
       * 클라이언트 선검사는 남긴다 — 서버도 400·409로 막지만, 왕복 한 번을 기다리지 않고
       * 바로 알려 주는 편이 낫다. **다만 최종 판정은 서버다**: 여기를 통과해도 아래 catch가
       * 서버 코드로 다시 문구를 정한다(동시에 같은 이름을 넣으면 선검사로는 못 막는다).
       */
      if (!lblNm) {
        setAddErrorMessage("라벨_명을 입력하세요");
        return false;
      }
      if (lblNm.length > LBL_NM_MAX_LENGTH) {
        setAddErrorMessage(`라벨_명은 ${LBL_NM_MAX_LENGTH}자를 넘을 수 없습니다`);
        return false;
      }
      if (contextRef.current.labels.some((l) => l.lblNm === lblNm)) {
        setAddErrorMessage("이미 있는 라벨입니다");
        return false;
      }
      if (busyRef.current.adding) return false;

      busyRef.current.adding = true;
      setAdding(true);
      setAddErrorMessage("");

      try {
        await createFormLabel(lblNm);
        /*
         * 여기서부터는 이미 서버에 만들어진 뒤다. 재조회가 실패해도 추가 자체는 성공이므로
         * false로 돌려주지 않는다 — 실패로 알리면 사용자가 같은 이름을 다시 넣어 409를 본다.
         */
        await refresh().catch((error: unknown) => {
          if (aliveRef.current) setAddErrorMessage(toFormLabelErrorMessage(error));
        });
        return true;
      } catch (error: unknown) {
        if (aliveRef.current) setAddErrorMessage(toFormLabelErrorMessage(error));
        return false;
      } finally {
        busyRef.current.adding = false;
        if (aliveRef.current) setAdding(false);
      }
    },
    [refresh],
  );

  /* ── 사용_여부 토글 ───────────────────────────────────────── */

  const toggle = useCallback(
    async (label: FormLabelSummary): Promise<void> => {
      const { formLblId } = label;
      // 응답이 오기 전에 다시 눌리면 같은 값을 두 번 보내거나 방금 바꾼 값을 되돌리게 된다
      if (busyRef.current.toggling.has(formLblId)) return;

      busyRef.current.toggling.add(formLblId);
      setTogglingIds((ids) => [...ids, formLblId]);
      setToggleErrorMessage("");

      try {
        await setFormLabelUse(formLblId, !label.useYn);
        // 토글 자체는 끝났다 — 재조회 실패를 토글 실패로 보이게 하지 않는다
        await refresh().catch(() => {});
      } catch (error: unknown) {
        if (aliveRef.current) setToggleErrorMessage(toFormLabelErrorMessage(error));
        /*
         * 없는 라벨(404)이면 화면이 들고 있는 목록이 이미 낡았다는 뜻이다 — 그 상태로 두면
         * 사라진 행을 계속 누르게 되므로 조용히 다시 받는다. 재조회까지 실패하면 그냥 둔다
         * (원래 오류 문구가 더 도움이 된다).
         */
        if (
          error instanceof ApiError &&
          error.code === FORM_LABEL_ERROR.FORM_LABEL_NOT_FOUND
        ) {
          await refresh().catch(() => {});
        }
      } finally {
        busyRef.current.toggling.delete(formLblId);
        if (aliveRef.current) setTogglingIds((ids) => ids.filter((id) => id !== formLblId));
      }
    },
    [refresh],
  );

  const isToggling = useCallback(
    (formLblId: number) => togglingIds.includes(formLblId),
    [togglingIds],
  );

  return {
    labels,
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
    addErrorMessage,
    adding,
    add,
    isToggling,
    toggleErrorMessage,
    toggle,
  };
}
