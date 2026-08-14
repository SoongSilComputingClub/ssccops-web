"use client";

import { useState } from "react";
import { RSPNS_STTS_BADGE } from "@/entities/response";
import { RSPNS_RVW_STTS_CDS, type RspnsSttsCd } from "@/shared/config/codes";
import { Chip, Sheet, flash } from "@/shared/ui";
import { useResponseStatusChange } from "../model/use-response-status";

/**
 * 응답 상태 변경 시트.
 *
 * ── 성공 후 갱신은 낙관적 업데이트가 아니라 재조회다 ────────────
 * 화면이 먼저 배지를 바꾸고 나중에 서버와 맞추는 방식을 쓰지 않는다(#7에서 정한 방식과 같다).
 * 상태 하나를 바꾸면 목록의 상태 필터 결과, 상세, 폼 상세의 응답 요약 집계가 함께 달라지는데
 * 그 파생값들을 화면에서 정확히 다시 계산할 수 없다. 되돌릴 상태를 만들지 않으므로 실패
 * 시 롤백할 것도 없다 — 안내만 띄우고 시트를 열어 둔 채 다시 고르게 한다.
 */
export function ResponseStatusSheet({
  formId,
  formRspnsId,
  current,
  onClose,
  onChanged,
}: {
  formId: number;
  /** null이면 닫힌 상태 */
  formRspnsId: number | null;
  current?: RspnsSttsCd;
  onClose: () => void;
  /** 변경 성공 후 호출 — 호출부가 목록·상세를 다시 불러온다 */
  onChanged: () => void;
}) {
  const { saving, change } = useResponseStatusChange();
  const [pick, setPick] = useState<RspnsSttsCd | null>(null);

  if (formRspnsId === null) return null;

  /*
   * 작성 중(DRAFT) 응답에는 시트를 열지 않는다. 호출부가 이미 막고 있지만 여기서도 끊는 이유는,
   * 제출 전 답안을 운영자가 승인해 확정시키는 조작이 **어느 경로로도** 열리면 안 되기 때문이다.
   * 서버도 400으로 거절하므로 열어 봤자 실패만 보게 된다.
   */
  if (current === "DRAFT") return null;

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
        void (async () => {
          const errorMessage = await change(formId, formRspnsId, selected);
          if (errorMessage) {
            flash(errorMessage);
            return;
          }
          flash(`응답 상태를 ${RSPNS_STTS_BADGE[selected].label}(으)로 변경했습니다`);
          close();
          onChanged();
        })();
      }}
      okLabel={saving ? "변경 중…" : "변경"}
    >
      <div className="flex flex-wrap gap-[7px]">
        {/* 심사 대상 상태만 — DRAFT는 이 목록에 없다 */}
        {RSPNS_RVW_STTS_CDS.map((cd) => (
          <Chip
            key={cd}
            active={selected === cd}
            onClick={() => {
              if (!saving) setPick(cd);
            }}
          >
            {RSPNS_STTS_BADGE[cd].label}
          </Chip>
        ))}
      </div>
    </Sheet>
  );
}
