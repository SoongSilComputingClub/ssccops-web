"use client";

import { useState } from "react";
import { type Mbr } from "@/entities/member";
import { useRoleStore } from "@/entities/role";
import { Chip, Sheet } from "@/shared/ui";
import { useMemberActions } from "../model/use-member-actions";

/** 역할 부여 시트 */
export function RoleSheet({
  mbr,
  open,
  onClose,
}: {
  mbr: Mbr;
  open: boolean;
  onClose: () => void;
}) {
  const roles = useRoleStore((s) => s.roles);
  const { assignRole } = useMemberActions();
  const [pick, setPick] = useState<number | null>(null);

  if (!open) return null;
  const selected = pick ?? roles[0]?.roleId ?? 0;

  const close = () => {
    setPick(null);
    onClose();
  };

  return (
    <Sheet
      open
      title="역할 추가"
      hint="부여할 역할을 선택하세요"
      onClose={close}
      onOk={() => {
        assignRole(mbr, selected);
        close();
      }}
      okLabel="부여"
    >
      <div className="flex flex-wrap gap-[7px]">
        {roles.map((r) => (
          <Chip
            key={r.roleId}
            active={selected === r.roleId}
            onClick={() => setPick(r.roleId)}
          >
            {r.roleNm}
          </Chip>
        ))}
      </div>
    </Sheet>
  );
}
