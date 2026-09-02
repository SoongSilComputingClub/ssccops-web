"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchFormResponse,
  RESPONSE_ERROR,
  type FormResponseDetail,
} from "@/entities/response";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";
import { toProposalReviewErrorMessage } from "./proposal-copy";

/*
 * 제출한 기획안 한 건의 검토 내용 (ssccops-server #141 · GET .../responses/{formRspnsId}).
 *
 * ── 내 응답 목록에는 사유가 없다 ───────────────────────────────
 * `GET .../responses/mine`은 건수와 상태만 싣는다(서버 `MyFormResponseSummaryResponse`가 응답
 * 내용을 계약에서 뺐다). 처리자·시각·사유가 실려 오는 경로는 응답 단건 조회 하나뿐이라 여기서
 * 그것을 부른다.
 *
 * **그 경로는 응답 심사(RESPONSE_REVIEW) 권한을 요구한다.** 제출자 본인에게 열린 경로는 아직
 * 없으므로(서버 #141이 "응답자 화면이 수정요청 사유를 읽는 길"을 후속으로 미뤄 두었다) 권한이
 * 없는 회원에게는 403이 온다 — 그것을 오류가 아니라 별도 상태로 갈라, 목록의 상태 배지는 그대로
 * 두고 펼친 칸 안에서만 이유를 말한다.
 *
 * ── 목록과 함께 부르지 않고 펼칠 때 부른다 ─────────────────────
 * 낸 기획안이 열 건이면 요청도 열 번이고, 그중 제출자가 실제로 읽는 것은 수정요청·반려를 받은
 * 한둘이다. 훅이 언제나 부르게 두는 대신 **펼친 칸이 마운트될 때만** 이 훅이 사는 구조로 둔다.
 */

export type ProposalReviewStatus =
  | "loading"
  | "ready"
  /** 없는 응답 — 다시 불러도 없다 */
  | "not-found"
  /** 검토 내용을 읽을 권한이 없다 (403) */
  | "denied"
  | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedProposalReview {
  key: string;
  detail: FormResponseDetail | null;
  outcome: Exclude<ProposalReviewStatus, "loading">;
  errorMessage: string;
}

export interface ProposalReviewQuery {
  /** status === "ready"일 때만 채워진다 */
  detail: FormResponseDetail | null;
  status: ProposalReviewStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;
}

export function useProposalReview(
  formId: number,
  formRspnsId: number,
): ProposalReviewQuery {
  const [loaded, setLoaded] = useState<LoadedProposalReview | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const requestKey = `${formId}|${formRspnsId}|${reloadKey}`;

  useEffect(() => {
    let alive = true;

    fetchFormResponse(formId, formRspnsId)
      .then((detail) => {
        if (!alive) return;
        setLoaded({ key: requestKey, detail, outcome: "ready", errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (!alive) return;

        const code = error instanceof ApiError ? error.code : "";
        const denied = code === API_ERROR.FORBIDDEN || code === API_ERROR.ACCESS_DENIED;
        const notFound = code === RESPONSE_ERROR.FORM_RESPONSE_NOT_FOUND;

        let outcome: Exclude<ProposalReviewStatus, "loading"> = "error";
        if (denied) outcome = "denied";
        else if (notFound) outcome = "not-found";

        setLoaded({
          key: requestKey,
          detail: null,
          outcome,
          errorMessage:
            outcome === "error" ? toProposalReviewErrorMessage(error) : "",
        });
      });

    return () => {
      alive = false;
    };
  }, [formId, formRspnsId, requestKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: ProposalReviewStatus = current?.outcome ?? "loading";

  return {
    detail: status === "ready" ? (current?.detail ?? null) : null,
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}
