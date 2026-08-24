"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchFormTemplates, type FormTemplateSummary } from "@/entities/form-template";
import { toFormTemplateErrorMessage } from "./form-template-error";

/*
 * '템플릿에서 시작' 선택지 — **켜진 템플릿만** 받는다 (기존 결정 · AGENTS.md).
 *
 * 관리 목록(use-form-templates)과 나눈 이유가 여기 있다. 관리 화면은 꺼진 것도 실어야
 * 되돌릴 수 있지만, 고르는 자리에 꺼진 템플릿이 있으면 목록에 있던 것을 골랐을 뿐인데
 * 400(FORM_TEMPLATE_NOT_USABLE)이 돌아온다 — 사용자는 이유를 알 수 없다.
 *
 * 거르는 것은 서버다(`useYn=true`). 전체를 받아 화면에서 filter 하면 규칙이 두 곳이 되고,
 * 무엇보다 이 화면이 볼 필요가 없는 데이터를 받아 온다.
 */

export interface FormTemplateOptions {
  templates: FormTemplateSummary[];
  loading: boolean;
  /** 비어 있으면 정상 */
  errorMessage: string;
  reload: () => void;
}

export function useFormTemplateOptions(): FormTemplateOptions {
  const [templates, setTemplates] = useState<FormTemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    let alive = true;

    fetchFormTemplates(true)
      .then((next) => {
        if (!alive) return;
        setTemplates(next);
        setErrorMessage("");
      })
      .catch((error: unknown) => {
        if (alive) setErrorMessage(toFormTemplateErrorMessage(error));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [requestKey]);

  const reload = useCallback(() => {
    setLoading(true);
    setRequestKey((k) => k + 1);
  }, []);

  return { templates, loading, errorMessage, reload };
}
