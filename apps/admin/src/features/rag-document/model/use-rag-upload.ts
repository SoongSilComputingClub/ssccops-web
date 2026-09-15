"use client";

import { useCallback, useRef, useState } from "react";
import {
  RAG_DOCUMENT_EXTENSIONS,
  RAG_DOCUMENT_MAX_BYTES,
  formatFileSize,
  uploadRagDocument,
  type RagDocument,
} from "@/entities/rag-document";
import { syncSessionOnForbidden } from "@/entities/session";
import { toRagUploadErrorMessage } from "./rag-document-error";

/*
 * 문서 업로드 다이얼로그의 상태 (#432).
 *
 * ── 화면이 먼저 막는 것은 둘뿐이다 ──────────────────────────────
 * 확장자와 크기(10MB). 문서를 읽을 수 있는지·`.md`가 회칙 계약(장·조)을 지키는지는 **서버가
 * 본다** — 여기서 흉내 내면 문서를 읽는 규칙이 두 벌이 되고, 그 두 벌이 갈리는 날 화면은
 * 통과시키고 서버는 거절하는 파일이 생긴다(CSV 이관과 같은 판단).
 *
 * **그렇다고 서버 판정을 대신하지도 않는다.** 10MB를 다 올린 뒤 413을 받는 것보다 그 자리에서
 * 막는 편이 낫지만, 둘 중 하나를 없애면 다른 경로로 들어온 요청이 막히지 않는다(#432).
 */

/** 확장자·크기를 여기서 먼저 본다. 통과하면 빈 문자열 */
export function validateRagFile(file: File): string {
  const lowered = file.name.toLowerCase();
  if (!RAG_DOCUMENT_EXTENSIONS.some((ext) => lowered.endsWith(ext))) {
    return `${RAG_DOCUMENT_EXTENSIONS.join(" · ")}만 올릴 수 있습니다 — 다른 파일을 골라주세요`;
  }
  if (file.size > RAG_DOCUMENT_MAX_BYTES) {
    return `파일이 너무 큽니다 (${formatFileSize(file.size)}) — 10MB 이하로 줄여 다시 올려주세요`;
  }
  return "";
}

export interface RagUpload {
  open: boolean;
  file: File | null;
  /** 표시명 — 비우면 서버가 파일명에서 확장자를 뗀 것을 쓴다 */
  name: string;
  /** 판본을 가로지르는 열쇠 — 비우면 서버가 정한다 */
  documentCode: string;
  /** 파일 선택 단계에서 걸린 사유(확장자·크기). 비어 있으면 정상 */
  fileErrorMessage: string;
  /** 서버가 거절한 사유. `.md` 파싱 실패는 몇째 줄이 왜 걸렸는지가 여기 실린다 */
  errorMessage: string;
  uploading: boolean;

  openDialog: () => void;
  closeDialog: () => void;
  selectFile: (file: File) => void;
  clearFile: () => void;
  setName: (value: string) => void;
  setDocumentCode: (value: string) => void;
  /** 성공하면 올라간 행을, 실패하면 null을 돌려준다 (문구는 `errorMessage`에 남는다) */
  submit: () => Promise<RagDocument | null>;
}

export function useRagUpload(): RagUpload {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [documentCode, setDocumentCode] = useState("");
  const [fileErrorMessage, setFileErrorMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  /* 같은 틱에 두 번 눌린 제출 사이에는 렌더가 없어 `uploading`이 아직 false다 */
  const busyRef = useRef(false);

  const reset = useCallback(() => {
    setFile(null);
    setName("");
    setDocumentCode("");
    setFileErrorMessage("");
    setErrorMessage("");
  }, []);

  const openDialog = useCallback(() => {
    reset();
    setOpen(true);
  }, [reset]);

  const closeDialog = useCallback(() => {
    // 올리는 중에는 닫지 않는다 — 요청은 계속 나가는데 화면에서 사라지면 결과를 알 길이 없다
    if (busyRef.current) return;
    setOpen(false);
    reset();
  }, [reset]);

  const selectFile = useCallback((picked: File) => {
    setErrorMessage("");
    const invalid = validateRagFile(picked);
    if (invalid) {
      // 거른 파일은 쥐지 않는다 — 쥐고 있으면 제출 버튼이 열려 서버에 그대로 나간다
      setFile(null);
      setFileErrorMessage(invalid);
      return;
    }
    setFile(picked);
    setFileErrorMessage("");
  }, []);

  const clearFile = useCallback(() => {
    setFile(null);
    setFileErrorMessage("");
    setErrorMessage("");
  }, []);

  const submit = useCallback(async (): Promise<RagDocument | null> => {
    if (!file || busyRef.current) return null;

    busyRef.current = true;
    setUploading(true);
    setErrorMessage("");

    try {
      const uploaded = await uploadRagDocument({ file, name, documentCode });
      setOpen(false);
      reset();
      return uploaded;
    } catch (error: unknown) {
      syncSessionOnForbidden(error);
      setErrorMessage(toRagUploadErrorMessage(error));
      return null;
    } finally {
      busyRef.current = false;
      setUploading(false);
    }
  }, [file, name, documentCode, reset]);

  return {
    open,
    file,
    name,
    documentCode,
    fileErrorMessage,
    errorMessage,
    uploading,
    openDialog,
    closeDialog,
    selectFile,
    clearFile,
    setName,
    setDocumentCode,
    submit,
  };
}
