"use client";

import { useState } from "react";
import {
  RESPONSE_STATUS,
  useResponseStore,
  type ResponseStatus,
} from "@/entities/response";
import { Chip, Sheet, flash } from "@/shared/ui";

const STATUSES = Object.keys(RESPONSE_STATUS) as ResponseStatus[];

/** 응답 상태 변경 시트 */
export function ResponseStatusSheet({
  responseId,
  current,
  onClose,
}: {
  responseId: string | null;
  current?: ResponseStatus;
  onClose: () => void;
}) {
  const setStatus = useResponseStore((s) => s.setStatus);
  const [pick, setPick] = useState<ResponseStatus | null>(null);

  if (!responseId) return null;
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
        setStatus(responseId, selected);
        flash(`응답 상태를 ${RESPONSE_STATUS[selected].label}(으)로 변경했습니다`);
        close();
      }}
      okLabel="변경"
    >
      <div className="flex flex-wrap gap-[7px]">
        {STATUSES.map((s) => (
          <Chip key={s} active={selected === s} onClick={() => setPick(s)}>
            {RESPONSE_STATUS[s].label}
          </Chip>
        ))}
      </div>
    </Sheet>
  );
}
