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
 * 대신 라이브러리가 대신 해 주던 두 가지는 직접 처리한다 — **응답 순서 뒤집힘**(늦게 온
 * 이전 필터의 응답이 최신 목록을 덮어쓰는 것)과 **언마운트 후 setState**. 아래 alive 플래그다.
 * 화면 간 캐시 공유가 필요해지면(응답 화면에서 폼 제목을 다시 부르는 등) 그때 재검토한다.
 */

export type FormListStatus = "loading" | "ready" | "error";

export interface FormList {
  forms: FormSummary[];
  status: FormListStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;
}

export function useFormList(filter: FormListFilter = {}): FormList {
  const { formSttsCd = null, formLblId = null } = filter;
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [status, setStatus] = useState<FormListStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  /*
   * 의존성은 필터 객체가 아니라 그 안의 원시값이다 — 호출부가 `{ formSttsCd }`를 인라인으로
   * 넘기면 렌더마다 새 객체라서 객체를 의존성에 두는 순간 무한 재조회가 된다.
   */
  useEffect(() => {
    let alive = true;
    setStatus("loading");

    fetchForms({ formSttsCd, formLblId })
      .then((next) => {
        if (!alive) return;
        setForms(next);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setErrorMessage(toFormErrorMessage(error));
        setStatus("error");
      });

    return () => {
      alive = false;
    };
  }, [formSttsCd, formLblId, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return { forms, status, errorMessage, reload };
}
