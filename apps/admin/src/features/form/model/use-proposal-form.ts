"use client";

import { useCallback, useEffect, useState } from "react";
import { findProposalForm, type SystemForm } from "@/entities/form";
import { toProposalFormErrorMessage } from "./proposal-copy";

/*
 * 기획안 폼 진입 조회 (ssccops-web #163 → 경로 교체 #814).
 *
 * 화면이 아는 것은 `sys_form_cd = 'PROPOSAL'`뿐이고 번호는 여기서 찾는다 — 왜 번호를 적지
 * 않는지는 entities/form/api/proposal-form.ts에 적혀 있다.
 *
 * ── 세 갈래로 가른다 ─────────────────────────────────────────
 * "불러오지 못했다" 하나로 뭉치지 않는 것은 **할 수 있는 일이 갈래마다 다르기** 때문이다. 폼이
 * 아직 없으면 기다리는 것이 맞고, 통신 실패만이 다시 시도할 값어치가 있다. 예전에는 «권한 없음»
 * 갈래가 하나 더 있었다 — 폼 목록이 폼 조회(FORM_READ)를 요구했기 때문인데, 회원용 시스템 폼
 * 조회는 인증만 요구해 그 갈래가 사라졌다(#814).
 *
 * 페칭 구조(apiFetch + useEffect + 결과에 요청 식별자를 실어 로딩을 파생)는 use-form-list.ts
 * 주석에 근거가 적혀 있다.
 */

export type ProposalFormStatus =
  | "loading"
  /** 폼을 찾았다 — `form`이 채워져 있다 */
  | "ready"
  /** `PROPOSAL` 코드의 폼이 없다(404) — 아직 시드되지 않았거나 지워졌다 */
  | "not-seeded"
  | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedProposalForm {
  key: string;
  form: SystemForm | null;
  outcome: Exclude<ProposalFormStatus, "loading">;
  errorMessage: string;
}

export interface ProposalFormQuery {
  /** status === "ready"일 때만 채워진다 — 문항 구성(`qitemCpstCn`)까지 실려 있다 */
  form: SystemForm | null;
  status: ProposalFormStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;
}

export function useProposalForm(): ProposalFormQuery {
  const [loaded, setLoaded] = useState<LoadedProposalForm | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const requestKey = String(reloadKey);

  useEffect(() => {
    let alive = true;

    findProposalForm()
      .then((form) => {
        if (!alive) return;
        setLoaded({
          key: requestKey,
          form,
          outcome: form === null ? "not-seeded" : "ready",
          errorMessage: "",
        });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setLoaded({
          key: requestKey,
          form: null,
          outcome: "error",
          errorMessage: toProposalFormErrorMessage(error),
        });
      });

    return () => {
      alive = false;
    };
  }, [requestKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: ProposalFormStatus = current?.outcome ?? "loading";

  return {
    form: status === "ready" ? (current?.form ?? null) : null,
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}
