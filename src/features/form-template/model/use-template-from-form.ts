"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createTemplateFromForm } from "@/entities/form-template";
import { syncSessionOnForbidden } from "@/entities/session";
import { toTemplateFromFormErrorMessage } from "./form-template-error";

/*
 * '이 폼을 템플릿으로 저장' (POST /v1/forms/{formId}/templates).
 *
 * **저장되는 것은 서버에 지금 저장돼 있는 문항 구성이다.** 요청 본문에 문항을 싣지 않기
 * 때문에, 화면이 들고 있던 초안이 아직 저장되지 않았다면 그 내용은 템플릿에 담기지 않는다 —
 * 편집 화면에서 이 훅을 부르는 쪽은 먼저 폼 저장을 끝낸다.
 *
 * 접수 기간·상태·라벨·응답은 옮겨지지 않는다(템플릿에 그 자리가 없다). 그 사실을 성공 문구에
 * 남긴다 — 남기지 않으면 "이 폼 그대로 하나 더"로 오해하고, 그것은 복제가 하는 일이다.
 */

export interface TemplateFromForm {
  /** 성공했을 때 새 템플릿의 번호. 실패·중복 클릭이면 null */
  formTmplId: number | null;
  /** 사용자에게 보여줄 한 줄. 중복 클릭으로 아무것도 보내지 않았으면 빈 문자열 */
  message: string;
}

export interface TemplateFromFormControl {
  pending: boolean;
  save: (
    formId: number,
    input?: { tmplNm?: string; tmplExpln?: string },
  ) => Promise<TemplateFromForm>;
}

const BUSY: TemplateFromForm = { formTmplId: null, message: "" };

export function useTemplateFromForm(): TemplateFromFormControl {
  const [pending, setPending] = useState(false);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const save = useCallback(
    async (
      formId: number,
      input: { tmplNm?: string; tmplExpln?: string } = {},
    ): Promise<TemplateFromForm> => {
      // 연타로 같은 폼에서 템플릿이 여러 벌 생기는 것을 막는다
      if (inFlightRef.current) return BUSY;
      inFlightRef.current = true;
      setPending(true);

      try {
        const template = await createTemplateFromForm(formId, input);
        return {
          formTmplId: template.formTmplId,
          message: `${template.tmplNm} 템플릿으로 저장했습니다 — 접수 기간과 라벨은 옮겨지지 않습니다`,
        };
      } catch (error: unknown) {
        // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
        syncSessionOnForbidden(error);
        return { formTmplId: null, message: toTemplateFromFormErrorMessage(error) };
      } finally {
        inFlightRef.current = false;
        if (aliveRef.current) setPending(false);
      }
    },
    [],
  );

  return { pending, save };
}
