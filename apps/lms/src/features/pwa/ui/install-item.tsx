"use client";

import { useInstallPrompt } from "@ssccops/pwa";

/**
 * 드로어 발치의 «홈 화면에 추가» (#606 · ssccops#448 · 어드민 #604와 같은 규칙).
 *
 * `beforeinstallprompt`를 받은 브라우저에만 행이 있고, iPhone·iPad는 그 이벤트가 없어 «공유 → 홈 화면에
 * 추가» 한 줄로 대신한다. 이미 설치된 창에서는 아무것도 없다. 모양은 드로어 발치의 «홈페이지 ↗» 행과
 * 같다(`mobile-nav.tsx`). 이벤트는 `@ssccops/pwa` 모듈이 로드 때 받아 두므로 드로어를 나중에 열어도 잡힌다.
 */
export function InstallItem() {
  const { canInstall, install, isIos, isStandalone } = useInstallPrompt();
  if (isStandalone) return null;

  if (canInstall) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="mb-3 block w-full cursor-pointer rounded-[10px] px-[12px] py-[11px] text-left text-[15px] text-ink hover:bg-bg"
      >
        홈 화면에 추가
      </button>
    );
  }
  if (isIos) {
    return (
      <div className="mb-3 px-[12px] text-[12.5px] leading-[1.6] text-n500">
        홈 화면에 추가는 공유 버튼에서 합니다.
      </div>
    );
  }
  return null;
}
