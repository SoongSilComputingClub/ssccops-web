"use client";

import { useCallback, useRef, useState } from "react";
import type { QitemCpstCn } from "@ssccops/form-renderer";
import type { RecruitmentFormView } from "@/entities/form";
import { updateRecruitmentFormQuestions } from "@/entities/form/api/recruitment-form-write";
import { toRecruitmentFormSaveErrorMessage } from "./recruitment-form-error";

/*
 * 지원서 문항 저장 훅 (#528 · PUT /v1/academic-programs/{id}/recruitment/form).
 *
 * ── 자동 저장이 없다 — 저장 버튼 하나다 ──────────────────────
 * 어드민 폼 편집기(`use-form-editor.ts`)는 타이핑마다 디바운스 PUT을 보내지만 그 뼈대를
 * 가져오지 않았다. 그쪽은 문항 창이 계속 열려 있는 화면이고, **이쪽은 접수 시작과 함께 창이
 * 닫히는 화면**이다 — 타이핑 도중 접수가 열리면 어디까지 저장됐는지 사용자가 모르는 채 화면만
 * 읽기 전용으로 바뀐다. 버튼 하나면 «저장됐다/안 됐다»가 분명하다(#528 이슈에서 기각한 길).
 *
 * 덤으로 자동 저장의 전제가 이 경로에 없다 — 어드민은 폼 전체(제목·기간·라벨)를 되돌려
 * 보내는 본문이라 «받은 것을 그대로 돌려준다»가 성립하지만, 서버는 이 경로에서 문항 구성만
 * 받는다.
 *
 * ── 연타 잠금 ────────────────────────────────────────────────
 * 저장은 전체 교체라 멱등하지만, 두 요청이 겹치면 **나중에 보낸 것이 먼저 도착할 수 있다** —
 * 그러면 마지막으로 누른 상태가 아닌 것이 남는다. `inFlightRef`로 진행 중 재호출을 막는다
 * (`use-submit-session`과 같은 자리).
 *
 * ── 성공하면 서버 응답으로 갈아 끼운다 ──────────────────────
 * 서버가 저장 결과(폼 + `isEditable`)를 그대로 돌려주므로 재조회하지 않는다 — `qitemVer`가
 * 그 응답에서 오고, **구성이 실제로 바뀐 저장에서만 오르므로** 화면이 그 값을 다시 셀 수
 * 없다(서버 `FormEntity.update`의 반환값이 판정한다).
 */

export type SaveOutcome =
  | { result: "saved"; view: RecruitmentFormView }
  | { result: "failed"; message: string };

export interface SaveRecruitmentForm {
  saving: boolean;
  /** 마지막 저장 실패 문구 — 성공하면 빈 문자열로 지워진다 */
  errorMessage: string;
  save: (qitemCpstCn: QitemCpstCn) => Promise<SaveOutcome>;
}

export function useSaveRecruitmentForm(academicProgramId: number): SaveRecruitmentForm {
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const inFlightRef = useRef(false);

  const save = useCallback(
    async (qitemCpstCn: QitemCpstCn): Promise<SaveOutcome> => {
      if (inFlightRef.current) return { result: "failed", message: "" };
      inFlightRef.current = true;
      setSaving(true);
      setErrorMessage("");
      try {
        const view = await updateRecruitmentFormQuestions(academicProgramId, qitemCpstCn);
        return { result: "saved", view };
      } catch (error: unknown) {
        const message = toRecruitmentFormSaveErrorMessage(error);
        setErrorMessage(message);
        return { result: "failed", message };
      } finally {
        inFlightRef.current = false;
        setSaving(false);
      }
    },
    [academicProgramId],
  );

  return { saving, errorMessage, save };
}
