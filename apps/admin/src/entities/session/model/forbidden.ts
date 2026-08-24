import { API_ERROR, ApiError } from "@/shared/lib/api/client";
import { fetchAuthSession } from "../api/session";
import { useSessionStore } from "./store";

/**
 * 403 FORBIDDEN을 받았을 때 세션을 다시 받아 온다.
 *
 * ── 왜 필요한가 ────────────────────────────────────────────────
 * 화면은 세션의 capabilities를 보고 버튼을 감추거나 잠근다. 그런데 그 배열은 **화면을 연
 * 시점의 사진**이다. 국장 역할이 오늘부로 끝났거나 운영진이 역할에서 권한을 떼면, 화면은
 * 여전히 버튼을 열어 두고 사용자는 눌러서야 403을 본다. 그때 안내만 띄우고 끝내면 사용자는
 * 계속 눌리는 버튼을 계속 눌러 계속 실패한다 — 다시 받아 와서 **화면이 스스로 잠기게** 한다.
 *
 * ── 조용히 실패하지 않는다 ──────────────────────────────────────
 * 이 함수는 화면 메시지를 대신하지 않는다. 호출부는 평소대로 오류 문구를 만들어 보여 주고,
 * 이 함수는 그 옆에서 상태만 맞춘다. 재조회 자체가 실패하면 아무것도 하지 않는다 — 원래
 * 사용자가 봐야 할 것은 "권한이 없어 실패했다"이지 "세션 재조회에 실패했다"가 아니다.
 *
 * ── FORBIDDEN 코드 하나에 두 가지 뜻이 실린다 ────────────────────
 * 서버는 권한 부족(MemberErrorCode.AUTHORITY_REQUIRED)과 승인자 아님
 * (OperationErrorCode.FORBIDDEN)에 같은 "FORBIDDEN" 문자열을 쓴다. 후자는 권한 회수와 무관해
 * 재조회가 헛수고지만, 세션 조회 한 번이 더 나갈 뿐 화면이 잘못되지는 않는다. 두 경우를
 * 구분하려면 서버가 코드를 나눠야 한다.
 *
 * 403 SIGNUP_REQUIRED는 여기까지 오지 않는다 — apiFetch가 이미 /signup으로 보낸 뒤다.
 */
export function syncSessionOnForbidden(error: unknown): void {
  if (!(error instanceof ApiError)) return;
  if (error.code !== API_ERROR.FORBIDDEN && error.code !== API_ERROR.ACCESS_DENIED) return;

  void fetchAuthSession()
    .then((session) => useSessionStore.getState().setSession(session))
    .catch(() => {
      /* 재조회 실패는 원래 오류를 덮지 않는다 (위 주석) */
    });
}
