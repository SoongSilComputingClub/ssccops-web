"use client";

import { useMemberStore, type Member } from "@/entities/member";
import { TODAY } from "@/shared/config/constants";
import { flash } from "@/shared/ui";

/** 회원 등급/상태/역할 변경 — 스토어 갱신 + 변경이력 기록 + 토스트 */
export function useMemberActions() {
  const updateMember = useMemberStore((s) => s.updateMember);
  const addHistory = useMemberStore((s) => s.addHistory);
  const addRole = useMemberStore((s) => s.addRole);
  const endRoleInStore = useMemberStore((s) => s.endRole);

  const changeGradeOrStatus = (
    member: Member,
    kind: "grade" | "status",
    to: string,
    reason: string,
  ) => {
    updateMember(member.key, { [kind]: to });
    addHistory({
      type: kind === "grade" ? "등급" : "상태",
      member: member.name,
      from: member[kind],
      to,
      reason: reason || "사유 미기재",
      by: "김도현",
      at: `${TODAY} 10:00`,
    });
    flash(kind === "grade" ? "등급이 변경되었습니다" : "상태가 변경되었습니다");
  };

  const assignRole = (member: Member, roleName: string, reason: string) => {
    addRole(member.key, roleName);
    addHistory({
      type: "역할",
      member: member.name,
      from: "-",
      to: roleName,
      reason: reason || "역할 부여",
      by: "김도현",
      at: `${TODAY} 10:00`,
    });
    flash(`${roleName} 역할을 부여했습니다`);
  };

  const endRole = (member: Member, roleName: string) => {
    endRoleInStore(member.key, roleName);
    addHistory({
      type: "역할",
      member: member.name,
      from: `${roleName} (재임)`,
      to: `${roleName} (종료 ${TODAY})`,
      reason: "역할 종료",
      by: "김도현",
      at: `${TODAY} 10:00`,
    });
    flash(`${roleName} 역할을 종료했습니다`);
  };

  return { changeGradeOrStatus, assignRole, endRole };
}
