"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createContentPage,
  createContentPost,
  createContentPostFromEvent,
  deleteContentImage,
  fetchContentPageHistory,
  fetchContentPostHistory,
  issueContentImageTicket,
  publishContentPage,
  publishContentPost,
  putContentImage,
  updateContentPage,
  updateContentPost,
  type ContentPage,
  type ContentPageHistory,
  type ContentPageSaveInput,
  type ContentPost,
  type ContentPostHistory,
  type ContentPostSaveInput,
} from "@/entities/content";
import { syncSessionOnForbidden } from "@/entities/session";
import { ApiError } from "@/shared/lib/api/client";
import { resizeImageForUpload } from "@/shared/lib/resize-image";
import {
  toContentErrorMessage,
  toContentImageErrorMessage,
  toContentPublishErrorMessage,
  toContentSaveErrorMessage,
  toPostFromEventErrorMessage,
} from "./content-error";

/*
 * 콘텐츠 조작 훅 (#521). 구조는 features/event의 저장·전이 훅과 같다 — 토스트를 여기서 띄우지
 * 않고 결과 문구를 돌려주며, 이동·재조회는 뷰가 정한다. 진행 중 잠금(inFlightRef)은 연타를 막는다
 * (생성·업로드는 멱등하지 않다). 한 파일에 둔 것은 여섯 훅이 같은 «한 번에 하나» 골격을 나눠
 * 쓰기 때문이다 — `useAction`이 그 골격이다.
 */

export interface ActionResult<T> {
  /** 성공했을 때의 값. 실패·중복 클릭이면 null */
  value: T | null;
  /** 사용자에게 보여줄 한 줄. 중복 클릭으로 아무것도 보내지 않았으면 빈 문자열 */
  message: string;
  /** 실패했을 때 잡은 오류 — 상태 코드로 «낡은 화면»을 가르는 자리(게시 전이)만 본다 */
  error: unknown;
}

function useAction() {
  const [pending, setPending] = useState(false);
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const run = useCallback(
    async <T,>(
      action: () => Promise<T>,
      successMessage: string,
      toMessage: (error: unknown) => string,
    ): Promise<ActionResult<T>> => {
      if (inFlightRef.current) return { value: null, message: "", error: null };
      inFlightRef.current = true;
      setPending(true);
      try {
        const value = await action();
        return { value, message: successMessage, error: null };
      } catch (error: unknown) {
        // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
        syncSessionOnForbidden(error);
        return { value: null, message: toMessage(error), error };
      } finally {
        inFlightRef.current = false;
        if (aliveRef.current) setPending(false);
      }
    },
    [],
  );

  return { pending, run };
}

/* ── 저장 ──────────────────────────────────────────────────── */

const CREATED = "초안으로 저장했습니다 — 게시해야 공개 화면에 보입니다";
const SAVED = "저장했습니다";

export function useSaveContentPage() {
  const { pending, run } = useAction();
  const create = useCallback(
    (input: ContentPageSaveInput) =>
      run(() => createContentPage(input), CREATED, toContentSaveErrorMessage),
    [run],
  );
  const update = useCallback(
    (pageId: number, input: ContentPageSaveInput) =>
      run(() => updateContentPage(pageId, input), SAVED, toContentSaveErrorMessage),
    [run],
  );
  return { pending, create, update };
}

export function useSaveContentPost() {
  const { pending, run } = useAction();
  const create = useCallback(
    (input: ContentPostSaveInput) =>
      run(() => createContentPost(input), CREATED, toContentSaveErrorMessage),
    [run],
  );
  const update = useCallback(
    (postId: number, input: ContentPostSaveInput) =>
      run(() => updateContentPost(postId, input), SAVED, toContentSaveErrorMessage),
    [run],
  );
  return { pending, create, update };
}

/* ── 게시 전이 ─────────────────────────────────────────────── */

/** 게시·게시 취소 결과 — `stale`은 같은 상태로의 재전이(409)라 화면이 다시 부른다 */
export type PublishOutcome = "changed" | "stale" | "failed";

const PUBLISHED = "게시했습니다";
const UNPUBLISHED = "게시를 취소했습니다";

function publishOutcome(error: unknown): PublishOutcome {
  return error instanceof ApiError && error.status === 409 ? "stale" : "failed";
}

export function useContentPublish() {
  const { pending, run } = useAction();

  const transition = useCallback(
    async <T extends ContentPage | ContentPost>(
      action: () => Promise<T>,
      publish: boolean,
    ): Promise<{ outcome: PublishOutcome; value: T | null; message: string }> => {
      const { value, message, error } = await run(
        action,
        publish ? PUBLISHED : UNPUBLISHED,
        toContentPublishErrorMessage,
      );
      if (value) return { outcome: "changed", value, message };
      if (!message) return { outcome: "failed", value: null, message: "" };
      return { outcome: publishOutcome(error), value: null, message };
    },
    [run],
  );

  const page = useCallback(
    (pageId: number, publish: boolean) =>
      transition(() => publishContentPage(pageId, publish), publish),
    [transition],
  );
  const post = useCallback(
    (postId: number, publish: boolean) =>
      transition(() => publishContentPost(postId, publish), publish),
    [transition],
  );

  return { pending, page, post };
}

/* ── 이력 ──────────────────────────────────────────────────── */

export type HistoryStatus = "idle" | "loading" | "ready" | "error";

/**
 * 스냅샷 이력 — **이력 탭을 열 때만** 부른다(`load`). 편집 화면의 첫 조회에 얹지 않는 것은 이력이
 * 본문 전체 스냅샷 n건이라 편집만 하러 온 사람에게 매번 무거운 응답을 받게 할 이유가 없어서다.
 */
export function useContentHistory<T extends ContentPageHistory | ContentPostHistory>(
  fetchHistory: (id: number) => Promise<T[]>,
) {
  const [status, setStatus] = useState<HistoryStatus>("idle");
  const [items, setItems] = useState<T[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const load = useCallback(
    async (id: number) => {
      setStatus("loading");
      try {
        const next = await fetchHistory(id);
        if (!aliveRef.current) return;
        setItems(next);
        setErrorMessage("");
        setStatus("ready");
      } catch (error: unknown) {
        if (!aliveRef.current) return;
        setErrorMessage(toContentErrorMessage(error));
        setStatus("error");
      }
    },
    [fetchHistory],
  );

  return { status, items, errorMessage, load };
}

export function useContentPageHistory() {
  return useContentHistory<ContentPageHistory>(fetchContentPageHistory);
}

export function useContentPostHistory() {
  return useContentHistory<ContentPostHistory>(fetchContentPostHistory);
}

/* ── 갤러리 ────────────────────────────────────────────────── */

export interface GalleryUpload {
  /** 성공했을 때 갤러리에 새로 생긴 장. 실패·중복 클릭이면 null */
  fileId: number | null;
  imageUrl: string | null;
  message: string;
}

/**
 * 갤러리 올리기 — 축소(1600px·webp) → 발급 → R2 PUT.
 *
 * 발급받는 순간 서버가 갤러리에 한 장을 만든다(`fileId`). PUT이 실패하면 **그 장을 곧바로 지운다** —
 * 안 지우면 바이트 없는 장이 갤러리에 남아 공개 화면에 깨진 그림으로 나온다. 삭제까지 실패하면
 * 사용자에게는 업로드 실패 한 줄만 보이고, 남은 장은 갤러리에서 손으로 지운다.
 */
export function useContentImageUpload() {
  const { pending, run } = useAction();

  const upload = useCallback(
    async (postId: number, file: File): Promise<GalleryUpload> => {
      const result = await run(
        async () => {
          const { blob, fileExt } = await resizeImageForUpload(file);
          const ticket = await issueContentImageTicket(postId, { fileExt, fileSize: blob.size });
          try {
            await putContentImage(ticket.uploadUrl, blob, ticket.contentType);
          } catch (error: unknown) {
            await deleteContentImage(postId, ticket.fileId).catch(() => {
              /* 치우기 실패는 원래 오류를 덮지 않는다 */
            });
            throw error;
          }
          return { fileId: ticket.fileId, imageUrl: ticket.imageUrl };
        },
        "이미지를 올렸습니다",
        toContentImageErrorMessage,
      );
      return {
        fileId: result.value?.fileId ?? null,
        imageUrl: result.value?.imageUrl ?? null,
        message: result.message,
      };
    },
    [run],
  );

  return { pending, upload };
}

export function useContentImageDelete() {
  const { pending, run } = useAction();
  const remove = useCallback(
    (postId: number, fileId: number) =>
      run(() => deleteContentImage(postId, fileId), "이미지를 지웠습니다", toContentImageErrorMessage),
    [run],
  );
  return { pending, remove };
}

/* ── 행사에서 만들기 ───────────────────────────────────────── */

export function usePostFromEvent() {
  const { pending, run } = useAction();
  const create = useCallback(
    (eventId: number) =>
      run(
        () => createContentPostFromEvent(eventId),
        "행사 내용으로 포스트 초안을 만들었습니다",
        toPostFromEventErrorMessage,
      ),
    [run],
  );
  return { pending, create };
}
