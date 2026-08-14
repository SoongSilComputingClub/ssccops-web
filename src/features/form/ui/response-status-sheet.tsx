"use client";

import { useState } from "react";
import { RSPNS_STTS_BADGE, useRspnsStore } from "@/entities/response";
import { RSPNS_STTS_CDS, type RspnsSttsCd } from "@/shared/config/codes";
import { Chip, Sheet, flash } from "@/shared/ui";

/** 응답 상태 변경 시트 */
export function ResponseStatusSheet({
  formRspnsId,
  current,
  onClose,
}: {
  formRspnsId: number | null;
  current?: RspnsSttsCd;
  onClose: () => void;
}) {
  const setRspnsStts = useRspnsStore((s) => s.setRspnsStts);
  const [pick, setPick] = useState<RspnsSttsCd | null>(null);

  if (!formRspnsId) return null;
  const selected = pick ?? current ?? "SUBMITTED";

  const close = () => {
    setPick(null);
    onClose();
  };

  return (
    <Sheet
      open
      title="응답 상태 변경"
      hint="변경할 상태를 선택하세요"
      onClose={close}
      onOk={() => {
        setRspnsStts(formRspnsId, selected);
        flash(`응답 상태를 ${RSPNS_STTS_BADGE[selected].label}(으)로 변경했습니다`);
        close();
      }}
      okLabel="변경"
    >
      <div className="flex flex-wrap gap-[7px]">
        {RSPNS_STTS_CDS.map((cd) => (
          <Chip key={cd} active={selected === cd} onClick={() => setPick(cd)}>
            {RSPNS_STTS_BADGE[cd].label}
          </Chip>
        ))}
      </div>
    </Sheet>
  );
}
