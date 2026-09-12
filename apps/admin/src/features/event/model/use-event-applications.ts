"use client";

import { useCallback, useEffect, useState } from "react";
import { EVENT_PARTICIPANT_ERROR } from "@/entities/event";
import { fetchEventApplications, type EventApplication } from "@/entities/response";
import { ApiError } from "@/shared/lib/api/client";
import type { RspnsSttsCd } from "@/shared/config/codes";
import { toEventApplicationErrorMessage } from "./event-error";

/*
 * 행사 신청 목록 조회 훅 (#145 · GET /v1/events/{eventId}/applications).
 *
 * 페칭 구조(결과에 요청 식별자를 실어 로딩을 파생시킨다)는 features/response의
 * use-response-list.ts와 같다 — 이펙트 본문에서 setState를 부르지 않고, 늦게 도착한 이전
 * 필터의 응답이 최신 목록을 덮어쓰지 못하게 한다.
 *
 * **폼 미연결(409)을 오류와 나눈 것이 이 훅의 유일한 차이다.** 재시도 버튼을 줘 봐야 폼을
 * 연결하기 전에는 몇 번을 눌러도 같은 답이 온다 — 없는 행사를 오류가 아닌 not-found로
 * 나눈 use-event-detail과 같은 판단이다. 화면은 이 상태를 안내로 그린다.
 *
 * 행마다 명단 등록 여부(`participant`)가 함께 온다(ssccops#307). 등록·전이가 끝나면 페이지가
 * `reload()`를 불러 배지를 갈아 끼운다 — 명단과 같은 시점의 값이어야 «명단에서 보기»가
 * 가리키는 줄이 실제로 있다.
 */

export type EventApplicationsStatus = "loading" | "ready" | "no-form" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedApplications {
  key: string;
  applications: EventApplication[];
  outcome: Exclude<EventApplicationsStatus, "loading">;
  /** 빈 문자열이면 성공이거나 폼 미연결이다 */
  errorMessage: string;
}

export interface EventApplications {
  applications: EventApplication[];
  status: EventApplicationsStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;
}

export function useEventApplications(
  eventId: number,
  rspnsSttsCd: RspnsSttsCd | null = null,
): EventApplications {
  const [loaded, setLoaded] = useState<LoadedApplications | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const requestKey = `${eventId}|${rspnsSttsCd ?? ""}|${reloadKey}`;

  useEffect(() => {
    let alive = true;

    fetchEventApplications(eventId, { rspnsSttsCd })
      .then((next) => {
        if (alive) {
          setLoaded({
            key: requestKey,
            applications: next,
            outcome: "ready",
            errorMessage: "",
          });
        }
      })
      .catch((error: unknown) => {
        if (!alive) return;

        const noForm =
          error instanceof ApiError &&
          error.code === EVENT_PARTICIPANT_ERROR.EVENT_HAS_NO_FORM;

        setLoaded({
          key: requestKey,
          applications: [],
          outcome: noForm ? "no-form" : "error",
          errorMessage: noForm ? "" : toEventApplicationErrorMessage(error),
        });
      });

    return () => {
      alive = false;
    };
  }, [eventId, rspnsSttsCd, requestKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const current = loaded?.key === requestKey ? loaded : null;

  return {
    applications: current?.applications ?? [],
    status: current?.outcome ?? "loading",
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}
