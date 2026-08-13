"use client";

import { useState } from "react";
import { useMemberStore, type Member } from "@/entities/member";
import { Chip, Sheet, TextField } from "@/shared/ui";
import { useMemberActions } from "../model/use-member-actions";

/** 회원 등급/상태 변경 시트 */
export function GradeStatusSheet({
  member,
  kind,
  onClose,
}: {
  member: Member;
  kind: "grade" | "status" | null;
  onClose: () => void;
}) {
  const { grades, statuses } = useMemberStore();
  const { changeGradeOrStatus } = useMemberActions();
  const [pick, setPick] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  if (!kind) return null;
  const options = (kind === "grade" ? grades : statuses).filter((o) => o.on);
  const current = member[kind];
  const selected = pick ?? current;

  const close = () => {
    setPick(null);
    setReason("");
    onClose();
  };

  return (
    <Sheet
      open
      title={kind === "grade" ? "회원등급 변경" : "회원상태 변경"}
      hint={`현재 ${current} · 변경할 값을 선택하세요`}
      onClose={close}
      onOk={() => {
        changeGradeOrStatus(member, kind, selected, reason.trim());
        close();
      }}
      okLabel="변경"
    >
      <div className="mb-4 flex flex-wrap gap-[7px]">
        {options.map((o) => (
          <Chip key={o.name} active={selected === o.name} onClick={() => setPick(o.name)}>
            {o.name}
          </Chip>
        ))}
      </div>
      <div className="mb-[6px] text-[13.5px] text-n400">변경 사유 (선택)</div>
      <TextField
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="예: 정기 승급"
      />
    </Sheet>
  );
}
