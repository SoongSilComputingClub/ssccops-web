"use client";

import { useCallback, useEffect, useState } from "react";
import type { RspnsCn } from "@ssccops/form-renderer";
import { fetchFormResponseDetails } from "@/entities/response";

/*
 * 표 보기가 쓸 답 모음 (ssccops#227).
 *
 * ── 왜 상세를 여러 번 부르는가 ──────────────────────────────────
 *
 * **응답 목록에는 답이 실려 오지 않는다.** 서버가 그렇게 정했고(`FormResponseSummaryResponse`
 * 주석: *"응답 내용(rspnsCn)을 싣지 않는다 (…) 답이 필요하면 상세를 부른다"*) 웹도 목록·상세
 * 타입을 일부러 갈라 두었다. 답을 여러 건 한 번에 주는 엔드포인트는 없다.
 *
 * 그 계약을 여기서 뒤집지 않는다. 목록에 `rspnsCn`을 실으면 **매일 쓰는 심사 목록**이 무거워지는데,
 * 응답 한 건의 답 상한이 10만 자이고 목록에는 페이징이 없어(ssccops-server#37) 그 상한이 그대로
 * 목록 응답에 얹힌다. 표 보기 때문에 심사 목록이 느려지는 것은 맞바꿀 만한 거래가 아니다.
 *
 * 그래서 **표 보기를 열 때만** 상세를 응답 수만큼 부른다. 비용을 내는 쪽이 그것을 쓰는 화면이다.
 *
 * ── 이 방식의 한계와 갈아 끼우는 자리 ────────────────────────────
 *
 * 응답이 수백 건이면 요청도 수백 개다. 동아리 폼 규모(수~수십 건)에서는 견디지만 커지면 감당이
 * 안 된다. 그때 서버에 표 보기용 조회를 열면 **이 훅의 이펙트 하나만** 바꾸면 된다 — 답을
 * 가져오는 자리를 여기로 좁혀 둔 것이 그래서다. 선택지는 상위 이슈(ssccops#227)에 A·B·C로
 * 정리해 두었다.
 *
 * 여러 건을 동시에 부르는 규칙(동시 실행 수·실패 허용·진행 보고)은 **엔티티 API의
 * `fetchFormResponseDetails`**에 있다 — CSV 내보내기(ssccops#223)가 같은 것을 필요로 해서,
 * 훅 안에 두면 워커 풀이 두 벌이 된다. 여기서는 그것을 부르고 화면 상태로 옮기기만 한다.
 *
 * 상태 관리는 features/response/use-response-list.ts와 같은 규칙이다 — **결과에 요청 식별자를
 * 실어** 로딩을 파생시키고 이펙트 본문에서 setState를 부르지 않는다(react-hooks/set-state-in-effect).
 * 늦게 도착한 이전 요청의 결과가 최신 화면을 덮어쓰지 못하게 하는 것이 요점이다.
 */

export type ResponseAnswersStatus = "idle" | "loading" | "ready" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedAnswers {
  key: string;
  /** formRspnsId → 그 응답의 답. 실패한 건은 없다 */
  answers: Record<number, RspnsCn>;
  /** 빈 문자열이면 성공. 일부만 실패해도 채워진다(그때 status는 ready다) */
  errorMessage: string;
  /** 전부 실패했는가 — 그리면 빈 표가 되므로 오류로 다룬다 */
  fatal: boolean;
}

export interface ResponseAnswers {
  answers: Record<number, RspnsCn>;
  status: ResponseAnswersStatus;
  /** 불러온 건수 — 진행 표시용 */
  loadedCount: number;
  total: number;
  /** 전부 실패면 오류 문구, 일부 실패면 안내 문구, 성공이면 빈 문자열 */
  errorMessage: string;
  reload: () => void;
}

/**
 * 주어진 응답들의 답을 모아 온다.
 *
 * `enabled`가 false면 아무것도 부르지 않는다 — 목록 보기에서는 표가 없으므로 답도 필요 없다.
 * 표로 바꾸는 순간 부르기 시작한다.
 */
export function useResponseAnswers(
  formId: number,
  formRspnsIds: number[],
  enabled: boolean,
): ResponseAnswers {
  const [loaded, setLoaded] = useState<LoadedAnswers | null>(null);
  const [progress, setProgress] = useState({ key: "", count: 0 });
  const [reloadKey, setReloadKey] = useState(0);

  /*
   * 요청 식별자에 배열이 아니라 문자열을 쓴다 — 배열은 매 렌더 새 참조라 의존성에 그대로 넣으면
   * 이펙트가 끝없이 다시 돈다. 대상이 실제로 달라졌을 때만(필터 변경 등) 다시 부르게 하는 것이
   * 목적이다.
   */
  const idsKey = formRspnsIds.join(",");
  const requestKey = `${formId}|${idsKey}|${reloadKey}`;

  useEffect(() => {
    if (!enabled || idsKey === "") return;

    let alive = true;
    const ids = idsKey.split(",").map(Number);

    void fetchFormResponseDetails(
      formId,
      ids,
      (done) => setProgress({ key: requestKey, count: done }),
      () => alive,
    ).then(({ details, failures }) => {
      if (!alive) return;

      const answers: Record<number, RspnsCn> = {};
      for (const [id, detail] of Object.entries(details)) {
        answers[Number(id)] = detail.rspnsCn;
      }

      const allFailed = failures === ids.length;
      setLoaded({
        key: requestKey,
        answers,
        errorMessage: allFailed
          ? "응답 내용을 불러오지 못했습니다."
          : failures > 0
            ? `${failures}건의 응답 내용을 불러오지 못했습니다.`
            : "",
        fatal: allFailed,
      });
    });

    return () => {
      alive = false;
    };
  }, [formId, idsKey, enabled, requestKey]);

  // 이번 요청의 결과가 아직 없으면 로딩이다 (use-response-list와 같은 파생 방식)
  const current = loaded?.key === requestKey ? loaded : null;
  const status: ResponseAnswersStatus = !enabled
    ? "idle"
    : idsKey === ""
      ? "ready"
      : current === null
        ? "loading"
        : current.fatal
          ? "error"
          : "ready";

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return {
    answers: current?.answers ?? {},
    status,
    loadedCount: progress.key === requestKey ? progress.count : 0,
    total: formRspnsIds.length,
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}
