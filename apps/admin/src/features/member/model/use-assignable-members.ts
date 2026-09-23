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

/*
 * authority가 있으면 그 권한을 오늘 행사할 수 있는 회원으로 좁혀 받는다(#71 · 서버 #101) —
 * 업무·회의 등록처럼 국장 이상만 담당자로 고를 수 있어야 하는 화면이 쓴다. authority가
 * 바뀌면(예: 등록 유형을 업무↔회의로 전환) 새 조건으로 다시 불러야 하므로 effect 의존성에
 * 넣는다 — 훅을 유형마다 따로 부르지 않고 하나로 재사용할 수 있는 것이 이 덕분이다.
 */
export function useAssignableMembers(authority?: string): AssignableMembers {
  const [loaded, setLoaded] = useState<LoadedAssignable | null>(null);
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    let alive = true;

    fetchAssignableMembers(authority)
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
  }, [requestKey, authority]);

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

/** 이미 배정돼 있는 담당자(수정 화면) — 후보 목록에 없어도 셀렉트에 그대로 남긴다 */
export interface AssignableCurrent {
  memberId: number;
  name: string;
}

/**
 * 셀렉트가 보여 주고 폼이 서버로 보내도 되는 값인가 (#435).
 *
 * 후보 목록에 있으면 그대로 참이다. **수정 화면의 현재 담당자는 목록에 없어도 참으로 본다** —
 * 탈퇴·제명·등급 변경으로 후보에서 빠진 회원이 이미 담당자인 건은 있고, 그 건의 제목·기간만
 * 고치려는 사람까지 담당자를 갈아 끼우게 만들면 수정 화면이 "담당자 교체 화면"이 된다.
 * 서버가 거절하면(`OWNER_NOT_ACTIVE_MEMBER` → 400 VALIDATION_FAILED) 그 문구가 그대로 뜬다.
 *
 * 목록이 아직 안 왔거나 실패했으면 현재 담당자라도 거짓이다 — 등록 화면과 같은 이유로
 * (`includes` 주석) 그 상태에서는 저장이 나가면 안 된다.
 */
export function isAssignablePick(
  assignable: AssignableMembers,
  memberId: number | null,
  current?: AssignableCurrent | null,
): boolean {
  if (memberId === null) return false;
  if (assignable.includes(memberId)) return true;
  return assignable.status === "ready" && current?.memberId === memberId;
}

/**
 * 담당자를 확정하지 못한 이유 — 빈 문자열이면 확정됐다. 등록·수정 버튼의 잠금 근거이자
 * 버튼 `title`이다(등록 화면 규칙 · #53). `pickable`은 `isAssignablePick`의 결과다.
 *
 * 순서가 뜻이다 — 조회 중·실패는 값과 무관하게 잠그고, 그다음에야 값을 본다. 후보가 비어도
 * 현재 담당자를 그대로 두는 수정은 통과해야 하므로 "후보 없음"보다 `pickable`을 먼저 본다.
 */
export function assignableBlockReason(assignable: AssignableMembers, pickable: boolean): string {
  if (assignable.status === "loading") return "담당자 목록을 불러오는 중입니다";
  if (assignable.status === "error") return assignable.errorMessage;
  if (pickable) return "";
  if (assignable.members.length === 0) return "담당자로 지정할 수 있는 활동 회원이 없습니다";
  return "담당자를 선택하세요";
}

/**
 * 수정 화면의 담당자 셀렉트 아래 안내 — 잠금 사유가 없을 때만 보인다(등록 화면의 «본인으로
 * 등록됩니다» 자리). 업무·하위 업무 수정이 같은 문구·같은 판단을 쓴다(#435).
 *
 * 현재 담당자가 후보에서 빠진 경우를 먼저 말한다 — 그대로 저장하면 서버가 거절하므로, 그
 * 사람이 담당자였다는 사실과 다음 행동을 같은 줄에 둔다.
 */
export function assignableEditHint(
  assignable: AssignableMembers,
  memberId: number | null,
  current: AssignableCurrent | null,
): string {
  if (memberId === current?.memberId) {
    return assignable.includes(current.memberId)
      ? "비우면 현재 담당자 그대로입니다"
      : "현재 담당자는 이제 지정할 수 없는 회원입니다 — 다른 회원으로 바꿔주세요";
  }
  return "선택한 회원이 담당자로 저장됩니다";
}
