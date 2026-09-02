"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchMemberHistories,
  MEMBER_ERROR,
  type MemberHistoryEntry,
  type MemberHistoryType,
} from "@/entities/member";
import { syncSessionOnForbidden } from "@/entities/session";
import { ApiError } from "@/shared/lib/api/client";
import { toMemberHistoryErrorMessage } from "./member-error";

/*
 * 회원 변경 이력 통합 조회 훅 (#51 · 서버 #82 · GET /v1/members/{memberId}/histories).
 *
 * 페칭 구조("결과에 요청 식별자를 실어 로딩을 파생시킨다")는 use-members·use-member-detail과
 * 같다. 갈리는 것은 셋이다.
 *
 * ── 페이징이 없다 ──────────────────────────────────────────────
 * 서버가 배열을 그대로 내린다(세 테이블을 합쳐 단일 컬럼 커서가 성립하지 않는다 · 서버
 * `MemberHistoryServiceImpl` 주석). 그래서 커서·'더 보기'가 없고 받은 것이 전부다.
 *
 * ── 거르는 일은 서버가 한다 ────────────────────────────────────
 * 유형 칩이 `type` 질의 파라미터로 나간다. 전량을 받아 화면에서 거를 수도 있는 크기지만
 * 그러지 않는 것은, 필터를 두 곳에서 정하면 서버가 출처를 하나 더 늘렸을 때 화면이 모르는
 * 종류를 조용히 삼키기 때문이다 — 회원 목록(#46)이 같은 판단을 했다.
 *
 * ── "없는 회원"을 오류와 나눈다 ────────────────────────────────
 * 서버가 존재 검사를 따로 해 404를 내리는 것은 **이력이 없는 것과 회원이 없는 것이 다른
 * 사실**이기 때문이다(없으면 빈 배열이 정답이다). 그 구분을 화면까지 올린다 — 오류는 재시도
 * 버튼을 주지만 없는 회원은 아무리 다시 불러도 없다(use-member-detail과 같다).
 */

export type MemberHistoriesStatus = "loading" | "ready" | "not-found" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedHistories {
  key: string;
  entries: MemberHistoryEntry[];
  outcome: Exclude<MemberHistoriesStatus, "loading">;
  errorMessage: string;
}

export interface MemberHistories {
  /** 발생 시각 역순 — **서버가 매긴 순서 그대로**다. 화면에서 다시 정렬하지 않는다 */
  entries: MemberHistoryEntry[];
  status: MemberHistoriesStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;
}

/**
 * @param types 볼 출처. **빈 배열이 곧 '전체'**다 — 서버가 `type` 생략을 전부로 읽으므로
 *   아무것도 고르지 않은 상태가 첫 진입의 통합 타임라인과 같은 요청이 된다. 이것을 '아무것도
 *   보지 않음'으로 읽으면 화면에 처음 들어왔을 때 늘 빈 목록이다.
 */
export function useMemberHistories(
  memberId: number,
  types: readonly MemberHistoryType[],
): MemberHistories {
  /*
   * 호출부가 넘기는 배열은 렌더마다 새 객체일 수 있어 그대로 의존성에 두면 무한 재조회가 된다.
   * 이어 붙인 문자열을 열쇠로 쓰고 요청을 만들 때 다시 쪼갠다 (use-members와 같은 자리).
   */
  const typeKey = types.join(",");

  const [loaded, setLoaded] = useState<LoadedHistories | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const requestKey = `${memberId}|${typeKey}|${reloadKey}`;

  /* URL의 회원 번호는 사용자가 손으로 고칠 수 있다 — /v1/members/NaN/histories 를 막는다 */
  const isFetchable = Number.isInteger(memberId) && memberId > 0;

  useEffect(() => {
    if (!isFetchable) return;

    let alive = true;

    fetchMemberHistories(memberId, {
      types: typeKey ? (typeKey.split(",") as MemberHistoryType[]) : [],
    })
      .then((entries) => {
        if (alive) {
          setLoaded({ key: requestKey, entries, outcome: "ready", errorMessage: "" });
        }
      })
      .catch((error: unknown) => {
        if (!alive) return;

        /* 화면이 열린 사이에 MEMBER_MANAGE 가 회수됐을 수 있다 — 세션을 맞춰 스스로 잠기게 한다 */
        syncSessionOnForbidden(error);

        const notFound =
          error instanceof ApiError && error.code === MEMBER_ERROR.MEMBER_NOT_FOUND;

        setLoaded({
          key: requestKey,
          entries: [],
          outcome: notFound ? "not-found" : "error",
          errorMessage: notFound ? "" : toMemberHistoryErrorMessage(error),
        });
      });

    return () => {
      alive = false;
    };
  }, [memberId, typeKey, isFetchable, requestKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: MemberHistoriesStatus = !isFetchable
    ? "not-found"
    : (current?.outcome ?? "loading");

  return {
    entries: status === "ready" ? (current?.entries ?? []) : [],
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}
