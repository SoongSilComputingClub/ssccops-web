"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { decrementUnreadCount, setUnreadCount } from "@ssccops/pwa";
import { notificationApi, type NotificationItem } from "@/entities/notification";
import { isSignupRequired, isUnauthenticated } from "@/shared/api/auth-error";
import { notificationTarget } from "./notification-href";
import { toNotificationErrorMessage } from "./notification-error";

/*
 * `/notifications` — 목록·«더 보기»·읽음 처리·이동 (#606 · ssccops#448 · 어드민 #604의 훅과 같은 모양).
 *
 * 커서 페이징이라 페이지 번호가 없고 «더 보기»로 잇는다. 목록 응답의 `unreadCount`를 종 배지 스토어
 * (`@ssccops/pwa` `setUnreadCount`)에 넣어 화면을 열면 배지가 맞춰진다. 한 건을 읽으면 그 행만 갈아
 * 끼우고(부분 갱신) 배지에서 하나 뺀다 — 목록을 다시 부르면 «더 보기»로 이어 받은 것이 처음으로 돌아간다.
 *
 * 읽음 처리가 실패해도 이동은 한다 — 사람이 누른 것은 «그 건으로 가기»이고 읽음 표시는 그 부수다.
 *
 * ── 어드민과 갈리는 것 ─────────────────────────────────────
 * 이 앱의 `apiFetch`는 401·403을 리다이렉트하지 않고 오류로 올린다 — 그래서 상태에 `unauthenticated`·
 * `signup-required`가 따로 있고 화면이 로그인 게이트·가입 안내를 그린다. «모두 읽음» 실패는 전역
 * 토스트가 없어(`features/share` 주석) `actionError` 한 줄로 목록 위에 보인다.
 */
const PAGE_SIZE = 20;

export type NotificationListStatus =
  | "loading"
  | "ready"
  | "error"
  | "unauthenticated"
  | "signup-required";

export function useNotifications() {
  const router = useRouter();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [status, setStatus] = useState<NotificationListStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [readingAll, setReadingAll] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    notificationApi
      .list({ size: PAGE_SIZE })
      .then((page) => {
        if (cancelled) return;
        setItems(page.items ?? []);
        setNextCursor(page.nextCursor ?? null);
        setUnreadCount(page.unreadCount ?? 0);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (isUnauthenticated(error)) {
          setStatus("unauthenticated");
          return;
        }
        if (isSignupRequired(error)) {
          setStatus("signup-required");
          return;
        }
        setErrorMessage(toNotificationErrorMessage(error));
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextCursor || inFlight.current) return;
    inFlight.current = true;
    setLoadingMore(true);
    try {
      const page = await notificationApi.list({ cursor: nextCursor, size: PAGE_SIZE });
      setItems((prev) => [...prev, ...(page.items ?? [])]);
      setNextCursor(page.nextCursor ?? null);
    } catch {
      // 첫 페이지는 이미 있다 — «더 보기»가 안 된 것은 버튼이 그대로 남아 다시 누를 수 있다
    } finally {
      inFlight.current = false;
      setLoadingMore(false);
    }
  }, [nextCursor]);

  const open = useCallback(
    async (item: NotificationItem) => {
      if (item.readAt === null) {
        try {
          const res = await notificationApi.read(item.notificationId);
          setItems((prev) =>
            prev.map((row) =>
              row.notificationId === item.notificationId ? { ...row, readAt: res.readAt } : row,
            ),
          );
          decrementUnreadCount();
        } catch {
          // 읽음 표시는 부수다 — 이동은 한다
        }
      }
      const target = notificationTarget(item);
      if (target.kind === "internal") router.push(target.href);
      else if (target.kind === "external") window.location.assign(target.href);
    },
    [router],
  );

  const readAll = useCallback(async () => {
    if (readingAll) return;
    setReadingAll(true);
    setActionError("");
    try {
      await notificationApi.readAll();
      const now = new Date().toISOString();
      setItems((prev) => prev.map((row) => (row.readAt === null ? { ...row, readAt: now } : row)));
      setUnreadCount(0);
    } catch (error: unknown) {
      // 목록은 그대로 있다 — 실패는 목록 위 한 줄
      setActionError(toNotificationErrorMessage(error));
    } finally {
      setReadingAll(false);
    }
  }, [readingAll]);

  return {
    items,
    status,
    errorMessage,
    actionError,
    hasNext: nextCursor !== null,
    loadingMore,
    loadMore,
    open,
    readAll,
    readingAll,
  };
}
