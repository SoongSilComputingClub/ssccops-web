import { createPushApi } from "@ssccops/pwa";
import { apiFetch } from "@/shared/lib/api/client";

/*
 * `/v1/push/*` — Web Push 구독 (#604 · ssccops#446 «API 계약» · ADR-0045 · #671).
 *
 * 세 호출(`config`·`subscribe`·`unsubscribe`)은 계약이 정하는 하나라 `@ssccops/pwa`의 `createPushApi`가
 * 만든다(`createNotificationApi`와 같은 자리) — 이 파일은 **보내는 통로**만 꽂는다. 이 앱은 `data` 없는
 * 200 봉투를 위한 통로가 따로 없어 `apiFetch` 하나를 넘긴다. 404(서버가 모르는 endpoint)를 성공으로
 * 삼키는 규칙은 패키지가 든다 — 브라우저 구독은 어느 쪽이든 풀어야 한다.
 */
export const pushApi = createPushApi(apiFetch);
