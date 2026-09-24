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
    /*
     * `role="status"` + `aria-live="polite"` (#687 · ssccops#505).
     *
     * `flash()`는 어드민의 **유일한** 전역 피드백 통로이고, 저장 결과·권한 거절뿐 아니라
     * **제출을 막는 검증 문구**도 여기로 나간다(반려 시트의 «반려 사유를 입력해주세요»).
     * 속성이 없던 동안 스크린리더 사용자는 «반려»를 눌러도 아무 소리도 듣지 못했고, 시트는
     * 열린 채 그대로여서 **왜 안 되는지 알 방법이 없었다.** 2200ms 뒤 문구는 사라진다.
     *
     * `alert`(assertive)가 아닌 것은 대부분이 «저장됐습니다» 같은 결과 알림이라 읽던 것을
     * 끊을 이유가 없어서다. 같은 레포의 `form-save-status`(`role="status"`)와 같은 판단이고,
     * `offline-banner`는 `<output>`으로 같은 자리를 이미 채우고 있다.
     */
    <div
      key={seq}
      role="status"
      aria-live="polite"
      className="fixed bottom-7 left-1/2 z-[95] -translate-x-1/2 animate-fade-in rounded-[14px] bg-ink px-[18px] py-3 text-[15px] whitespace-nowrap text-on-solid"
    >
      {message}
    </div>
  );
}
