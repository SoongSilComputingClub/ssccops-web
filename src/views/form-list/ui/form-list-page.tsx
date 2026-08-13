"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FORM_STATUS, useFormStore, type FormStatus } from "@/entities/form";
import { useResponseStore } from "@/entities/response";
import { ROUTES } from "@/shared/config/routes";
import {
  Badge,
  Card,
  Chip,
  PageBody,
  PageHeader,
  Pill,
  flash,
} from "@/shared/ui";

const STATUS_TABS = [
  { label: "전체", value: "전체" },
  { label: "작성중", value: "DRAFT" },
  { label: "접수중", value: "OPEN" },
  { label: "마감", value: "CLOSED" },
] as const;

export function FormListPage() {
  const router = useRouter();
  const { forms, labels, duplicateForm } = useFormStore();
  const responses = useResponseStore((s) => s.responses);
  const [status, setStatus] = useState<string>("전체");
  const [label, setLabel] = useState("전체");

  const filtered = forms.filter(
    (f) =>
      (status === "전체" || f.status === status) &&
      (label === "전체" || f.labels.includes(label)),
  );

  return (
    <>
      <PageHeader
        title="폼 관리"
        subtitle="라벨 중심 분류"
        action={{ label: "+ 새 폼", onClick: () => router.push(ROUTES.formNew) }}
      />
      <PageBody>
        <div className="mb-4 flex flex-wrap items-center gap-[7px]">
          {STATUS_TABS.map((t) => (
            <Chip
              key={t.value}
              active={status === t.value}
              onClick={() => setStatus(t.value)}
            >
              {t.label}
            </Chip>
          ))}
          <div className="mx-2 h-5 w-px bg-line" />
          {["전체", ...labels.filter((l) => l.on).map((l) => l.name)].map((l) => (
            <Chip key={l} active={label === l} onClick={() => setLabel(l)}>
              {l}
            </Chip>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-[14px]">
          {filtered.map((f) => {
            const count = responses.filter((r) => r.form === f.key).length;
            const fs = FORM_STATUS[f.status as FormStatus];
            return (
              <Card key={f.key}>
                <div className="flex items-center gap-2">
                  <Badge tone={fs.tone}>{fs.label}</Badge>
                  <div className="flex-1" />
                  <div className="text-[13.5px] text-n500">응답 {count}</div>
                </div>
                <div
                  onClick={() => router.push(ROUTES.formDetail(f.key))}
                  className="mt-2 cursor-pointer text-[18px] leading-[1.35] font-semibold hover:text-accent"
                >
                  {f.title}
                </div>
                <div className="mt-1 text-[13.5px] text-n500">
                  {f.start ? `${f.start} ~ ${f.end}` : "접수 기간 미설정"}
                </div>
                {f.labels.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-[6px]">
                    {f.labels.map((l) => (
                      <Pill key={l} tone="blue">
                        {l}
                      </Pill>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex items-center gap-3 border-t border-black/5 pt-3 text-[14px]">
                  <button
                    type="button"
                    onClick={() => {
                      duplicateForm(f.key);
                      flash("DRAFT 폼으로 복제했습니다");
                    }}
                    className="cursor-pointer text-accent"
                  >
                    복제
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(ROUTES.formEdit(f.key))}
                    className="cursor-pointer text-accent"
                  >
                    수정
                  </button>
                  <div className="flex-1" />
                  <div className="text-[13px] text-n500">수정 {f.updated}</div>
                </div>
              </Card>
            );
          })}
        </div>
      </PageBody>
    </>
  );
}
