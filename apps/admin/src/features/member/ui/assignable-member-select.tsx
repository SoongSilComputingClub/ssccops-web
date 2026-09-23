"use client";

import { SelectField } from "@/shared/ui";
import {
  assignableMemberLabel,
  isAssignablePick,
  type AssignableCurrent,
  type AssignableMembers,
} from "../model/use-assignable-members";

/*
 * 담당자 선택 셀렉트 (#53 등록 · #435 수정 · GET /v1/members/assignable).
 *
 * 운영 등록 화면에 있던 것을 그대로 떼어 왔다 — 업무·하위 업무 수정 화면이 같은 셀렉트를 쓰게
 * 되면서(#435) 세 화면이 각자 복사하면 "빈 값을 실제 선택지로 둔다" 같은 판단이 한 곳에서만
 * 고쳐지는 자리가 생긴다. 상태(어느 값을 골랐는가)는 화면이 쥐고, 이 컴포넌트는 그리기만 한다.
 *
 * 고르지 않았을 때 목록의 첫 회원으로 떨어지지 않도록 **빈 값을 실제 선택지로 둔다** — 아직
 * 목록이 없거나 고른 값이 후보에서 빠진 경우, 셀렉트가 말없이 첫 항목을 보여 주면 화면에 뜬
 * 이름과 서버로 나가는 값이 갈린다.
 *
 * 연락처·이메일·학번은 그리지 않는다 — 이 목록은 권한 없이 열리므로 서버가 그 값을 내리지
 * 않는다. 여기 필요한 것은 동명이인을 가르는 기수·역할까지다(`assignableMemberLabel`).
 *
 * `current`가 후보에 없으면(탈퇴·제명·등급 변경) «현재: 이름»으로 맨 앞에 둔다 — 그 건을
 * 열어 본 사람이 담당자가 누구였는지 알 수 있어야 하고, 담당자를 건드리지 않는 수정도 나갈 수
 * 있어야 한다(`isAssignablePick`).
 */
export function AssignableMemberSelect({
  id,
  "aria-describedby": describedBy,
  assignable,
  value,
  onChange,
  current = null,
  blockReason,
  hint,
}: Readonly<{
  /**
   * `Field`가 라벨을 이으려고 `cloneElement`로 넘기는 것들 — 셀렉트까지 내려보내지 않으면
   * `<label htmlFor>`이 없는 id를 가리켜 **담당자 칸이 이름 없는 입력으로 남는다** (#486).
   */
  id?: string;
  "aria-describedby"?: string;
  assignable: AssignableMembers;
  /** 고른 담당자 — 후보(또는 current)에 없는 값이면 빈 선택지로 보인다 */
  value: number | null;
  onChange: (memberId: number | null) => void;
  /** 수정 화면의 현재 담당자. 후보 목록에 없으면 «현재: 이름»으로 맨 앞에 둔다 */
  current?: AssignableCurrent | null;
  /** `assignableBlockReason` — 빈 문자열이면 확정됐다 */
  blockReason: string;
  /** 잠금 사유가 없을 때 셀렉트 아래에 적는 안내 */
  hint: string;
}>) {
  const pickable = isAssignablePick(assignable, value, current);
  const currentMissing =
    current !== null && assignable.status === "ready" && !assignable.includes(current.memberId)
      ? current
      : null;

  return (
    <>
      <SelectField
        id={id}
        aria-describedby={describedBy}
        value={pickable && value !== null ? String(value) : ""}
        disabled={assignable.status !== "ready"}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">
          {assignable.status === "loading" ? "담당자 목록을 불러오는 중…" : "담당자 선택"}
        </option>
        {currentMissing && (
          <option value={currentMissing.memberId}>현재: {currentMissing.name}</option>
        )}
        {assignable.members.map((m) => (
          <option key={m.memberId} value={m.memberId}>
            {assignableMemberLabel(m)}
          </option>
        ))}
      </SelectField>
      <div
        className={
          blockReason ? "mt-[5px] text-[12.5px] text-danger" : "mt-[5px] text-[12.5px] text-n500"
        }
      >
        {blockReason || hint}
      </div>
      {/* 조회 실패는 등록·저장 자체를 막는 상태라 다시 시도할 길을 그 자리에 둔다 */}
      {assignable.status === "error" && (
        <button
          type="button"
          onClick={assignable.reload}
          className="mt-[5px] cursor-pointer text-[12.5px] underline"
        >
          다시 시도
        </button>
      )}
    </>
  );
}
