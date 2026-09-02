"use client";

import { useId, useState, type ChangeEvent, type DragEvent } from "react";
import type { MemberImportWizard } from "@/features/member";
import { CSV_SAMPLE, CSV_SPEC_ROWS } from "@/features/member/model/csv-spec";
import { cn } from "@/shared/lib/cn";
import { downloadCsv } from "@/shared/lib/download-csv";
import { Button, Card, SectionLabel, flash } from "@/shared/ui";

/*
 * 1단계 — 파일 선택 (#57).
 *
 * ── 진짜 파일을 고른다 ──────────────────────────────────────────
 * 예전에는 이 영역을 누르면 `setFile("SSCC_회원명부_2026.csv (128행)")`라는 문자열이 박혔다.
 * 지금은 `<input type="file" accept=".csv">`와 끌어다 놓기가 실제 `File`을 잡고, 그 파일이
 * 곧바로 서버의 미리보기로 올라간다 — 행 수도 헤더도 서버가 읽은 값이다.
 *
 * ── 클라이언트가 거르는 것은 둘뿐이다 ────────────────────────────
 * 확장자와 크기(5MB). 헤더가 있는지·따옴표가 닫혔는지·UTF-8인지는 **서버가 본다**. 여기서
 * 흉내 내면 파일을 읽는 규칙이 두 벌이 되고, 그 두 벌이 갈리는 것이 이 화면이 피하려는 바로
 * 그 사고다(entities/member/api/member-imports.ts 첫 주석).
 */

/** 안내표의 구분 색 — '이관 안 함'은 지킬 규칙이 아니라 사실이라 가장 옅게 둔다 */
const REQ_COLOR: Record<string, string> = {
  필수: "text-accent",
  조건부: "text-[#f59f00]",
  선택: "text-n500",
  "이관 안 함": "text-n500",
};

export function FileStep({ wizard }: { wizard: MemberImportWizard }) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);

  const { file, preview, previewing, fileErrorMessage, selectFile, clearFile } = wizard;

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    if (picked) selectFile(picked);
    /* 같은 파일을 다시 고르는 것도 선택이다 — 값을 비워 두지 않으면 change가 오지 않는다 */
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) selectFile(dropped);
  };

  const downloadTemplate = () => {
    downloadCsv("SSCC_회원명부_양식.csv", CSV_SAMPLE);
    flash("양식 CSV를 다운로드했습니다");
  };

  return (
    <div className="flex flex-col gap-4">
      {/*
       * 드롭 영역을 label로 두면 클릭은 label이, 키보드 접근은 input이 맡는다. input을 숨기되
       * 화면 밖으로 밀어 두는 것은 display:none 이면 포커스를 받지 못해 키보드만 쓰는 사람이
       * 파일을 고를 길이 없어지기 때문이다.
       */}
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "block cursor-pointer rounded-[12px] border border-dashed border-line-strong bg-surface px-5 py-14 text-center transition-colors hover:border-accent focus-within:border-accent",
          dragging && "border-accent bg-accent-soft",
        )}
      >
        <input
          id={inputId}
          type="file"
          accept=".csv"
          onChange={onPick}
          disabled={previewing}
          className="sr-only"
        />
        <div className="text-[16px] font-medium">
          {previewing
            ? "파일을 확인하는 중…"
            : file && preview
              ? `${file.name} (${preview.totalRowCount}행)`
              : "CSV 파일 선택"}
        </div>
        <div className="mt-1 text-[13.5px] text-n500">
          {file && preview
            ? "다른 파일을 끌어다 놓거나 클릭하면 바꿀 수 있습니다"
            : "CSV · 최대 5MB · UTF-8 · 파일을 끌어다 놓거나 클릭"}
        </div>
      </label>

      {fileErrorMessage && (
        <div className="rounded-[12px] bg-danger/10 px-4 py-3 text-[14px] text-danger">
          {fileErrorMessage}
        </div>
      )}

      {file && preview && (
        <div className="flex flex-wrap items-center gap-3 text-[13.5px] text-n500 lg:flex-nowrap">
          <span>
            헤더 {preview.headers.length}개를 읽었습니다 — 다음 단계에서 컬럼을 맞춥니다
          </span>
          <button
            type="button"
            onClick={clearFile}
            className="cursor-pointer text-n400 underline underline-offset-2 hover:text-accent"
          >
            파일 지우기
          </button>
        </div>
      )}

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
        {/*
          안내표는 컬럼·구분·설명·예시를 가로로 맞춰 읽는 표라 세로로 쪼개면 '이 예시가 어느
          컬럼의 것인지'를 다시 찾아야 한다. 좁은 화면에서는 표 구조를 바꾸는 대신 **이 표만**
          가로로 스크롤시킨다 — 화면 전체가 밀리면 위의 파일 선택 영역까지 따라 밀린다.
          CSV 이관은 원래 데스크톱 작업이라 여기서는 '깨지지 않는 것'까지가 목표다 (#96).
        */}
        <div className="overflow-x-auto">
        <div className="grid min-w-[560px] grid-cols-[130px_70px_1fr_150px] lg:min-w-0">
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
                className={`border-t border-black/5 py-[10px] text-[14px] ${REQ_COLOR[r.req] ?? "text-n500"}`}
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
        </div>
        <div className="mt-3 text-[13.5px] text-n500">
          헤더 이름이 달라도 다음 단계에서 직접 매핑할 수 있습니다. 컬럼 순서는 상관없습니다.
        </div>
        <pre className="mt-3 overflow-x-auto rounded-[10px] bg-[#f9fafb] p-3 font-mono text-[12.5px] leading-[1.9] text-n300">
          {CSV_SAMPLE}
        </pre>
      </Card>

      <div>
        <Button
          className="px-[26px] py-[11px]"
          onClick={wizard.goToMapping}
          disabled={!preview || previewing}
          title={preview ? undefined : "CSV 파일을 먼저 고르세요"}
        >
          컬럼 매핑
        </Button>
      </div>
    </div>
  );
}
