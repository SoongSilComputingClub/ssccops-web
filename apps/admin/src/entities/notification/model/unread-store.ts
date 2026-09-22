import { create } from "zustand";

/*
 * 안 읽은 알림 수 — 종 배지와 `/notifications` 화면이 같은 값을 본다 (#604).
 *
 * 종은 셸(사이드바·상단 바)에 있고 목록 화면은 본문에 있어 props로 이을 길이 없다. 목록에서 한 건을
 * 읽거나 «모두 읽음»을 누르면 종이 그 자리에서 줄어야 하므로 값 하나를 모듈 스토어에 둔다. 서버가
 * 정본이고 여기는 마지막으로 들은 값이다 — 진입·`visibilitychange`마다 다시 듣는다.
 */
interface UnreadState {
  /** 아직 한 번도 못 들었으면 null — 배지를 그리지 않는다 */
  unreadCount: number | null;
  setUnreadCount: (count: number) => void;
  /** 읽음 처리 직후 서버를 다시 묻지 않고 하나 뺀다 */
  decrement: () => void;
}

export const useUnreadStore = create<UnreadState>((set) => ({
  unreadCount: null,
  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
  decrement: () =>
    set((s) => ({ unreadCount: s.unreadCount === null ? null : Math.max(0, s.unreadCount - 1) })),
}));
