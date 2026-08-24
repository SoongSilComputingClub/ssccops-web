"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchFormResponses, type FormResponseItem } from "@/entities/response";
import type { RspnsSttsCd } from "@/shared/config/codes";
import { toResponseErrorMessage } from "./response-error";

/*
 * 응답 목록 조회 훅.
 *
 * 페칭 방식(apiFetch + useEffect)과 "결과에 요청 식별자를 실어 로딩을 파생시키는" 구조는
 * features/form/model/use-form-list.ts 주석에 근거가 적혀 있다. 여기서도 같은 규칙을 쓴다 —
 * 이펙트 본문에서 setState를 부르지 않고(react-hooks/set-state-in-effect), 늦게 도착한
 * 이전 필터의 응답이 최신 목록을 덮어쓰지 못하게 한다.
 *
 * 상태 필터는 화면에서 filter()로 거르지 않고 서버 쿼리로 나간다. 그래서 필터가 바뀌면
 * 재조회가 필요하고, 그 사이의 화면은 "이전 필터의 목록"이 아니라 로딩이어야 한다.
 */

export type ResponseListStatus = "loading" | "ready" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedResponseList {
  key: string;
  responses: FormResponseItem[];
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

export interface ResponseList {
  responses: FormResponseItem[];
  status: ResponseListStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;
}

export function useResponseList(
  formId: number,
  rspnsSttsCd: RspnsSttsCd | null = null,
): ResponseList {
  const [loaded, setLoaded] = useState<LoadedResponseList | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const requestKey = `${formId}|${rspnsSttsCd ?? ""}|${reloadKey}`;

  useEffect(() => {
    let alive = true;

    fetchFormResponses(formId, { rspnsSttsCd })
      .then((next) => {
        if (alive) setLoaded({ key: requestKey, responses: next, errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (alive) {
          setLoaded({
            key: requestKey,
            responses: [],
            errorMessage: toResponseErrorMessage(error),
          });
        }
      });

    return () => {
      alive = false;
    };
  }, [formId, rspnsSttsCd, requestKey]);

  // 이번 요청의 결과가 아직 없으면(최초 진입이든 필터 변경 직후든) 로딩이다
  const current = loaded?.key === requestKey ? loaded : null;
  const status: ResponseListStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return {
    responses: current?.responses ?? [],
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}
