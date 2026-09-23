"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NotificationItem } from "./notification";
import type { NotificationApi } from "./notification-api";
import type { PushApp } from "./service-worker";
import { decrementUnreadCount, setUnreadCount } from "./unread-store";
import type { NotificationScope } from "./ui/notification-list";

/*
 * `/notifications` 화면의 상태 — 목록·«더 보기»·읽음 처리·이동 (#665 · admin #604 · lms #606 · www #616).
 *
 * 세 앱이 같은 훅을 184·185·170줄로 각자 갖고 있었다. 커서 페이징·범위 칩·배지 규칙은 서버 계약
 * (ADR-0047)이 정하는 하나고 갈리는 것은 넷뿐이라(아래 «주입») 몸통을 여기 한 벌만 둔다.
 *
 * 커서 페이징이라 페이지 번호가 없고 «더 보기»로 잇는다. 목록 응답의 `unreadCount`를 종 배지 스토어에
 * 넣어 화면을 열면 배지가 맞춰진다. 한 건을 읽으면 그 행만 갈아 끼우고(부분 갱신) 배지에서 하나 뺀다 —
 * 목록을 다시 부르면 «더 보기»로 이어 받은 것이 처음으로 돌아간다.
 *
 * 읽음 처리가 실패해도 이동은 한다 — 사람이 누른 것은 «그 건으로 가기»이고 읽음 표시는 그 부수다.
 *
 * ── 범위 (#643 · ADR-0047) ─────────────────────────────────
 * 기본은 «이 앱»(`app=<이 앱>`)이고 칩으로 «전체»(파라미터 없음)로 넓힌다. 값은 이 훅의 상태라 주소에도
 * localStorage에도 남지 않는다 — 다시 들어오면 «이 앱»이다. 바꾸면 목록을 처음부터 다시 부른다(커서가
 * 앞 범위의 것이라 이어 받을 수 없다).
 *
 * **종 배지는 언제나 «이 앱» 수다.** «전체» 응답의 `unreadCount`는 남의 앱 것까지 세므로 스토어에 넣지
 * 않고, 그 범위에서 한 건을 읽으면 하나 빼는 대신 `app=<이 앱>`으로 다시 묻는다 — 읽은 행이 이 앱에도
 * 오는 알림인지(기준표가 정한다) 행만 보고는 알 수 없다.
 *
 * ── 주입 ───────────────────────────────────────────────────
 * 앱마다 갈리는 것은 넷이다. **넘기는 함수는 렌더마다 같은 것이어야 한다**(모듈 함수 · zustand 셀렉터 ·
 * `useCallback`) — 효과와 콜백의 의존성에 그대로 들어간다.
 * - `api`·`app`  그 앱의 `apiFetch`로 만든 호출 한 벌과 `CURRENT_APP`
 * - `resolveTarget`·`push`  행을 눌렀을 때 갈 곳(앱마다 오리진 표가 다르다)과 라우터 이동
 * - `classifyStatus`  401·403을 화면 상태로 올릴지 — www·lms만 쓴다(admin의 `apiFetch`는 리다이렉트로
 *   끝내 그 상태가 화면에 오지 않는다). 안 넘기면 상태는 `loading`·`ready`·`error` 셋이다
 * - `setUnread`·`decrementUnread`·`onActionError`  배지 스토어와 «모두 읽음» 실패의 자리. 기본은 이
 *   패키지의 모듈 스토어와 `actionError` 한 줄이고, admin이 자기 zustand 스토어와 토스트를 꽂는다
 */
const PAGE_SIZE = 20;

/** 행을 눌렀을 때 갈 곳 — 자기 앱이면 라우터 이동, 남의 앱이면 그 오리진, 없으면 머문다 */
export type NotificationTarget =
  | { kind: "internal"; href: string }
  | { kind: "external"; href: string }
  | { kind: "none" };

/** 목록을 그릴 수 없는 이유 — www·lms의 `classifyStatus`가 올린다 */
export type NotificationGateStatus = "unauthenticated" | "signup-required";

/**
 * 목록 상태 — 기본 셋 + 앱이 더하는 게이트.
 *
 * `G`를 안 주면(admin) 셋뿐이라 `NotificationList`(`@ssccops/pwa/ui`)에 그대로 넘어간다.
 */
export type NotificationStatus<G extends string = never> = "loading" | "ready" | "error" | G;

export interface UseNotificationListOptions<G extends string = never> {
  /** `createNotificationApi(앱의 apiFetch)` */
  api: NotificationApi;
  /** 이 앱 — 목록·배지의 기본 필터이자 `NotificationList`의 `currentApp` (#643) */
  app: PushApp;
  /** 알림 행 → 갈 곳. 서비스워커의 `notificationclick`과 같은 규칙이어야 한다 */
  resolveTarget: (item: NotificationItem) => NotificationTarget;
  /** 자기 앱 행의 이동 — `router.push` */
  push: (href: string) => void;
  /** `ApiError` → 화면 한 줄 */
  toErrorMessage: (error: unknown) => string;
  /** 첫 조회의 401·403을 화면 상태로 — 안 넘기면 다른 실패와 같이 `error` */
  classifyStatus?: (error: unknown) => G | null;
  /** 기본은 이 패키지의 모듈 스토어 */
  setUnread?: (count: number) => void;
  /** 기본은 이 패키지의 모듈 스토어 */
  decrementUnread?: () => void;
  /** 기본은 `actionError` 한 줄 — 토스트가 있는 앱은 그것을 넘긴다 */
  onActionError?: (message: string) => void;
}

export interface NotificationListState<G extends string = never> {
  items: NotificationItem[];
  status: NotificationStatus<G>;
  errorMessage: string;
  /** «모두 읽음» 실패 — `onActionError`를 넘긴 앱에서는 언제나 빈 문자열이다 */
  actionError: string;
  hasNext: boolean;
  loadingMore: boolean;
  loadMore: () => Promise<void>;
  open: (item: NotificationItem) => Promise<void>;
  readAll: () => Promise<void>;
  readingAll: boolean;
  scope: NotificationScope;
  changeScope: (next: NotificationScope) => void;
  currentApp: PushApp;
}

export function useNotificationList<G extends string = never>({
  api,
  app,
  resolveTarget,
  push,
  toErrorMessage,
  classifyStatus,
  setUnread = setUnreadCount,
  decrementUnread = decrementUnreadCount,
  onActionError,
}: UseNotificationListOptions<G>): NotificationListState<G> {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [status, setStatus] = useState<NotificationStatus<G>>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [readingAll, setReadingAll] = useState(false);
  const [scope, setScope] = useState<NotificationScope>("app");
  const inFlight = useRef(false);

  const appParam = scope === "app" ? app : null;
  const reportActionError = onActionError ?? setActionError;

  useEffect(() => {
    let cancelled = false;
    api
      .list({ size: PAGE_SIZE, app: appParam })
      .then((page) => {
        if (cancelled) return;
        setItems(page.items ?? []);
        setNextCursor(page.nextCursor ?? null);
        if (appParam) setUnread(page.unreadCount ?? 0);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const gate = classifyStatus?.(error) ?? null;
        if (gate) {
          setStatus(gate);
          return;
        }
        setErrorMessage(toErrorMessage(error));
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [api, appParam, classifyStatus, setUnread, toErrorMessage]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || inFlight.current) return;
    inFlight.current = true;
    setLoadingMore(true);
    try {
      const page = await api.list({ cursor: nextCursor, size: PAGE_SIZE, app: appParam });
      setItems((prev) => [...prev, ...(page.items ?? [])]);
      setNextCursor(page.nextCursor ?? null);
    } catch {
      // 첫 페이지는 이미 있다 — «더 보기»가 안 된 것은 버튼이 그대로 남아 다시 누를 수 있다
    } finally {
      inFlight.current = false;
      setLoadingMore(false);
    }
  }, [api, appParam, nextCursor]);

  const open = useCallback(
    async (item: NotificationItem) => {
      if (item.readAt === null) {
        try {
          const res = await api.read(item.notificationId);
          setItems((prev) =>
            prev.map((row) =>
              row.notificationId === item.notificationId ? { ...row, readAt: res.readAt } : row,
            ),
          );
          if (appParam) decrementUnread();
          else {
            // «전체»에서 읽은 행이 이 앱에도 오는 알림인지는 기준표가 안다 — 배지를 다시 묻는다
            api
              .unreadCount({ app })
              .then((count) => setUnread(count.unreadCount))
              .catch(() => undefined);
          }
        } catch {
          // 읽음 표시는 부수다 — 이동은 한다
        }
      }
      const target = resolveTarget(item);
      if (target.kind === "internal") push(target.href);
      else if (target.kind === "external") window.location.assign(target.href);
    },
    [api, app, appParam, decrementUnread, push, resolveTarget, setUnread],
  );

  const readAll = useCallback(async () => {
    if (readingAll) return;
    setReadingAll(true);
    setActionError("");
    try {
      await api.readAll();
      const now = new Date().toISOString();
      setItems((prev) => prev.map((row) => (row.readAt === null ? { ...row, readAt: now } : row)));
      setUnread(0);
    } catch (error: unknown) {
      // 목록은 그대로 있다 — 실패는 목록 위 한 줄(또는 앱이 넘긴 토스트)
      reportActionError(toErrorMessage(error));
    } finally {
      setReadingAll(false);
    }
  }, [api, readingAll, reportActionError, setUnread, toErrorMessage]);

  /*
   * 범위 칩 — 목록을 비우는 것은 **여기**이고 효과가 아니다(`react-hooks/set-state-in-effect`). 효과가
   * 다시 도는 것은 `scope`가 바뀐 결과일 뿐이고, 그 사이 화면이 앞 범위의 행을 들고 있으면 안 된다.
   */
  const changeScope = useCallback(
    (next: NotificationScope) => {
      if (next === scope) return;
      setScope(next);
      setStatus("loading");
      setItems([]);
      setNextCursor(null);
      setErrorMessage("");
    },
    [scope],
  );

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
    scope,
    changeScope,
    currentApp: app,
  };
}
