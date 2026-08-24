"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createFormFromTemplate } from "@/entities/form-template";
import { syncSessionOnForbidden } from "@/entities/session";
import { toFormFromTemplateErrorMessage } from "./form-template-error";

/*
 * '이 템플릿으로 폼 만들기' (POST /v1/form-templates/{formTmplId}/forms).
 *
 * 만들어진 폼은 **작성 중(DRAFT)이고 접수 기간과 라벨이 비어 있다.** 그 사실을 성공 문구에
 * 남기는 것은 폼 복제와 같은 이유다 — 접수 기간을 채우지 않으면 링크를 열어도 응답을 받지
 * 못하고, 라벨이 없으면 목록 필터의 어느 묶음에도 잡히지 않는다.
 *
 * 토스트는 여기서 띄우지 않는다. 훅은 결과만 돌려주고 화면이 문구와 이동을 정한다 — 같은 훅을
 * 템플릿 관리와 폼 목록 두 화면이 쓰는데, 이동할 곳은 두 화면 모두 새 폼의 편집 화면이지만
 * 그 판단까지 훅에 넣으면 화면이 라우팅을 통제할 수 없다.
 */

export interface FormFromTemplate {
  /** 성공했을 때 새 폼의 번호. 실패·중복 클릭이면 null */
  formId: number | null;
  /** 사용자에게 보여줄 한 줄. 중복 클릭으로 아무것도 보내지 않았으면 빈 문자열 */
  message: string;
}

export interface FormFromTemplateControl {
  /** 지금 폼을 만들고 있는 **템플릿** 번호 — 목록에서 누른 행만 잠근다 */
  pendingTemplateId: number | null;
  pending: boolean;
  create: (formTmplId: number, formTtlNm?: string) => Promise<FormFromTemplate>;
}

const BUSY: FormFromTemplate = { formId: null, message: "" };

export function useFormFromTemplate(): FormFromTemplateControl {
  const [pendingTemplateId, setPendingTemplateId] = useState<number | null>(null);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const create = useCallback(
    async (formTmplId: number, formTtlNm?: string): Promise<FormFromTemplate> => {
      if (inFlightRef.current) return BUSY;
      inFlightRef.current = true;
      setPendingTemplateId(formTmplId);

      try {
        const form = await createFormFromTemplate(formTmplId, formTtlNm);
        return {
          formId: form.formId,
          message:
            "작성 중(DRAFT) 폼을 만들었습니다 — 접수 기간과 라벨은 편집 화면에서 채워주세요",
        };
      } catch (error: unknown) {
        // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
        syncSessionOnForbidden(error);
        return { formId: null, message: toFormFromTemplateErrorMessage(error) };
      } finally {
        inFlightRef.current = false;
        if (aliveRef.current) setPendingTemplateId(null);
      }
    },
    [],
  );

  return { pendingTemplateId, pending: pendingTemplateId !== null, create };
}
