/*
 * 설치 띠의 «보여 줄 사람인가» 판정 — 방문 횟수와 30일 숨김 (#607 · ssccops#449).
 *
 * ── 첫 방문에는 띄우지 않는다 ─────────────────────────────────
 * ssccops#150의 판단(카톡·에타 링크로 한 번 보고 나가는 방문이 대부분이라 설치를 권할 대상이
 * 뚜렷하지 않다)은 첫 방문에는 여전히 맞다. ADR-0045가 뒤집은 것은 «돌아온 사람에게도 권하지
 * 않는다»는 쪽이다 — 두 번째 방문부터, 또는 로그인해서 `/me`를 보는 사람에게만 띄운다(로그인
 * 여부는 서버 컴포넌트가 프롭으로 넘긴다 · `install-banner.tsx`).
 *
 * ── 방문 = 브라우저 세션 하나 ──────────────────────────────────
 * 한 번 들어와 여러 화면을 도는 것은 한 방문이다. `sessionStorage`에 표시를 두어 탭이 살아 있는
 * 동안은 다시 세지 않고, 횟수는 `localStorage`에 남긴다. 세는 자리는 루트 레이아웃의
 * `ServiceWorkerRegister` effect 하나 — 띠는 화면 둘(홈·내 활동)에만 있어 거기서 세면 다른
 * 화면으로 들어온 방문이 빠진다.
 *
 * ── 저장소는 언제든 없을 수 있다 ──────────────────────────────
 * 프라이빗 창·저장소 차단·용량 초과에서 `localStorage` 접근 자체가 던진다. 전부 try/catch로 감싸고
 * 실패하면 «첫 방문·숨김 아님»으로 본다 — 띠가 한 번 더 뜨는 쪽이 화면이 죽는 쪽보다 낫다.
 *
 * 값이 React 밖에 있어 `useSyncExternalStore`로 읽는다(`@ssccops/pwa`의 훅과 같은 이유) — 서버
 * 스냅샷은 «보이지 않음»이라 SSR HTML에 띠가 찍히지 않고, 하이드레이션 뒤 실제 값이 된다.
 * `recordVisit`·`snoozeInstall`이 값을 바꾸면 구독자에게 알려 띠가 그 자리에서 갱신된다.
 */

const VISITS_KEY = "sscc-www-visits";
const VISIT_SESSION_KEY = "sscc-www-visit-counted";
const SNOOZE_KEY = "sscc-www-install-snoozed-until";

/** 이 횟수부터 «재방문»이다 */
const RETURNING_VISITS = 2;
/** «닫기» 뒤 다시 띄우지 않는 기간 */
const SNOOZE_DAYS = 30;

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeInstallBanner(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readNumber(storage: Storage, key: string): number {
  try {
    const value = Number(storage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

/**
 * 방문을 한 번 센다 — 브라우저 세션당 한 번. 루트 레이아웃이 마운트될 때 부른다.
 * 저장소가 없으면 조용히 건너뛴다(그 브라우저에서는 늘 첫 방문이다).
 */
export function recordVisit(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.sessionStorage.getItem(VISIT_SESSION_KEY)) return;
    window.sessionStorage.setItem(VISIT_SESSION_KEY, "1");
    const next = readNumber(window.localStorage, VISITS_KEY) + 1;
    window.localStorage.setItem(VISITS_KEY, String(next));
  } catch {
    return;
  }
  notify();
}

/** 두 번째 이후 방문인가 — 저장소가 없으면 false */
export function isReturningVisitor(): boolean {
  if (typeof window === "undefined") return false;
  return readNumber(window.localStorage, VISITS_KEY) >= RETURNING_VISITS;
}

/** 저장소에 못 적어도 이 페이지 안에서는 닫힌 채여야 한다 — 그 한 겹 */
let snoozedInMemory = false;

/** «닫기»를 누른 뒤 30일이 지나지 않았나 — 저장소가 없으면 이 페이지에서 닫았는지만 본다 */
export function isInstallSnoozed(): boolean {
  if (typeof window === "undefined") return false;
  return snoozedInMemory || readNumber(window.localStorage, SNOOZE_KEY) > Date.now();
}

/** «닫기» — 30일 동안 띄우지 않는다 */
export function snoozeInstall(): void {
  if (typeof window === "undefined") return;
  snoozedInMemory = true;
  try {
    const until = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
    window.localStorage.setItem(SNOOZE_KEY, String(until));
  } catch {
    // 저장이 안 되면 다음 방문에 다시 뜬다 — 이번 화면에서는 위 플래그가 닫아 둔다
  }
  notify();
}
