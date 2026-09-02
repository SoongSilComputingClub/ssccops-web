"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchMyFormResponses, type MyFormResponse } from "@/entities/response";
import { toPublicFormLoadErrorMessage } from "./public-form-error";

/*
 * 내 응답 목록 조회 훅 (ssccops-server #143 · GET /v1/forms/{formId}/responses/mine).
 *
 * **features/response가 아니라 여기에 둔다.** 이 목록을 그리는 것은 응답자 화면이고, 그 화면의
 * 오류 문구는 features/form의 public-form-error가 갖는다 — 훅을 저쪽에 두면 같은 레이어의 다른
 * 슬라이스를 참조하게 되거나(FSD가 막는다) 응답자용 문구가 한 벌 더 생긴다. usePublicForm이
 * 이미 같은 자리에서 entities/response를 부르고 있다.
 *
 * 페칭 방식(apiFetch + useEffect)과 "결과에 요청 식별자를 실어 로딩을 파생시키는" 구조는
 * features/form/model/use-form-list.ts 주석에 근거가 적혀 있다.
 *
 * **공개 폼 조회(usePublicForm)와 합치지 않는다.** 저쪽은 문항을 받아 작성 화면을 세우는
 * 조회라 실패하면 화면 전체가 서지 않아야 하지만, 이 목록은 없어도 답은 쓸 수 있다 — 한 훅에
 * 담으면 지난 제출 내역을 못 받았다는 이유로 작성 화면이 통째로 오류가 된다.
 */

export type MyResponseListStatus = "loading" | "ready" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedMyResponses {
  key: string;
  responses: MyFormResponse[];
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

export interface MyResponseList {
  /** 서버가 준 순번 오름차순 그대로다 — 화면이 다시 정렬하지 않는다 */
  responses: MyFormResponse[];
  status: MyResponseListStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;
}

export function useMyResponses(formId: number): MyResponseList {
  const [loaded, setLoaded] = useState<LoadedMyResponses | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const requestKey = `${formId}|${reloadKey}`;

  useEffect(() => {
    let alive = true;

    fetchMyFormResponses(formId)
      .then((next) => {
        if (alive) setLoaded({ key: requestKey, responses: next, errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (alive) {
          setLoaded({
            key: requestKey,
            responses: [],
            errorMessage: toPublicFormLoadErrorMessage(error),
          });
        }
      });

    return () => {
      alive = false;
    };
  }, [formId, requestKey]);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: MyResponseListStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return {
    responses: current?.responses ?? [],
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}
