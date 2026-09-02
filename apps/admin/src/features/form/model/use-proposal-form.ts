"use client";

import { useCallback, useEffect, useState } from "react";
import { findProposalForm, type FormSummary } from "@/entities/form";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";
import { toProposalFormErrorMessage } from "./proposal-copy";

/*
 * 기획안 폼 진입 조회 (ssccops-web #163).
 *
 * 화면이 아는 것은 `sys_form_cd = 'PROPOSAL'`뿐이고 번호는 여기서 찾는다 — 왜 번호를 적지
 * 않는지는 entities/form/api/proposal-form.ts에 적혀 있다.
 *
 * ── 네 갈래로 가른다 ─────────────────────────────────────────
 * "불러오지 못했다" 하나로 뭉치지 않는 것은 **제출자가 할 수 있는 일이 갈래마다 다르기**
 * 때문이다. 권한이 없으면 다시 눌러도 영원히 같고(운영진에게 권한을 요청해야 한다), 폼이 아직
 * 없으면 기다리는 것이 맞으며, 통신 실패만이 다시 시도할 값어치가 있다.
 *
 * 페칭 구조(apiFetch + useEffect + 결과에 요청 식별자를 실어 로딩을 파생)는 use-form-list.ts
 * 주석에 근거가 적혀 있다.
 */

export type ProposalFormStatus =
  | "loading"
  /** 폼을 찾았다 — `form`이 채워져 있다 */
  | "ready"
  /** 폼 목록에 `PROPOSAL` 코드의 폼이 없다 — 아직 시드되지 않았거나 지워졌다 */
  | "not-seeded"
  /** 폼 목록을 읽을 권한이 없다 (403) */
  | "denied"
  | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedProposalForm {
  key: string;
  form: FormSummary | null;
  outcome: Exclude<ProposalFormStatus, "loading">;
  errorMessage: string;
}

export interface ProposalFormQuery {
  /** status === "ready"일 때만 채워진다 */
  form: FormSummary | null;
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

        const denied =
          error instanceof ApiError &&
          (error.code === API_ERROR.FORBIDDEN || error.code === API_ERROR.ACCESS_DENIED);

        setLoaded({
          key: requestKey,
          form: null,
          outcome: denied ? "denied" : "error",
          errorMessage: denied ? "" : toProposalFormErrorMessage(error),
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
