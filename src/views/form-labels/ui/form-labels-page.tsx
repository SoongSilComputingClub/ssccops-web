"use client";

import { useState } from "react";
import { useFormStore } from "@/entities/form";
import {
  Button,
  Card,
  PageBody,
  PageHeader,
  TextField,
  Toggle,
  flash,
} from "@/shared/ui";

export function FormLabelsPage() {
  const { formLbls, formLblRels, addFormLbl, toggleFormLbl } = useFormStore();
  const [newLblNm, setNewLblNm] = useState("");

  const usage = (formLblId: number) =>
    formLblRels.filter((r) => r.formLblId === formLblId).length;

  const add = () => {
    const lblNm = newLblNm.trim();
    if (!lblNm) {
      flash("라벨_명을 입력하세요");
      return;
    }
    if (formLbls.some((l) => l.lblNm === lblNm)) {
      flash("이미 있는 라벨입니다");
      return;
    }
    addFormLbl(lblNm);
    setNewLblNm("");
    flash(`${lblNm} 라벨 추가됨`);
  };

  return (
    <>
      <PageHeader title="라벨 관리" subtitle="사용_여부 토글" />
      <PageBody>
        <div className="mb-4 flex items-center gap-2">
          <TextField
            value={newLblNm}
            onChange={(e) => setNewLblNm(e.target.value)}
            placeholder="새 라벨_명"
            className="w-[260px]"
          />
          <Button onClick={add}>추가</Button>
        </div>

        <Card className="max-w-[640px] px-5 pt-4 pb-[6px]">
          <div className="grid grid-cols-[1fr_120px_80px]">
            {["라벨_명", "사용 중인 폼", "사용_여부"].map((h) => (
              <div key={h} className="pb-[10px] text-[13px] tracking-[.3px] text-n500">
                {h}
              </div>
            ))}
            {formLbls.map((l) => (
              <div key={l.formLblId} className="contents">
                <div
                  className={
                    l.useYn
                      ? "border-t border-black/5 py-3 text-[15px] font-medium"
                      : "border-t border-black/5 py-3 text-[15px] text-n500 line-through"
                  }
                >
                  {l.lblNm}
                </div>
                <div className="border-t border-black/5 py-3 text-[14.5px] text-n400">
                  {usage(l.formLblId)}건
                </div>
                <div className="border-t border-black/5 py-3">
                  <Toggle on={l.useYn} onChange={() => toggleFormLbl(l.formLblId)} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </PageBody>
    </>
  );
}
