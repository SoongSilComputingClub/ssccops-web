"use client";

import { useCallback, useState } from "react";
import { BULK_CHANGE_MAX_TARGETS } from "@/entities/member";

/*
 * 회원 목록의 선택 (#382 · 서버 #338).
 *
 * ── 왜 목록 화면의 state가 아니라 훅인가 ────────────────────────
 * 선택에는 규칙이 셋 붙는다 — 상한(100명)에 닿으면 더 고를 수 없다, 조건(검색어·필터·정렬)이
 * 바뀌면 비운다, 이름을 함께 든다. 셋 다 "어떻게 그리는가"가 아니라 "무엇이 선택인가"이고,
 * FSD에서 그 자리는 `features/<slice>/model`이다. 목록 화면에 `useState<Set<number>>` 하나로 두면
 * 상한 검사가 체크박스·전체 선택·동작 막대 세 곳에 흩어지고, 그중 한 곳이 빠지면 101명이
 * 서버까지 가서 400을 받는다 — 그때 화면은 누구를 빼야 하는지 말해 줄 수 없다.
 *
 * ── 이름을 함께 든다 ────────────────────────────────────────────
 * `Map<memberId, name>`이다. 선택이 페이지를 넘어 살아남으므로(아래) 저장 직전 미리보기에는
 * **지금 화면에 없는 사람**이 섞여 있고, id만 들고 있으면 그 사람을 이름으로 보여 줄 길이
 * 없다 — 목록에는 지금 페이지만 있고, 100명분 상세를 미리보기 때문에 다시 부르는 것은 서버가
 * 응답에서 상세를 뺀 이유와 정면으로 어긋난다. Map은 넣은 순서를 지키므로 미리보기의 순서가
 * 곧 고른 순서다.
 *
 * ── 페이지를 넘어도 남고, 조건이 바뀌면 사라진다 ───────────────
 * 목록이 페이지 단위라(#374) 30명을 고르려면 두 페이지를 오가야 한다. 페이지마다 나눠
 * 저장하게 하면 "같은 결정으로 함께 바뀐 사람들"이 이력에서 두 묶음으로 갈린다. 반면 검색어나
 * 필터가 바뀌면 다른 목록이다 — 정회원 필터에서 고른 5명을 임시회원 필터로 들고 가면 그
 * 5명은 화면 어디에도 없고, 그 상태로 저장하면 미리보기가 아니면 아무도 모른다. 그래서
 * `scopeKey`(조건을 이어 붙인 문자열)가 바뀌는 순간 비운다.
 *
 * 비우는 판정을 **렌더 중에** 한다(`syncedScope`) — 목록 화면이 검색어를 URL에 맞추는 것과
 * 같은 패턴이다. `applyCondition`에 `clear()`를 끼워 넣는 길도 있었지만 조건은 뒤로가기로도
 * 바뀌고 그 경로는 `applyCondition`을 지나지 않는다. URL이 조건의 근거이므로 URL에서 파생한
 * 값을 보고 비우는 것이 맞고, effect로 하면 낡은 선택이 한 프레임 그려진다.
 *
 * ── 상세에 갔다 오면 사라진다 — 의도한 것이다 ────────────────────
 * 커서 스택은 상세 왕복에서 살아남으라고 URL에 두었지만(#374) 선택은 반대다. 화면에 보이지
 * 않는 30명이 sessionStorage에 남아 있다가 다음 날 "상태 변경"을 누르면 그대로 딸려 나간다 —
 * 미리보기가 막아 주기는 하지만, 애초에 보이지 않는 선택이 남아 있지 않는 편이 안전하다.
 * 선택은 지금 이 조작을 위한 임시 묶음이지 저장할 상태가 아니다.
 */

/** 선택에 넣을 때 필요한 것 — 목록 응답(`MemberSummary`)이 이 둘을 들고 있다 */
export interface SelectableMember {
  memberId: number;
  name: string;
}

export interface MemberSelection {
  /** memberId → 이름. 넣은 순서를 지킨다 */
  selected: ReadonlyMap<number, string>;
  count: number;
  /** 상한에 닿았다 — 안 고른 체크박스를 잠근다 */
  full: boolean;
  /** 앞으로 더 고를 수 있는 인원 */
  remaining: number;
  has: (memberId: number) => boolean;
  /** 고르거나 푼다. 상한에 닿았으면 고르는 쪽은 무시한다(체크박스가 먼저 잠기지만 이중 방어다) */
  toggle: (member: SelectableMember) => void;
  /**
   * 여러 명을 한 번에 고른다 — «이 페이지 전체 선택».
   *
   * 상한을 넘기면 **아무도 넣지 않는다.** 들어가는 만큼만 넣으면 20명을 고르라고 눌렀는데
   * 7명만 체크되어, 어느 7명인지는 화면을 훑어야 안다. 호출부가 `remaining`으로 먼저 잠근다.
   */
  addAll: (members: readonly SelectableMember[]) => void;
  removeAll: (memberIds: readonly number[]) => void;
  clear: () => void;
}

/**
 * @param scopeKey 선택이 뜻을 갖는 목록의 조건. 바뀌면 선택을 비운다
 */
export function useMemberSelection(scopeKey: string): MemberSelection {
  const [selected, setSelected] = useState<ReadonlyMap<number, string>>(() => new Map());

  /* 조건이 바뀌면 렌더 중에 비운다 — 근거는 첫 주석 */
  const [syncedScope, setSyncedScope] = useState(scopeKey);
  if (syncedScope !== scopeKey) {
    setSyncedScope(scopeKey);
    if (selected.size > 0) setSelected(new Map());
  }

  const has = useCallback((memberId: number) => selected.has(memberId), [selected]);

  const toggle = useCallback((member: SelectableMember) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(member.memberId)) {
        next.delete(member.memberId);
      } else {
        if (next.size >= BULK_CHANGE_MAX_TARGETS) return prev;
        next.set(member.memberId, member.name);
      }
      return next;
    });
  }, []);

  const addAll = useCallback((members: readonly SelectableMember[]) => {
    setSelected((prev) => {
      const next = new Map(prev);
      for (const m of members) next.set(m.memberId, m.name);
      /* 이미 고른 사람은 다시 세지 않는다 — Map이 접어 준 뒤의 크기로 판정한다 */
      return next.size > BULK_CHANGE_MAX_TARGETS ? prev : next;
    });
  }, []);

  const removeAll = useCallback((memberIds: readonly number[]) => {
    setSelected((prev) => {
      const next = new Map(prev);
      for (const id of memberIds) next.delete(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Map()), []);

  return {
    selected,
    count: selected.size,
    full: selected.size >= BULK_CHANGE_MAX_TARGETS,
    remaining: Math.max(0, BULK_CHANGE_MAX_TARGETS - selected.size),
    has,
    toggle,
    addAll,
    removeAll,
    clear,
  };
}
