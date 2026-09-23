"use client";

import { useState } from "react";
import type { PushTestRequest, PushTestResult } from "../notification";
import type { PushApp } from "../service-worker";

/*
 * «테스트 알림 보내기» — «내 정보»의 푸시 스위치 아래 한 줄 (ssccops#454 · ssccops-web#616).
 *
 * 푸시를 켠 사람이 «정말 오나»를 바로 확인할 길이 없었다 — 남이 검토 요청을 하거나 09:00 스케줄러를
 * 기다려야 했다. 이 버튼은 서버(`POST /v1/notifications/test {app}`)가 호출자 자신에게 알림 행 하나와
 * 자기 구독 전부로 푸시를 보내게 한다. 세 앱이 같은 버튼·같은 문구를 쓰므로 여기 한 벌이다.
 *
 * 서버 호출은 앱이 넘긴다(`sendTest` — 앱마다 인증 헤더·봉투 처리가 다른 `apiFetch`). 429는 서버가
 * 1분 3회를 넘긴 것(코드 `RATE_LIMITED` · server#529) — 앱의 `ApiError`를 여기서 임포트할 수 없어
 * `status`·`code` 필드만 duck-typing으로 읽는다. 결과 문구는 버튼 아래 한 줄이고 다음 시도에서 지워진다.
 *
 * **스위치가 켜져 있을 때만 그린다**(`enabled`) — 꺼진 채 보내면 알림 행만 남고 푸시는 0대라 «안 온다»를
 * 확인하는 버튼이 된다. 그래도 서버는 거부하지 않으므로 `pushed`가 0이면(서버가 푸시를 껐거나 이 계정의
 * 구독이 죽어 있다) 그 사실을 문구로 말한다.
 */

type TestStatus =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; pushed: number }
  | { kind: "error"; message: string };

function isRateLimited(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { status, code } = error as { status?: unknown; code?: unknown };
  return status === 429 || code === "RATE_LIMITED";
}

function resultMessage(status: TestStatus): string | null {
  switch (status.kind) {
    case "sent":
      return status.pushed > 0
        ? `보냈습니다 — 기기 알림을 확인해주세요(${status.pushed}대)`
        : "알림 목록에는 남았지만 푸시를 받은 기기가 없습니다 — 푸시 알림을 껐다 켜주세요";
    case "error":
      return status.message;
    default:
      return null;
  }
}

export function PushTestButton({
  app,
  sendTest,
  enabled,
}: Readonly<{
  /** 이 앱 — 알림의 링크가 이 앱의 «내 정보»로 간다 */
  app: PushApp;
  /** `POST /v1/notifications/test` — 앱의 `apiFetch`로 */
  sendTest: (request: PushTestRequest) => Promise<PushTestResult>;
  /** 푸시 스위치가 켜져 있는가 — 아니면 아무것도 그리지 않는다 */
  enabled: boolean;
}>) {
  const [status, setStatus] = useState<TestStatus>({ kind: "idle" });

  if (!enabled) return null;

  const send = async () => {
    if (status.kind === "sending") return;
    setStatus({ kind: "sending" });
    try {
      const result = await sendTest({ app });
      setStatus({ kind: "sent", pushed: result.pushed });
    } catch (error: unknown) {
      setStatus({
        kind: "error",
        message: isRateLimited(error)
          ? "너무 자주 보냈습니다 — 잠시 후 다시 시도해주세요"
          : "테스트 알림을 보내지 못했습니다 — 잠시 후 다시 시도해주세요",
      });
    }
  };

  const message = resultMessage(status);

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div>
        <button
          type="button"
          onClick={() => void send()}
          disabled={status.kind === "sending"}
          className="cursor-pointer rounded-[10px] border border-line-strong px-3 py-[7px] text-[14px] text-n300 hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-45"
        >
          {status.kind === "sending" ? "보내는 중…" : "테스트 알림 보내기"}
        </button>
      </div>
      {/* `<output>`이 곧 role="status"다(S6819). 기본 display가 inline이라 `block`을 함께 적는다 */}
      {message && (
        <output
          className={
            status.kind === "error"
              ? "block text-[13.5px] leading-[1.6] text-danger"
              : "block text-[13.5px] leading-[1.6] text-n500"
          }
        >
          {message}
        </output>
      )}
    </div>
  );
}
