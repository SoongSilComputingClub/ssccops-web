"use client";

import { create } from "zustand";

interface ToastState {
  message: string | null;
  seq: number;
  flash: (message: string) => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;

export const useToastStore = create<ToastState>((set, get) => ({
  message: null,
  seq: 0,
  flash: (message) => {
    clearTimeout(timer);
    set({ message, seq: get().seq + 1 });
    timer = setTimeout(() => set({ message: null }), 2200);
  },
}));

/** 어디서든 호출 가능한 토스트 헬퍼 (원본 flash()와 동일, 2200ms) */
export function flash(message: string) {
  useToastStore.getState().flash(message);
}

/** 루트 레이아웃에 1회 마운트 */
export function ToastViewport() {
  const { message, seq } = useToastStore();
  if (!message) return null;
  return (
    <div
      key={seq}
      className="fixed bottom-7 left-1/2 z-[95] -translate-x-1/2 animate-fade-in rounded-[14px] bg-ink px-[18px] py-3 text-[15px] whitespace-nowrap text-white"
    >
      {message}
    </div>
  );
}
