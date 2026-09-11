"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchMyFormResponses, type MyFormResponse } from "@/entities/form";
import { isUnauthenticated } from "@/shared/api/auth-error";

/*
 * 내가 이 폼에 낸 응답 목록 (ssccops-server #143).
 *
 * 처음에는 **여러 건을 받는 폼의 제출 내역 상자**에서만 쓰였다 — 1건 폼은 제출을 마치면
 * 화면이 통째로 갈리므로 목록이 설 자리가 없어서다. 지금은 행사 상세의 신청 버튼도 쓴다
 * (ssccops#278) — "이 회원이 이미 냈는가"를 이 목록으로 안다. 그쪽은 건수가 아니라 있는지와
 * 상태만 본다.
 *
 * 실패해도 **작성 화면을 막지 않는다.** 지난 제출 내역을 못 받은 것과 답을 쓸 수 없는 것은
 * 다른 일이라, 이 훅은 상태만 돌려주고 판단은 화면이 한다(상자 안에서만 사유를 말한다).
 *
 * `loading`을 상태로 두지 않고 **키가 맞는 결과가 없으면 loading**으로 파생한다 —
 * `useApplyForm`과 같은 모양이다. 효과 안에서 `setState("loading")`을 부르면 렌더가 한 번 더
 * 돌고(`react-hooks/set-state-in-effect`), formId가 바뀌는 순간 옛 결과가 잠깐 보인다.
 */

export type MyResponsesStatus = "loading" | "ready" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedResponses {
  key: string;
  outcome: Exclude<MyResponsesStatus, "loading">;
  responses: MyFormResponse[];
  errorMessage: string;
}

export interface MyResponsesController {
  status: MyResponsesStatus;
  responses: MyFormResponse[];
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;
}

const NO_RESPONSES: MyFormResponse[] = [];

export function useMyResponses(formId: number): MyResponsesController {
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${formId}|${reloadKey}`;

  const [loaded, setLoaded] = useState<LoadedResponses | null>(null);

  useEffect(() => {
    let alive = true;

    fetchMyFormResponses(formId)
      .then((responses) => {
        if (!alive) return;
        setLoaded({ key: requestKey, outcome: "ready", responses, errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setLoaded({
          key: requestKey,
          outcome: "error",
          responses: NO_RESPONSES,
          errorMessage: toMyResponsesErrorMessage(error),
        });
      });

    return () => {
      alive = false;
    };
  }, [formId, requestKey]);

  const current = loaded?.key === requestKey ? loaded : null;

  return {
    status: current?.outcome ?? "loading",
    responses: current?.responses ?? NO_RESPONSES,
    errorMessage: current?.errorMessage ?? "",
    reload: useCallback(() => setReloadKey((k) => k + 1), []),
  };
}

/**
 * 오류 문구.
 *
 * 코드마다 문장을 나누지 않는다 — 이 상자가 실패해도 답은 계속 쓸 수 있으므로, 읽는 사람이
 * 할 일은 어느 경우든 "다시 시도" 하나다. 로그인 만료만 갈라내는 것은 그때는 다시 시도해도
 * 같은 결과라 다른 행동(재로그인)이 필요하기 때문이다.
 */
function toMyResponsesErrorMessage(error: unknown): string {
  return isUnauthenticated(error)
    ? "로그인이 만료되어 제출 내역을 불러오지 못했습니다."
    : "제출 내역을 불러오지 못했습니다.";
}
