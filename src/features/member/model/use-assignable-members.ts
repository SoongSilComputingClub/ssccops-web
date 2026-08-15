"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchAssignableMembers,
  generationText,
  type AssignableMember,
} from "@/entities/member";
import { toAssignableMemberErrorMessage } from "./member-error";

/*
 * 담당자·책임자 선택지 조회 훅 (서버 #76 · GET /v1/members/assignable · #53).
 *
 * ── 왜 목록 훅(useMembers)을 쓰지 않는가 ──────────────────────
 * 부르는 조건도 필요한 권한도 다르다. 명부(`GET /v1/members`)는 MEMBER_MANAGE를 요구하고
 * 커서로 잘려 오는데, 담당자를 고르는 사람은 명부 권한이 없을 수 있고 잘린 다음 페이지의
 * 회원은 아예 지정할 길이 없어진다. `/assignable`은 인증만으로 활동 회원 전량을 배열로
 * 내리며, 그래서 여기에는 페이징도 검색어도 없다.
 *
 * ── 실패를 조용히 넘기지 않는다 ────────────────────────────────
 * 기준 코드 훅(`useMemberCodes`)은 실패해도 빈 배열로 두지만 여기서는 status를 error로
 * 올린다. 칩이 없으면 필터를 못 걸 뿐이지만, 담당자 후보가 없으면 **등록이 서버로 나가서는
 * 안 된다** — 후보 없이 보내는 값은 목 시절의 1~12번처럼 실재하지 않는 회원을 가리키고,
 * `oper.pic_id`가 `mbr.mbr_id` FK라 엉뚱한 사람에게 배정되거나 400으로 끊긴다. 조회 실패는
 * 등록 버튼을 잠그는 근거이므로 화면까지 올려야 한다(상위 업무 조회가 이미 같은 방식이다).
 *
 * 로딩을 setState 하지 않는 방식(결과에 요청 key를 실어 두고 렌더 중에 계산)은
 * features/sub-work-type/model/use-active-sub-work-types.ts와 같다
 * (react-hooks/set-state-in-effect).
 */

export type AssignableMembersStatus = "loading" | "ready" | "error";

/** 후보가 하나도 없는 상태를 가리키는 고정 배열 — 아래 useMemo가 이 참조를 그대로 돌려준다 */
const NO_CANDIDATES: readonly never[] = [];

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedAssignable {
  key: number;
  members: AssignableMember[];
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

export interface AssignableMembers {
  /** 탈퇴·제명을 뺀 활동 회원 전량. 서버가 이미 걸러 내려 화면이 다시 거르지 않는다 */
  members: readonly AssignableMember[];
  status: AssignableMembersStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  /** 주어진 식별자가 실제 후보에 있는가 — 폼이 값을 서버로 보내기 전에 확인한다 */
  includes: (memberId: number | null) => boolean;
  reload: () => void;
}

export function useAssignableMembers(): AssignableMembers {
  const [loaded, setLoaded] = useState<LoadedAssignable | null>(null);
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    let alive = true;

    fetchAssignableMembers()
      .then((members) => {
        if (alive) setLoaded({ key: requestKey, members, errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (alive) {
          setLoaded({
            key: requestKey,
            members: [],
            errorMessage: toAssignableMemberErrorMessage(error),
          });
        }
      });

    return () => {
      alive = false;
    };
  }, [requestKey]);

  const reload = useCallback(() => setRequestKey((k) => k + 1), []);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: AssignableMembersStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";
  /* 실패·미도착을 매번 새 빈 배열로 두면 includes가 렌더마다 새 함수가 된다 */
  const members = useMemo(
    () => (current === null || current.errorMessage ? NO_CANDIDATES : current.members),
    [current],
  );

  /*
   * 아직 목록을 못 받았거나 조회에 실패했으면 **무엇도 후보가 아니다.** 세션 본인이라고
   * 통과시키면 목록이 죽은 상태에서 등록이 그대로 나가, 이 훅을 둔 이유가 사라진다.
   */
  const includes = useCallback(
    (memberId: number | null) =>
      memberId !== null && members.some((m) => m.memberId === memberId),
    [members],
  );

  return {
    members,
    status,
    errorMessage: current?.errorMessage ?? "",
    includes,
    reload,
  };
}

/**
 * 선택 목록에 그릴 한 줄 — `홍길동 · 12기 · 회장`.
 *
 * 이름만으로는 동명이인을 가를 수 없어 기수를 함께 적고, 그 뒤에는 대표 역할을(없으면 등급을)
 * 붙인다. **연락처·이메일·학번은 적지 않는다** — `/assignable`은 권한 없이 부르는 목록이라
 * 서버가 그 값을 아예 내리지 않는다(api/members.ts의 `AssignableMember` 주석).
 *
 * 기수 미배정을 "미배정"으로 옮기는 일은 `generationText` 한 곳에서 한다 — 화면마다 적으면
 * 0기·null을 서로 다르게 그리는 자리가 생긴다.
 */
export function assignableMemberLabel(member: AssignableMember): string {
  return [
    member.name,
    generationText(member.generationNumber),
    member.representativeRoleName ?? member.membershipGradeName,
  ].join(" · ");
}
