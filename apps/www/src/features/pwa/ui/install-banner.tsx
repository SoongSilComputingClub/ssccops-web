"use client";

import { useSyncExternalStore } from "react";
import { useInstallPrompt } from "@ssccops/pwa";
import { Card } from "@/shared/ui";
import {
  isInstallSnoozed,
  isReturningVisitor,
  snoozeInstall,
  subscribeInstallBanner,
} from "../model/install-banner-store";

/*
 * «홈 화면에 추가» 띠 — 홈과 내 활동의 발치 (#607 · ssccops#449 · ADR-0045).
 *
 * ── 누구에게 ──────────────────────────────────────────────────
 * 두 번째 이후 방문(`localStorage` 방문 횟수)이거나 로그인한 사람(`signedIn` — 내 활동 화면이
 * 서버에서 토큰을 보고 넘긴다 · 홈은 세션을 보지 않으므로 넘기지 않는다). 첫 방문에는 없다 —
 * ssccops#150의 «한 번 보고 나가는 방문» 판단은 첫 방문에는 그대로다. 이미 설치된 창에서는 없고,
 * «닫기»를 누르면 30일 동안 없다(`install-banner-store.ts`).
 *
 * ── 어떻게 ────────────────────────────────────────────────────
 * Chrome·Edge·삼성 인터넷은 `beforeinstallprompt`를 받은 뒤에만(`canInstall`) 띄우고 «추가»가
 * 브라우저 대화상자를 연다. 대화상자를 거절해도 30일 숨긴다 — 같은 사람에게 로드마다 다시 묻지
 * 않는다. iPhone·iPad는 그 이벤트가 없어 «공유 → 홈 화면에 추가» 안내뿐이다. 그 밖(이벤트가 아직
 * 안 온 브라우저·Firefox)에는 아무것도 없다.
 *
 * 서버 스냅샷은 전부 «아니오»라 SSR HTML에는 띠가 없고 하이드레이션 뒤에 나타난다 — 홈은 CDN
 * 5분 캐시를 받는 익명 HTML이라(`next.config.ts` `headers()`) 사람마다 다른 것이 HTML에 찍히면
 * 안 된다.
 */
const getServerFalse = () => false;

export function InstallBanner({ signedIn = false }: Readonly<{ signedIn?: boolean }>) {
  const { canInstall, install, isIos, isStandalone } = useInstallPrompt();
  const returning = useSyncExternalStore(
    subscribeInstallBanner,
    isReturningVisitor,
    getServerFalse,
  );
  const snoozed = useSyncExternalStore(subscribeInstallBanner, isInstallSnoozed, getServerFalse);

  if (isStandalone || snoozed || !(returning || signedIn)) return null;
  if (!canInstall && !isIos) return null;

  const add = async () => {
    await install();
    snoozeInstall();
  };

  return (
    <section aria-label="홈 화면에 추가">
      <Card className="flex flex-col gap-[12px] px-[18px] py-[16px] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-[4px]">
          <div className="text-[15px] font-semibold">
            {canInstall ? "홈 화면에 추가" : "공유 → 홈 화면에 추가"}
          </div>
          <p className="text-[13.5px] leading-[1.6] text-n500">
            {canInstall
              ? "홈 화면에서 앱처럼 열립니다."
              : "Safari의 공유 버튼에서 추가하면 앱처럼 열립니다."}
          </p>
        </div>
        <div className="flex flex-none items-center gap-[8px]">
          {canInstall && (
            <button
              type="button"
              onClick={() => void add()}
              className="rounded-xl bg-accent px-[16px] py-[10px] text-[14.5px] font-semibold text-on-solid hover:bg-accent-strong"
            >
              추가
            </button>
          )}
          <button
            type="button"
            onClick={snoozeInstall}
            className="rounded-xl border border-line px-[16px] py-[10px] text-[14.5px] text-n300 hover:text-ink"
          >
            닫기
          </button>
        </div>
      </Card>
    </section>
  );
}
