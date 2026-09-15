"use client";

import { useId, useState, type ChangeEvent, type DragEvent } from "react";
import { formatFileSize } from "@/entities/rag-document";
import { cn } from "@/shared/lib/cn";
import { Field, Sheet, TextField } from "@/shared/ui";
import type { RagUpload } from "../model/use-rag-upload";

/*
 * 문서 업로드 — 드롭존 + 다이얼로그 (#432).
 *
 * ── 미리보기 단계가 없다 ────────────────────────────────────────
 * 고른 파일이 곧바로 올라가고 파싱은 **그 요청 안에서** 끝난다(서버 #399). 그래서 계약 위반은
 * 여기서 400으로 돌아오며 `.md`는 몇째 줄이 왜 걸렸는지까지 실려 온다 — 그 문장이 미리보기가
 * 하던 일을 대신한다. 성공한 문서는 «개정안»으로 들어와 아직 검색에 잡히지 않으므로, 잘못
 * 올린 것이 곧바로 답변 근거가 되는 일도 없다.
 *
 * ── 왜 Sheet 안에 드롭존을 두는가 ───────────────────────────────
 * 표시명·문서 코드를 파일과 함께 정해야 해서다. 파일만 받는 자리였다면 표 위의 버튼이
 * 파일 선택기를 바로 여는 편이 짧지만, 그러면 두 입력란이 갈 곳이 없어진다.
 */
export function RagUploadDialog({
  upload,
  onUploaded,
}: Readonly<{
  upload: RagUpload;
  /** 올라간 직후 — 호출부가 목록을 다시 받아 «대기» 행을 표에 드러낸다 */
  onUploaded: () => void;
}>) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);

  const { open, file, name, fileErrorMessage, errorMessage, uploading } = upload;

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    if (picked) upload.selectFile(picked);
    /* 같은 파일을 다시 고르는 것도 선택이다 — 값을 비워 두지 않으면 change가 오지 않는다 */
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) upload.selectFile(dropped);
  };

  const submit = () => {
    void upload.submit().then((uploaded) => {
      if (uploaded) onUploaded();
    });
  };

  return (
    <Sheet
      open={open}
      title="규정 문서 올리기"
      hint="올린 문서는 개정안으로 들어와 색인이 끝나기 전까지 답변에 쓰이지 않습니다"
      onClose={upload.closeDialog}
      onOk={submit}
      okLabel={uploading ? "올리는 중…" : "올리기"}
      okDisabled={!file || uploading}
      okTitle={file ? undefined : "올릴 파일을 먼저 고르세요"}
    >
      <div className="flex flex-col gap-3">
        {/*
         * 드롭 영역을 label로 두면 클릭은 label이, 키보드 접근은 input이 맡는다. input을 숨기되
         * 화면 밖으로 밀어 두는 것은 display:none이면 포커스를 받지 못해 키보드만 쓰는 사람이
         * 파일을 고를 길이 없어지기 때문이다 (CSV 이관과 같은 구조).
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
            "block cursor-pointer rounded-[12px] border border-dashed border-line-strong bg-bg px-4 py-9 text-center transition-colors hover:border-accent focus-within:border-accent",
            dragging && "border-accent bg-accent-soft",
          )}
        >
          <input
            id={inputId}
            type="file"
            accept=".md,.pdf,.docx"
            onChange={onPick}
            disabled={uploading}
            className="sr-only"
          />
          <div className="text-[15px] font-medium break-all">
            {file ? file.name : "문서 파일 선택"}
          </div>
          <div className="mt-1 text-[13px] text-n500">
            {file
              ? `${formatFileSize(file.size)} · 다른 파일을 끌어다 놓거나 클릭하면 바꿀 수 있습니다`
              : ".md · .pdf · .docx · 최대 10MB · 파일을 끌어다 놓거나 클릭"}
          </div>
        </label>

        {/* 확장자·크기로 걸린 파일 — 서버에 보내기 전에 화면이 막은 것이다 */}
        {fileErrorMessage && (
          <div className="rounded-[10px] bg-danger/10 px-3 py-2 text-[13.5px] text-danger">
            {fileErrorMessage}
          </div>
        )}

        {file && (
          <button
            type="button"
            onClick={upload.clearFile}
            disabled={uploading}
            className="self-start cursor-pointer text-[13px] text-n400 underline underline-offset-2 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            파일 지우기
          </button>
        )}

        {/*
         * **「문서 코드」 칸이 있던 자리다** (#460 · 서버 ADR-0034). 「비우면 서버가 정합니다」라고
         * 안내했지만 서버에 그 경로가 없어 비우면 400이었고, 자동 생성은 그 값의 존재 이유(판본을
         * 묶는다)와 모순이라 만들 수도 없었다. 판본 관리를 걷어내며 칸 자체가 사라졌다.
         */}
        <Field label="표시명">
          <TextField
            value={name}
            onChange={(e) => upload.setName(e.target.value)}
            placeholder="비우면 파일 이름을 씁니다"
            disabled={uploading}
          />
          <div className="mt-[5px] text-[12.5px] text-n500">
            문서 하나가 규정 하나입니다 — 개정된 규정을 올릴 때는 옛 문서를 지우고 새로 올려주세요
          </div>
        </Field>

        {/*
         * 서버가 거절한 사유. `.md` 파싱 실패는 **몇째 줄이 왜 걸렸는지**가 이 자리에 그대로
         * 실린다 — 미리보기 단계가 없어도 운영진이 즉시 아는 유일한 통로다(#432).
         */}
        {errorMessage && (
          <div className="rounded-[10px] bg-danger/10 px-3 py-2 text-[13.5px] leading-[1.6] whitespace-pre-wrap text-danger">
            {errorMessage}
          </div>
        )}
      </div>
    </Sheet>
  );
}
