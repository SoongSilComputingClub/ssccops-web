"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CSV_DEFAULT_MAP,
  CSV_ERRORS,
  CSV_RESULTS,
  CSV_SAMPLE,
  CSV_SPEC_ROWS,
  CSV_STATS,
  CSV_STEPS,
} from "@/features/member/model/csv-spec";
import { CSV_FIELDS } from "@/shared/config/constants";
import { ROUTES } from "@/shared/config/routes";
import {
  Badge,
  BarStepper,
  Button,
  Card,
  PageBody,
  PageHeader,
  SectionLabel,
  SelectField,
  StatBox,
  flash,
} from "@/shared/ui";

const REQ_COLOR: Record<string, string> = {
  필수: "text-accent",
  조건부: "text-[#f59f00]",
  선택: "text-n500",
};

export function CsvImportPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<string | null>(null);
  const [map, setMap] = useState<Record<string, string>>(CSV_DEFAULT_MAP);

  const downloadTemplate = () => {
    const bom = "﻿";
    const blob = new Blob([bom + CSV_SAMPLE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "SSCC_회원명부_양식.csv";
    a.click();
    URL.revokeObjectURL(url);
    flash("양식 CSV를 다운로드했습니다");
  };

  const next = () => {
    if (step === 1 && !file) {
      flash("CSV 파일을 선택하세요");
      return;
    }
    if (step === 3) flash(`${CSV_STATS.ok}건 이관 완료`);
    setStep((s) => Math.min(4, s + 1));
  };

  return (
    <>
      <PageHeader title="CSV 회원 이관" subtitle="4단계 · 자동 병합 없음" />
      <PageBody>
        <BarStepper steps={CSV_STEPS} current={step} className="mb-5" />

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div
              onClick={() => setFile("SSCC_회원명부_2026.csv (128행)")}
              className="cursor-pointer rounded-[12px] border border-dashed border-line-strong bg-surface px-5 py-14 text-center transition-colors hover:border-accent"
            >
              <div className="text-[16px] font-medium">{file ?? "CSV 파일 선택"}</div>
              <div className="mt-1 text-[13.5px] text-n500">
                CSV · 최대 5MB · UTF-8 권장 · 파일을 끌어다 놓거나 클릭
              </div>
            </div>

            <Card>
              <div className="mb-3 flex items-center">
                <SectionLabel>필요 컬럼</SectionLabel>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="cursor-pointer rounded-full bg-accent-soft px-3 py-[5px] text-[13.5px] text-accent hover:bg-accent/15"
                >
                  양식 CSV 내려받기
                </button>
              </div>
              <div className="grid grid-cols-[130px_70px_1fr_150px]">
                {["컬럼", "구분", "설명", "예시"].map((h) => (
                  <div key={h} className="pb-[10px] text-[13px] tracking-[.3px] text-n500">
                    {h}
                  </div>
                ))}
                {CSV_SPEC_ROWS.map((r) => (
                  <div key={r.col} className="contents">
                    <div className="border-t border-black/5 py-[10px] text-[14.5px] font-medium">
                      {r.col}
                    </div>
                    <div
                      className={`border-t border-black/5 py-[10px] text-[14px] ${REQ_COLOR[r.req]}`}
                    >
                      {r.req}
                    </div>
                    <div className="border-t border-black/5 py-[10px] text-[14px] text-n400">
                      {r.desc || "—"}
                    </div>
                    <div className="border-t border-black/5 py-[10px] font-mono text-[13px] text-n400">
                      {r.ex}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-[13.5px] text-n500">
                헤더 이름이 달라도 다음 단계에서 직접 매핑할 수 있습니다. 컬럼 순서는
                상관없습니다.
              </div>
              <pre className="mt-3 overflow-x-auto rounded-[10px] bg-[#f9fafb] p-3 font-mono text-[12.5px] leading-[1.9] text-n300">
                {CSV_SAMPLE}
              </pre>
            </Card>
          </div>
        )}

        {step === 2 && (
          <Card className="max-w-[640px]">
            <SectionLabel className="mb-4">CSV 헤더 → 시스템 필드</SectionLabel>
            <div className="flex flex-col gap-3">
              {Object.keys(CSV_DEFAULT_MAP).map((header) => (
                <div key={header} className="flex items-center gap-3">
                  <div className="w-[130px] text-[15px] font-medium">{header}</div>
                  <div className="text-n500">→</div>
                  <SelectField
                    value={map[header]}
                    onChange={(e) => setMap((m) => ({ ...m, [header]: e.target.value }))}
                    className="max-w-[240px]"
                  >
                    {CSV_FIELDS.map((f) => (
                      <option key={f.value || "none"} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </SelectField>
                </div>
              ))}
            </div>
          </Card>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-4 gap-3">
              <StatBox label="전체 행" value={CSV_STATS.total} size="lg" />
              <StatBox label="정상 후보" value={CSV_STATS.ok} tone="accent" size="lg" />
              <StatBox label="오류" value={CSV_STATS.error} tone="danger" size="lg" />
              <StatBox label="중복 후보" value={CSV_STATS.dup} tone="danger" size="lg" />
            </div>
            <Card>
              <SectionLabel className="mb-3">대표 오류</SectionLabel>
              <div className="grid grid-cols-[70px_1fr_1.2fr]">
                {["행", "대상", "사유"].map((h) => (
                  <div key={h} className="pb-[10px] text-[13px] tracking-[.3px] text-n500">
                    {h}
                  </div>
                ))}
                {CSV_ERRORS.map((e) => (
                  <div key={e.row} className="contents">
                    <div className="border-t border-black/5 py-3 text-[15px]">{e.row}</div>
                    <div className="border-t border-black/5 py-3 text-[15px]">
                      {e.target}
                    </div>
                    <div className="border-t border-black/5 py-3 text-[14px] text-danger">
                      {e.reason}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-4">
            <Card>
              <div className="flex items-baseline gap-1">
                <div className="text-[40px] font-medium text-accent">{CSV_STATS.ok}</div>
                <div className="text-[16px]">건 이관 완료</div>
              </div>
              <div className="mt-4 grid grid-cols-[70px_1fr_140px]">
                {["행", "대상", "결과"].map((h) => (
                  <div key={h} className="pb-[10px] text-[13px] tracking-[.3px] text-n500">
                    {h}
                  </div>
                ))}
                {CSV_RESULTS.map((r) => (
                  <div key={r.row} className="contents">
                    <div className="border-t border-black/5 py-3 text-[15px]">{r.row}</div>
                    <div className="border-t border-black/5 py-3 text-[15px]">
                      {r.target}
                    </div>
                    <div className="border-t border-black/5 py-3">
                      <Badge tone={r.result === "성공" ? "blue" : "red"}>{r.result}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <div>
              <Button variant="ghost" onClick={() => router.push(ROUTES.members)}>
                회원 목록으로 이동
              </Button>
            </div>
          </div>
        )}

        {step < 4 && (
          <div className="mt-5">
            <Button className="px-[26px] py-[11px]" onClick={next}>
              {step === 1 ? "컬럼 매핑" : step === 2 ? "사전 검증" : "이관 실행"}
            </Button>
          </div>
        )}
      </PageBody>
    </>
  );
}
