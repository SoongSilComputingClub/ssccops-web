"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchForms, type FormListFilter, type FormSummary } from "@/entities/form";
import { toFormErrorMessage } from "./form-error";

/*
 * 폼 목록 조회 훅.
 *
 * ── 데이터 페칭 방식 결정 (이 레포의 첫 사례) ──────────────────
 * SWR·React Query를 넣지 않고 `apiFetch` + `useEffect`로 간다.
 *
 * - 지금 폼 화면이 필요로 하는 것은 "화면 진입 시 1회 조회 + 필터가 바뀌면 재조회 +
 *   실패 시 재시도" 뿐이다. 캐시 공유·백그라운드 갱신·낙관적 업데이트를 쓸 화면이 아직 없다
 * - 인증·토큰 갱신·오류 봉투 해석은 이미 apiFetch가 전담한다. 라이브러리를 얹으면 그 위에
 *   fetcher·키 규약·Provider가 한 겹 더 생기는데, 지금 얻는 것은 로딩 플래그 정도다
 * - 번들이 Cloudflare Workers로 나가므로 안 쓰는 런타임 의존성을 늘리지 않는다
 *
 * ── 로딩 상태를 setState 하지 않고 파생시키는 이유 ─────────────
 * 조회 결과에 그 결과를 만든 요청의 식별자(key)를 함께 담아 두고, 지금 필요한 key와 같을
 * 때만 결과로 인정한다. 다르면 그 자체가 "아직 안 온 상태"이므로 loading은 저장하는 값이
 * 아니라 렌더 중에 계산되는 값이 된다.
 *
 * 이렇게 하면 두 가지가 같이 해결된다.
 * - 이펙트 본문에서 setState를 부르지 않는다 (react-hooks/set-state-in-effect). 필터가
 *   바뀔 때마다 loading 을 쓰고 다시 결과를 쓰던 렌더 한 번이 사라진다
 * - **늦게 도착한 이전 필터의 응답이 최신 목록을 덮어쓰지 못한다.** 응답에 실린 key가
 *   현재 key와 다르면 렌더 단계에서 그냥 무시된다 — 취소 플래그가 놓치는 경합까지 막힌다
 *
 * alive 플래그는 그대로 둔다. 언마운트된 뒤 setState 하는 것을 막는 것은 별개의 문제다.
 */

export type FormListStatus = "loading" | "ready" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedFormList {
  key: string;
  forms: FormSummary[];
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

export interface FormList {
  forms: FormSummary[];
  status: FormListStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;
}

export function useFormList(filter: FormListFilter = {}): FormList {
  const { formSttsCd = null, formLblId = null } = filter;
  const [loaded, setLoaded] = useState<LoadedFormList | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  /*
   * 지금 화면이 보여야 할 조회의 식별자. 필터가 바뀌거나 재시도를 누르면 값이 달라지고,
   * 그 순간부터 이전 결과는 자동으로 "남의 결과"가 된다.
   */
  const requestKey = `${formSttsCd ?? ""}|${formLblId ?? ""}|${reloadKey}`;

  /*
   * 의존성은 필터 객체가 아니라 그 안의 원시값이다 — 호출부가 `{ formSttsCd }`를 인라인으로
   * 넘기면 렌더마다 새 객체라서 객체를 의존성에 두는 순간 무한 재조회가 된다.
   */
  useEffect(() => {
    let alive = true;

    fetchForms({ formSttsCd, formLblId })
      .then((next) => {
        if (alive) setLoaded({ key: requestKey, forms: next, errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (alive) {
          setLoaded({ key: requestKey, forms: [], errorMessage: toFormErrorMessage(error) });
        }
      });

    return () => {
      alive = false;
    };
  }, [formSttsCd, formLblId, requestKey]);

  // 이번 요청의 결과가 아직 없으면(최초 진입이든 필터 변경 직후든) 로딩이다
  const current = loaded?.key === requestKey ? loaded : null;
  const status: FormListStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return {
    forms: current?.forms ?? [],
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}
