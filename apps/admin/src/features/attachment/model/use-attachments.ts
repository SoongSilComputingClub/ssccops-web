"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ATTACHMENT_MAX_BYTES,
  deleteAttachment,
  fetchAttachmentDownloadUrl,
  fetchAttachments,
  issueAttachmentTicket,
  putAttachment,
  type Attachment,
} from "@/entities/attachment";
import { syncSessionOnForbidden } from "@/entities/session";
import { toAttachmentErrorMessage } from "./attachment-error";

/*
 * 운영 건 첨부 목록 + 올리기·내려받기·지우기 (#546). 콘텐츠 갤러리 훅과 같은 골격 — 목록은 부분
 * 갱신하고(올리기·지우기마다 상세를 다시 부르지 않는다), 진행 중 중복 클릭은 ref로 막는다.
 *
 * ── 왜 크기를 먼저 보나 ─────────────────────────────────
 * 25MB를 넘는 파일은 발급 요청 자체를 보내지 않는다 — 최종 판정은 서버 413이지만 왕복 없이 안내한다.
 * 형식은 보지 않는다 — 허용 목록은 서버 한 곳이고 응답 코드로 안내한다(이미지와 같은 규칙).
 *
 * ── 내려받기 ─────────────────────────────────────────
 * 서명 URL을 받아 `window.location.assign` — 서명에 `attachment; filename*=…`이 들어 있어 화면이
 * 벗어나지 않고 저장 대화상자만 뜬다.
 */

export type AttachmentListStatus = "loading" | "ready" | "error";

export function useAttachments(operationId: number) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [status, setStatus] = useState<AttachmentListStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const inFlight = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAttachments(operationId)
      .then((rows) => {
        if (!cancelled) {
          setItems(rows);
          setStatus("ready");
          setErrorMessage("");
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(toAttachmentErrorMessage(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [operationId, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  const run = useCallback(async (action: () => Promise<void>): Promise<string | null> => {
    if (inFlight.current) return null;
    inFlight.current = true;
    setBusy(true);
    setLastError(null);
    try {
      await action();
      return null;
    } catch (error: unknown) {
      syncSessionOnForbidden(error);
      const message = toAttachmentErrorMessage(error);
      if (alive.current) setLastError(message);
      return message;
    } finally {
      inFlight.current = false;
      if (alive.current) setBusy(false);
    }
  }, []);

  const upload = useCallback(
    (file: File) =>
      run(async () => {
        if (file.size > ATTACHMENT_MAX_BYTES) {
          throw Object.assign(new Error("too large"), { code: "ATTACHMENT_TOO_LARGE" });
        }
        const ticket = await issueAttachmentTicket(operationId, {
          fileName: file.name,
          fileSize: file.size,
        });
        try {
          await putAttachment(ticket.uploadUrl, file, ticket.contentType);
        } catch (error: unknown) {
          // 발급이 곧 참조 행이라 PUT이 실패하면 빈 행이 남는다 — 바로 치운다(갤러리와 같은 규칙)
          await deleteAttachment(operationId, ticket.fileId).catch(() => {});
          throw error;
        }
        // 목록은 서버 값으로 — 올린 사람·시각은 서버가 채운 것을 읽는다
        setItems(await fetchAttachments(operationId));
      }),
    [operationId, run],
  );

  const remove = useCallback(
    (fileId: number) =>
      run(async () => {
        await deleteAttachment(operationId, fileId);
        setItems((prev) => prev.filter((a) => a.fileId !== fileId));
      }),
    [operationId, run],
  );

  const download = useCallback(
    (fileId: number) =>
      run(async () => {
        const url = await fetchAttachmentDownloadUrl(operationId, fileId);
        window.location.assign(url);
      }),
    [operationId, run],
  );

  return { items, status, errorMessage, reload, busy, lastError, upload, remove, download };
}
