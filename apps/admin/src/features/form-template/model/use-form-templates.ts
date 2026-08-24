"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchFormTemplates,
  FORM_TEMPLATE_ERROR,
  setFormTemplateUse,
  type FormTemplateSummary,
} from "@/entities/form-template";
import { syncSessionOnForbidden } from "@/entities/session";
import { ApiError } from "@/shared/lib/api/client";
import { toFormTemplateErrorMessage } from "./form-template-error";

/*
 * 템플릿 관리 화면(/forms/templates)의 목록·사용 여부 토글.
 *
 * 선택지만 필요한 use-form-template-options 와 나눠 둔다 — 저쪽은 켜진 템플릿만 한 번 받으면
 * 끝이고 이쪽은 꺼진 것까지 전부 받은 뒤 계속 고친다. 한 훅에 합치면 폼 만들기 화면까지
 * 관리 화면의 변이 상태를 들고 다니게 된다.
 *
 * 로딩을 setState 하지 않는 방식과 "변이 뒤에는 목록을 다시 받되 requestKey는 올리지 않는다"는
 * 규칙은 use-form-labels.ts 와 같다 — 키를 올리면 토글 하나에 표 전체가 깜빡인다.
 */

export type FormTemplatesStatus = "loading" | "ready" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedFormTemplates {
  key: number;
  templates: FormTemplateSummary[];
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

export interface FormTemplateAdmin {
  templates: FormTemplateSummary[];
  status: FormTemplatesStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;

  /** 토글 요청이 진행 중인 템플릿 — 중복 클릭 방지용 */
  isToggling: (formTmplId: number) => boolean;
  /** 마지막 토글이 실패한 사유. 비어 있으면 정상 */
  toggleErrorMessage: string;
  toggle: (template: FormTemplateSummary) => Promise<void>;
}

export function useFormTemplates(): FormTemplateAdmin {
  const [loaded, setLoaded] = useState<LoadedFormTemplates | null>(null);
  const [requestKey, setRequestKey] = useState(0);
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
   * 관리 화면은 꺼진 템플릿까지 보여 준다 — useYn을 넘기지 않는 유일한 호출부다.
   * 여기서 켜진 것만 받으면 방금 내린 템플릿이 목록에서 사라져 되돌릴 방법이 없어진다.
   */
  useEffect(() => {
    let alive = true;

    fetchFormTemplates()
      .then((templates) => {
        if (alive) setLoaded({ key: requestKey, templates, errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (alive) {
          setLoaded({
            key: requestKey,
            templates: [],
            errorMessage: toFormTemplateErrorMessage(error),
          });
        }
      });

    return () => {
      alive = false;
    };
  }, [requestKey]);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: FormTemplatesStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";
  const templates = current?.templates ?? [];

  /** 변이 함수가 실행되는 시점에 읽을 최신 requestKey (use-form-labels.ts와 같은 패턴) */
  const keyRef = useRef(requestKey);
  useEffect(() => {
    keyRef.current = requestKey;
  });

  /*
   * 중복 제출 잠금은 상태가 아니라 ref로 건다 — 같은 틱에 두 번 눌린 클릭 사이에는 렌더가
   * 없어 상태 값이 아직 갱신되지 않는다. 화면 표시는 상태로, 실제 차단은 ref로 한다.
   */
  const busyRef = useRef(new Set<number>());

  /** 같은 키 위에 결과만 갈아 끼운다 (로딩 표시 없음) */
  const refresh = useCallback(async (): Promise<void> => {
    const key = keyRef.current;
    const next = await fetchFormTemplates();
    if (aliveRef.current) setLoaded({ key, templates: next, errorMessage: "" });
  }, []);

  const reload = useCallback(() => setRequestKey((k) => k + 1), []);

  const toggle = useCallback(
    async (template: FormTemplateSummary): Promise<void> => {
      const { formTmplId } = template;
      // 응답이 오기 전에 다시 눌리면 방금 바꾼 값을 되돌리게 된다
      if (busyRef.current.has(formTmplId)) return;

      busyRef.current.add(formTmplId);
      setTogglingIds((ids) => [...ids, formTmplId]);
      setToggleErrorMessage("");

      try {
        await setFormTemplateUse(formTmplId, !template.useYn);
        // 전환 자체는 끝났다 — 재조회 실패를 전환 실패로 보이게 하지 않는다
        await refresh().catch(() => {});
      } catch (error: unknown) {
        // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
        syncSessionOnForbidden(error);
        if (aliveRef.current) setToggleErrorMessage(toFormTemplateErrorMessage(error));
        /*
         * 없는 템플릿(404)이면 화면이 들고 있는 목록이 이미 낡았다는 뜻이다 — 그 상태로 두면
         * 사라진 행을 계속 누르게 되므로 조용히 다시 받는다.
         */
        if (
          error instanceof ApiError &&
          error.code === FORM_TEMPLATE_ERROR.FORM_TEMPLATE_NOT_FOUND
        ) {
          await refresh().catch(() => {});
        }
      } finally {
        busyRef.current.delete(formTmplId);
        if (aliveRef.current) {
          setTogglingIds((ids) => ids.filter((id) => id !== formTmplId));
        }
      }
    },
    [refresh],
  );

  const isToggling = useCallback(
    (formTmplId: number) => togglingIds.includes(formTmplId),
    [togglingIds],
  );

  return {
    templates,
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
    isToggling,
    toggleErrorMessage,
    toggle,
  };
}
