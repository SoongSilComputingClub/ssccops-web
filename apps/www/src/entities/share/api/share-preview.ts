import type { SharePreview } from "../model/types";

/*
 * 공유 링크 익명 미리보기 (ssccops#200 · ssccops#253 · ADR-0016 · ADR-0017).
 *
 * `apps/admin/src/entities/share`에서 **읽는 쪽만** 옮겨 왔다. 어드민에는 발급·조회·폐기가
 * 함께 있지만 이 앱은 아무것도 발급하지 않는다 — www가 하는 일은 링크를 받아 카드를 만들고
 * 사람을 원래 앱으로 보내는 것뿐이고(ADR-0017), 발급은 대상을 가진 앱(admin·lms)이 한다.
 * 그래서 이 슬라이스에는 토큰을 쓰는 함수가 하나도 없다.
 *
 * **`shared/api/client.ts`의 `apiFetch`를 쓰지 않는다.** 이 함수를 부르는 것은
 * `generateMetadata`(서버 컴포넌트)이고 실제 소비자는 카카오톡·슬랙의 크롤러다 — 토큰이 없고,
 * 봉투를 벗기다 던지는 오류는 곧 깨진 카드다. 어드민에서도 같은 이유로 raw fetch를 쓴다.
 */

/**
 * GET /public/v1/share/{token} — 익명 미리보기.
 *
 * **던지지 않는다.** 없는 토큰·폐기된 토큰·서버 장애가 전부 "기본 메타로 떨어진다"는 하나의
 * 결과로 수렴하며, 서버도 그 셋을 같은 404로 답한다(어느 토큰이 한때 존재했는지를 감춘다).
 */
export async function fetchSharePreview(token: string): Promise<SharePreview | null> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");
  if (!baseUrl) return null;

  try {
    const res = await fetch(`${baseUrl}/public/v1/share/${encodeURIComponent(token)}`, {
      headers: { Accept: "application/json" },
      /*
       * 카드는 한 번 굳으므로 매 크롤에 최신값을 받을 이유가 없다. 그렇다고 영구 캐시로 두면
       * 폐기한 링크가 한동안 계속 카드를 만들어 준다 — 짧은 재검증으로 둔다.
       */
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;

    const body = (await res.json()) as { data?: Partial<SharePreview> | null };
    const title = body.data?.title?.trim();
    if (!title || !body.data?.trgtSeCd || typeof body.data?.trgtId !== "number") return null;

    return {
      trgtSeCd: body.data.trgtSeCd,
      trgtId: body.data.trgtId,
      title,
      summary: body.data.summary?.trim() || null,
    };
  } catch {
    return null;
  }
}
