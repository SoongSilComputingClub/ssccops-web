"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProgramEventPost, ProgramEventPostSaveInput } from "@/entities/academic-program";
import {
  fileExtOf,
  issueEventPostImageTicket,
  putEventPostImage,
  updateProgramEventPost,
} from "@/entities/academic-program/api/event-post-write";
import { toEventPostImageErrorMessage, toEventPostSaveErrorMessage } from "./event-post-error";

/*
 * 소개 글 저장 · 이미지 올리기 훅 (#819 · ADR-0069).
 *
 * ── 저장은 버튼 하나 ─────────────────────────────────────────
 * 자동 저장이 없다 — 지원서 문항 편집(`use-save-recruitment-form.ts`)과 같은 이유다. 접수가 끝나면
 * 창이 닫히는 화면이라, 타이핑 도중 잠기면 어디까지 저장됐는지 모른다. 성공하면 서버 응답(네 칸 +
 * `isEditable`)으로 갈아 끼우고 재조회하지 않는다.
 *
 * ── 이미지 올리기는 어드민 `use-event-image-upload.ts`의 사본이다 ──
 * 발급 → R2 PUT을 한 동작으로 묶고 실패해도 던지지 않고 문구로 돌려준다. 앱끼리 소스를 공유하지
 * 않으므로(FSD · ADR-0052와 같은 판단) 경로만 학술 쪽으로 바꿔 옮겼다. 어드민에서 고친 것이
 * 있으면 여기도 본다.
 *
 * 두 동작 모두 `inFlightRef`로 연타를 막는다 — 저장은 나중 요청이 먼저 도착할 수 있고, 업로드는
 * 멱등하지 않아 연타가 곧 버킷의 쓰이지 않는 파일이다.
 */

export type EventPostSaveOutcome =
  | { result: "saved"; post: ProgramEventPost }
  | { result: "failed"; message: string };

export interface EventPostImageUpload {
  /** 성공했을 때 본문·썸네일에 넣을 영구 주소. 실패·중복 클릭이면 null */
  imageUrl: string | null;
  /** 실패 한 줄. 성공·중복 클릭이면 빈 문자열 */
  message: string;
}

export function useEventPostActions(academicProgramId: number) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [uploading, setUploading] = useState(false);
  const saveInFlight = useRef(false);
  const uploadInFlight = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const save = useCallback(
    async (input: ProgramEventPostSaveInput): Promise<EventPostSaveOutcome> => {
      if (saveInFlight.current) return { result: "failed", message: "" };
      saveInFlight.current = true;
      setSaving(true);
      setSaveError("");
      try {
        const post = await updateProgramEventPost(academicProgramId, input);
        return { result: "saved", post };
      } catch (error: unknown) {
        const message = toEventPostSaveErrorMessage(error);
        setSaveError(message);
        return { result: "failed", message };
      } finally {
        saveInFlight.current = false;
        if (aliveRef.current) setSaving(false);
      }
    },
    [academicProgramId],
  );

  const upload = useCallback(
    async (file: File): Promise<EventPostImageUpload> => {
      if (uploadInFlight.current) return { imageUrl: null, message: "" };
      uploadInFlight.current = true;
      setUploading(true);
      try {
        // 형식·용량은 서버가 판정한다 — 보내는 것은 확장자와 크기, PUT 헤더는 발급 응답 값 그대로
        const ticket = await issueEventPostImageTicket(academicProgramId, {
          fileExt: fileExtOf(file),
          fileSize: file.size,
        });
        await putEventPostImage(ticket.uploadUrl, file, ticket.contentType);
        return { imageUrl: ticket.imageUrl, message: "" };
      } catch (error: unknown) {
        return { imageUrl: null, message: toEventPostImageErrorMessage(error) };
      } finally {
        uploadInFlight.current = false;
        if (aliveRef.current) setUploading(false);
      }
    },
    [academicProgramId],
  );

  return { saving, saveError, save, uploading, upload };
}
