"use client";

import { AccountMenuItem, AccountMenuNote } from "@ssccops/ui";
import { useInstallPrompt } from "../use-install-prompt";

/**
 * 계정 메뉴 절 ⑤ «홈 화면에 추가» (ssccops#452 · ssccops-web#614 · 1차 #108이 남긴 자리).
 *
 * admin(#604)·lms(#606)가 각자 `features/pwa` `InstallItem`으로 갖고 있던 것을 계정 메뉴로 옮기며
 * 올렸다 — 세 앱이 같은 메뉴 항목을 그리고, 모양은 `@ssccops/ui` `AccountMenuItem`이 정한다
 * (팝오버 안에서는 `menuitem`, 드로어에서는 보통 버튼). `beforeinstallprompt`를 받은 브라우저에만
 * 행이 있고, iPhone·iPad는 그 이벤트가 없어 «공유 → 홈 화면에 추가» 한 줄로 대신한다. 이미 설치된
 * 창에서는 아무것도 없다. 이벤트는 `use-install-prompt.ts` 모듈이 로드 때 받아 두므로 메뉴를 나중에
 * 열어도 잡힌다.
 */
export function InstallMenuItem() {
  const { canInstall, install, isIos, isStandalone } = useInstallPrompt();
  if (isStandalone) return null;

  if (canInstall) {
    return <AccountMenuItem onClick={() => void install()}>홈 화면에 추가</AccountMenuItem>;
  }
  if (isIos) {
    return <AccountMenuNote>홈 화면에 추가는 공유 버튼에서 합니다.</AccountMenuNote>;
  }
  return null;
}
