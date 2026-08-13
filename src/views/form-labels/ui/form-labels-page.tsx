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
  const { forms, labels, addLabel, toggleLabel } = useFormStore();
  const [newName, setNewName] = useState("");

  const usage = (name: string) => forms.filter((f) => f.labels.includes(name)).length;

  const add = () => {
    const name = newName.trim();
    if (!name) {
      flash("분류명을 입력하세요");
      return;
    }
    if (labels.some((l) => l.name === name)) {
      flash("이미 있는 분류입니다");
      return;
    }
    addLabel(name);
    setNewName("");
    flash(`${name} 분류 추가됨`);
  };

  return (
    <>
      <PageHeader title="라벨 관리" subtitle="비활성화 우선" />
      <PageBody>
        <div className="mb-4 flex items-center gap-2">
          <TextField
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="새 분류명"
            className="w-[260px]"
          />
          <Button onClick={add}>추가</Button>
        </div>

        <Card className="max-w-[640px] px-5 pt-4 pb-[6px]">
          <div className="grid grid-cols-[1fr_120px_80px]">
            {["분류명", "사용 중인 폼", "사용여부"].map((h) => (
              <div key={h} className="pb-[10px] text-[13px] tracking-[.3px] text-n500">
                {h}
              </div>
            ))}
            {labels.map((l) => (
              <div key={l.name} className="contents">
                <div
                  className={
                    l.on
                      ? "border-t border-black/5 py-3 text-[15px] font-medium"
                      : "border-t border-black/5 py-3 text-[15px] text-n500 line-through"
                  }
                >
                  {l.name}
                </div>
                <div className="border-t border-black/5 py-3 text-[14.5px] text-n400">
                  {usage(l.name)}건
                </div>
                <div className="border-t border-black/5 py-3">
                  <Toggle on={l.on} onChange={() => toggleLabel(l.name)} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </PageBody>
    </>
  );
}
