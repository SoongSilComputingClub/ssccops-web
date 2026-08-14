"use client";

import { useState } from "react";
import { mbrGrdNm, mbrSttsNm, useMbrStore, type Mbr } from "@/entities/member";
import type { MbrGrdCd, MbrSttsCd } from "@/shared/config/codes";
import { Chip, Sheet, TextField } from "@/shared/ui";
import { useMemberActions } from "../model/use-member-actions";

/** 회원 등급/상태 변경 시트 */
export function GradeStatusSheet({
  mbr,
  kind,
  onClose,
}: {
  mbr: Mbr;
  kind: "grd" | "stts" | null;
  onClose: () => void;
}) {
  const { mbrGrds, mbrSttss } = useMbrStore();
  const { changeMbrGrd, changeMbrStts } = useMemberActions();
  const [pick, setPick] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  if (!kind) return null;

  const options =
    kind === "grd"
      ? mbrGrds.map((g) => ({ cd: g.mbrGrdCd as string, nm: g.mbrGrdNm }))
      : mbrSttss.map((s) => ({ cd: s.mbrSttsCd as string, nm: s.mbrSttsNm }));
  const currentCd = kind === "grd" ? mbr.mbrGrdCd : mbr.mbrSttsCd;
  const currentNm = kind === "grd" ? mbrGrdNm(mbr.mbrGrdCd) : mbrSttsNm(mbr.mbrSttsCd);
  const selected = pick ?? currentCd;

  const close = () => {
    setPick(null);
    setReason("");
    onClose();
  };

  return (
    <Sheet
      open
      title={kind === "grd" ? "회원등급 변경" : "회원상태 변경"}
      hint={`현재 ${currentNm} · 변경할 값을 선택하세요`}
      onClose={close}
      onOk={() => {
        if (kind === "grd") changeMbrGrd(mbr, selected as MbrGrdCd, reason.trim());
        else changeMbrStts(mbr, selected as MbrSttsCd, reason.trim());
        close();
      }}
      okLabel="변경"
    >
      <div className="mb-4 flex flex-wrap gap-[7px]">
        {options.map((o) => (
          <Chip key={o.cd} active={selected === o.cd} onClick={() => setPick(o.cd)}>
            {o.nm}
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
