"use client";

import { useState } from "react";
import { type Member } from "@/entities/member";
import { useRoleStore } from "@/entities/role";
import { Chip, Sheet, TextField } from "@/shared/ui";
import { useMemberActions } from "../model/use-member-actions";

/** 역할 부여 시트 */
export function RoleSheet({
  member,
  open,
  onClose,
}: {
  member: Member;
  open: boolean;
  onClose: () => void;
}) {
  const roles = useRoleStore((s) => s.roles.filter((r) => r.on));
  const { assignRole } = useMemberActions();
  const [pick, setPick] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  if (!open) return null;
  const selected = pick ?? roles[0]?.name ?? "";

  const close = () => {
    setPick(null);
    setReason("");
    onClose();
  };

  return (
    <Sheet
      open
      title="역할 추가"
      hint="부여할 역할을 선택하세요"
      onClose={close}
      onOk={() => {
        assignRole(member, selected, reason.trim());
        close();
      }}
      okLabel="부여"
    >
      <div className="mb-4 flex flex-wrap gap-[7px]">
        {roles.map((r) => (
          <Chip key={r.id} active={selected === r.name} onClick={() => setPick(r.name)}>
            {r.name}
          </Chip>
        ))}
      </div>
      <div className="mb-[6px] text-[13.5px] text-n400">부여 사유 (선택)</div>
      <TextField
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="예: 2026-1 조직 개편"
      />
    </Sheet>
  );
}
