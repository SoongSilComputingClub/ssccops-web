"use client";

import { useInstallPrompt } from "@ssccops/pwa";

/**
 * 드로어·사이드바 발치의 «홈 화면에 추가» (#604 · 1차 #108이 남긴 자리).
 *
 * `beforeinstallprompt`를 받은 브라우저에만 행이 있고, iPhone·iPad는 그 이벤트가 없어 «공유 → 홈
 * 화면에 추가» 한 줄로 대신한다. 이미 설치된 창에서는 아무것도 없다. 모양은 `nav-panel.tsx`의 외부
 * 링크 행과 같다.
 */
export function InstallItem() {
  const { canInstall, install, isIos, isStandalone } = useInstallPrompt();
  if (isStandalone) return null;

  if (canInstall) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="flex w-full cursor-pointer items-center gap-[9px] px-[18px] py-[10px] text-left text-[15.5px] text-n300 hover:bg-accent/6"
      >
        <div className="h-[15px] w-[3px] flex-none rounded-[2px] bg-transparent" />
        홈 화면에 추가
      </button>
    );
  }
  if (isIos) {
    return (
      <div className="px-[18px] py-2 text-[12.5px] leading-[1.6] text-n500">
        홈 화면에 추가는 공유 버튼에서 합니다.
      </div>
    );
  }
  return null;
}
