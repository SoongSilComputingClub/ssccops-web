"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchMember, MEMBER_ERROR, type MemberDetail } from "@/entities/member";
import { syncSessionOnForbidden } from "@/entities/session";
import { ApiError } from "@/shared/lib/api/client";
import { toMemberErrorMessage } from "./member-error";

/*
 * 회원 단건 조회 훅 (서버 #76 · GET /v1/members/{memberId}).
 *
 * 구조의 근거는 features/work/model/use-work-detail.ts와 같다. "없는 회원"을 오류가 아니라
 * 별도 상태로 나눈 것도 같은 이유다 — 오류는 재시도 버튼을 주지만, 없는 회원은 아무리 다시
 * 불러도 없다. 목록으로 돌아갈 길을 준다.
 *
 * 프로필·현재 역할·최근 변경 이력 3건이 이 호출 하나로 온다. 목록에서 고른 회원을 그대로
 * 들고 오지 않는 것은 목록 응답에 이력이 없고, URL로 바로 들어오면 목록 자체가 없기 때문이다.
 */

export type MemberDetailStatus = "loading" | "ready" | "not-found" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedMemberDetail {
  key: string;
  member: MemberDetail | null;
  outcome: Exclude<MemberDetailStatus, "loading">;
  errorMessage: string;
}

export interface MemberDetailQuery {
  member: MemberDetail | null;
  status: MemberDetailStatus;
  errorMessage: string;
  reload: () => void;
}

export function useMemberDetail(memberId: number): MemberDetailQuery {
  const [loaded, setLoaded] = useState<LoadedMemberDetail | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const requestKey = `${memberId}|${reloadKey}`;

  /*
   * URL의 회원 ID는 사용자가 손으로 고칠 수 있다. 숫자가 아니면 서버까지 갈 것 없이 없는
   * 회원으로 끊는다 — `/v1/members/NaN` 같은 요청이 나가는 것을 막는다.
   */
  const isFetchable = Number.isInteger(memberId) && memberId > 0;

  useEffect(() => {
    if (!isFetchable) return;

    let alive = true;

    fetchMember(memberId)
      .then((next) => {
        if (alive) {
          setLoaded({ key: requestKey, member: next, outcome: "ready", errorMessage: "" });
        }
      })
      .catch((error: unknown) => {
        if (!alive) return;

        /* 권한이 방금 회수됐을 수 있다 — 세션을 다시 받아 화면이 스스로 잠기게 한다 */
        syncSessionOnForbidden(error);

        const notFound =
          error instanceof ApiError && error.code === MEMBER_ERROR.MEMBER_NOT_FOUND;

        setLoaded({
          key: requestKey,
          member: null,
          outcome: notFound ? "not-found" : "error",
          errorMessage: notFound ? "" : toMemberErrorMessage(error),
        });
      });

    return () => {
      alive = false;
    };
  }, [memberId, isFetchable, requestKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: MemberDetailStatus = !isFetchable
    ? "not-found"
    : (current?.outcome ?? "loading");

  return {
    member: status === "ready" ? (current?.member ?? null) : null,
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}
