import type { Metadata } from "next";
import { RetryButton } from "./retry-button";

/*
 * `/offline` — 연결이 없고 캐시에도 없는 화면을 열었을 때 서비스워커가 대신 내주는 안내 (#604 · ADR-0045).
 *
 * **정적이고 데이터가 없다.** 워커가 install 때 이 HTML을 미리 담고, 오프라인 이동이 캐시에 없을 때
 * 꺼낸다 — 세션·API를 읽으면 담을 때의 사람이 굳는다. 미들웨어 매처에서 뺀 것도 같은 이유다
 * (로그인 전에 담으면 로그인 HTML이 `/offline` 자리에 들어간다).
 *
 * `(admin)` 셸 밖이다 — 셸은 세션 조회(`AuthGate`)가 있어 오프라인에서 그 자체가 오류 화면이 된다.
 */
export const metadata: Metadata = { title: "오프라인" };

export default function OfflinePage() {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center px-6 text-center"
      style={{
        background:
          "radial-gradient(1100px 460px at 50% 0%, var(--color-subtle), var(--color-bg))",
      }}
    >
      <div className="text-[22px] font-medium">연결이 없습니다</div>
      <p className="mt-3 max-w-[360px] text-[14.5px] leading-[1.7] text-n500">
        마지막으로 열었던 화면은 오프라인에서도 열립니다. 이 화면은 아직 연 적이 없어 보여 줄
        내용이 없습니다.
      </p>
      <RetryButton />
    </div>
  );
}
