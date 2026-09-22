"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearNotificationTypeApps,
  fetchNotificationTypeRoutes,
  NOTIFICATION_APPS,
  NOTIFICATION_TYPE_ERROR,
  replaceNotificationTypeApps,
  type NotificationApp,
  type NotificationTypeRoute,
} from "@/entities/notification-type";
import { syncSessionOnForbidden } from "@/entities/session";
import { ApiError } from "@/shared/lib/api/client";
import {
  toNotificationTypeClearErrorMessage,
  toNotificationTypeErrorMessage,
  toNotificationTypeSaveErrorMessage,
} from "./notification-type-error";

/*
 * 알림 유형 화면(/settings/notification-types)의 목록·수신 앱 편집 (서버 #535 · ADR-0047).
 *
 * 구조는 features/sub-work-type의 useSubWorkTypes와 같다 — 기준 데이터 표 하나를 쥐는 훅이라
 * 페칭 방식·로딩 계산·중복 클릭 잠금의 근거도 그대로다:
 *
 * - **로딩을 setState 하지 않는다.** 조회 결과에 그 결과를 만든 요청의 key를 함께 담아 두고,
 *   지금 필요한 key와 같을 때만 결과로 인정한다 (react-hooks/set-state-in-effect).
 * - 중복 제출 잠금은 상태가 아니라 ref로 건다 — 같은 틱에 두 번 눌린 클릭은 그 사이에 렌더가
 *   없어 상태 값이 아직 갱신되지 않는다. 화면 표시는 상태로, 실제 차단은 ref로.
 *
 * ── 갈리는 지점: 저장 뒤에 목록을 다시 받지 않는다 ─────────────
 * 하위 업무 유형은 저장 뒤 목록을 통째로 다시 받는다(정렬을 서버가 정하고, 서버가 값을 정리해서
 * 내려준다). 여기는 아니다 — 유형 목록은 코드가 아는 닫힌 집합이고 줄의 자리가 유형 코드로
 * 고정이라, 저장이 바꾸는 것은 그 한 줄의 `apps`·`followsSendingApp`뿐이고 서버가 응답으로 그
 * 줄을 통째로 돌려준다. 열두 줄을 다시 받으면 **다른 줄에 고쳐 둔 체크가 사라진다** — 이 화면은
 * 줄마다 저장하므로 저장하지 않은 줄이 남아 있는 것이 정상이다.
 *
 * ── 고친 값은 어디에 있나 ──────────────────────────────────────
 * 저장된 값(`loaded.routes`)과 고친 값(`drafts`)을 따로 쥔다. 한 배열에 섞어 두면 «무엇이
 * 저장되지 않았나»를 판정할 기준이 사라진다 — 그 판정이 이 화면의 «저장하지 않음» 표시이고
 * 저장 버튼의 잠금 조건이다.
 */

export type NotificationTypeRoutesStatus = "loading" | "ready" | "error";

/** 조회 결과 + 그 결과를 만든 요청의 식별자 */
interface LoadedRoutes {
  key: number;
  routes: NotificationTypeRoute[];
  /** 빈 문자열이면 성공 */
  errorMessage: string;
}

/** 화면이 그리는 한 줄 — 저장된 값 위에 고친 값을 얹은 것 */
export interface NotificationTypeRouteRow {
  type: string;
  label: string;
  /** 지금 체크된 앱. 고치지 않았으면 저장된 값과 같다 */
  apps: NotificationApp[];
  /** 저장된 값과 다른가 — «저장하지 않음» 표시와 저장 버튼의 조건 */
  dirty: boolean;
  /**
   * 기준표에 행이 없는 유형 (ADR-0047). **고치는 중에는 false로 내린다** — 체크를 켠 순간
   * 화면이 말하는 것은 «지금 보낸 앱을 따른다»가 아니라 «저장하면 이렇게 된다»여서다.
   */
  followsSendingApp: boolean;
  /**
   * 기준표에 행이 있는 유형 — «보낸 앱 따름으로» 되돌릴 것이 있다는 뜻이다 (#647 · 서버 #537).
   *
   * **`followsSendingApp`의 반대가 아니다.** 이쪽은 고친 값을 보지 않고 **저장된 값만** 따른다 —
   * 되돌리기가 지우는 것은 서버에 있는 행이라, 아직 저장하지 않은 체크로 그 버튼이 나타나거나
   * 사라지면 누른 결과가 화면과 어긋난다(고친 값을 버리는 조작은 «되돌리기»가 따로 있다).
   */
  registered: boolean;
  saving: boolean;
}

export interface NotificationTypeRoutesAdmin {
  rows: NotificationTypeRouteRow[];
  status: NotificationTypeRoutesStatus;
  /** status === "error"일 때만 채워진다 */
  errorMessage: string;
  reload: () => void;

  /** 체크박스 하나를 뒤집는다 — 저장은 따로 누른다 */
  toggleApp: (type: string, app: NotificationApp) => void;
  /** 그 줄의 고친 값을 버린다 */
  reset: (type: string) => void;
  /** 저장. **빈 문자열이 성공**이고 그 밖은 화면에 띄울 오류 한 줄이다 */
  save: (type: string) => Promise<string>;
  /**
   * 그 유형을 기준표에서 빼 «보낸 앱 따름»으로 되돌린다 (#647 · DELETE).
   *
   * 저장과 같이 **빈 문자열이 성공**이다. 되돌리면 그 줄의 고친 값도 함께 버린다 — 지워진
   * 행 위에 남은 체크는 어디에도 저장되지 않은 값이라 «저장하지 않음»으로 붙잡아 둘 이유가 없다.
   */
  clear: (type: string) => Promise<string>;
}

/** 두 앱 목록이 같은가 — 둘 다 NOTIFICATION_APPS 순으로 세워져 있어 자리끼리 견준다 */
function sameApps(a: readonly NotificationApp[], b: readonly NotificationApp[]): boolean {
  return a.length === b.length && a.every((app, i) => app === b[i]);
}

export function useNotificationTypeRoutes(): NotificationTypeRoutesAdmin {
  const [loaded, setLoaded] = useState<LoadedRoutes | null>(null);
  const [requestKey, setRequestKey] = useState(0);
  const [drafts, setDrafts] = useState<Readonly<Record<string, NotificationApp[]>>>({});
  const [savingTypes, setSavingTypes] = useState<readonly string[]>([]);

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    fetchNotificationTypeRoutes()
      .then((routes) => {
        if (alive) setLoaded({ key: requestKey, routes, errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (alive) {
          setLoaded({
            key: requestKey,
            routes: [],
            errorMessage: toNotificationTypeErrorMessage(error),
          });
        }
      });

    return () => {
      alive = false;
    };
  }, [requestKey]);

  const current = loaded?.key === requestKey ? loaded : null;
  const status: NotificationTypeRoutesStatus =
    current === null ? "loading" : current.errorMessage ? "error" : "ready";

  const rows: NotificationTypeRouteRow[] = (current?.routes ?? []).map((route) => {
    const draft = drafts[route.type];
    const dirty = draft !== undefined && !sameApps(draft, route.apps);
    return {
      type: route.type,
      label: route.label,
      apps: draft ?? route.apps,
      dirty,
      followsSendingApp: route.followsSendingApp && !dirty,
      registered: !route.followsSendingApp,
      saving: savingTypes.includes(route.type),
    };
  });

  /* 변이 함수가 **실행되는 시점**에 읽을 최신값 — 콜백은 의존성 없이 한 번만 만든다 */
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  });

  const busyRef = useRef(new Set<string>());

  const reload = useCallback(() => {
    // 다시 불러오면 고쳐 둔 값의 기준이 사라진다 — 저장되지 않은 체크는 함께 버린다
    setDrafts({});
    setRequestKey((k) => k + 1);
  }, []);

  const toggleApp = useCallback((type: string, app: NotificationApp) => {
    const row = rowsRef.current.find((r) => r.type === type);
    if (!row) return;
    const on = !row.apps.includes(app);
    /*
     * 켠 것을 배열 끝에 붙이지 않고 NOTIFICATION_APPS 순으로 다시 세운다 — 순서가 어긋나면
     * 껐다 다시 켠 줄이 «저장하지 않음»으로 남는다(판정이 자리끼리 견주기라서).
     */
    const next = NOTIFICATION_APPS.filter((candidate) =>
      candidate === app ? on : row.apps.includes(candidate),
    );
    setDrafts((prev) => ({ ...prev, [type]: next }));
  }, []);

  const reset = useCallback((type: string) => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[type];
      return next;
    });
  }, []);

  /*
   * 줄 하나를 바꾸는 요청의 공통 절차 — 중복 클릭 잠금, 그 줄을 «저장 중»으로, 응답 한 줄을
   * 목록에 얹기, 403이면 세션 맞추기, 404면 목록 다시 받기.
   *
   * 저장(PUT)과 되돌리기(DELETE)가 **갈리는 것은 보내는 요청과 실패 문구 둘뿐**이라 그 둘만
   * 인자로 받는다. 두 벌로 베껴 두면 한쪽에만 404 처리나 잠금을 빠뜨리게 되고, 그 차이는
   * 권한이 회수됐거나 유형이 사라진 드문 자리에서만 드러나 눈에 띄지 않는다.
   */
  const runRowMutation = useCallback(
    async (
      type: string,
      send: () => Promise<NotificationTypeRoute>,
      toErrorMessage: (error: unknown) => string,
    ): Promise<string> => {
      if (busyRef.current.has(type)) return "";

      busyRef.current.add(type);
      setSavingTypes((types) => [...types, type]);

      try {
        const saved = await send();
        if (aliveRef.current) {
          setLoaded((prev) =>
            prev === null
              ? prev
              : { ...prev, routes: prev.routes.map((r) => (r.type === type ? saved : r)) },
          );
          // 저장된 값이 곧 고친 값이 됐다 — 고친 값을 남겨 두면 그 줄이 계속 «저장하지 않음»이다
          reset(type);
        }
        return "";
      } catch (error: unknown) {
        // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
        syncSessionOnForbidden(error);
        /*
         * 없는 유형(404)이면 화면이 들고 있는 목록이 낡았다는 뜻이다(서버가 유형을 지웠다).
         * 사라진 줄을 계속 고치게 두지 않고 목록을 다시 받는다 — 그 줄의 고친 값도 함께 버린다.
         */
        if (
          aliveRef.current &&
          error instanceof ApiError &&
          error.code === NOTIFICATION_TYPE_ERROR.NOTIFICATION_TYPE_NOT_FOUND
        ) {
          reset(type);
          setRequestKey((k) => k + 1);
        }
        return toErrorMessage(error);
      } finally {
        busyRef.current.delete(type);
        if (aliveRef.current) {
          setSavingTypes((types) => types.filter((t) => t !== type));
        }
      }
    },
    [reset],
  );

  const save = useCallback(
    async (type: string): Promise<string> => {
      const row = rowsRef.current.find((r) => r.type === type);
      if (!row) return "";
      /*
       * 클라이언트 선검사는 남긴다 — 서버도 400으로 막지만(EMPTY_NOTIFICATION_ROUTE) 왕복 한
       * 번을 기다리지 않고 바로 알려 주는 편이 낫다. 버튼도 같은 조건으로 잠겨 있어 여기까지
       * 오는 것은 잠금이 새는 경우뿐이다.
       *
       * **되돌리기가 이 검사를 우회하는 길이 아니다** — 빈 체크를 저장하는 것(알림을 조용히
       * 끄는 설정)과 기본값으로 되돌리는 것(보낸 앱에 보인다)은 결과가 다르다.
       */
      if (row.apps.length === 0) return "앱을 최소 한 곳 선택해야 저장됩니다";

      return runRowMutation(
        type,
        () => replaceNotificationTypeApps(type, row.apps),
        toNotificationTypeSaveErrorMessage,
      );
    },
    [runRowMutation],
  );

  const clear = useCallback(
    async (type: string): Promise<string> => {
      const row = rowsRef.current.find((r) => r.type === type);
      /*
       * 이미 보낸 앱을 따르는 줄이면 보내지 않는다. 서버는 멱등이라 200을 주지만(서버 #537),
       * 그러면 «되돌렸습니다» 토스트가 아무것도 바꾸지 않은 자리에서도 뜬다 — 그 줄에는
       * 버튼도 없으므로 여기까지 오는 것은 잠금이 새는 경우뿐이다.
       */
      if (!row?.registered) return "";

      return runRowMutation(
        type,
        () => clearNotificationTypeApps(type),
        toNotificationTypeClearErrorMessage,
      );
    },
    [runRowMutation],
  );

  return {
    rows,
    status,
    errorMessage: current?.errorMessage ?? "",
    reload,
    toggleApp,
    reset,
    save,
    clear,
  };
}
