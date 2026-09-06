import { apiFetch } from "@/shared/lib/api/client";

/*
 * 공유 링크 API (ssccops#200 · ssccops-server#255 · ADR-0016).
 *
 * **서버는 URL이 아니라 토큰을 준다.** 링크가 가리키는 곳은 API가 아니라 이 웹이라, 서버가
 * 주소를 조립하려면 웹의 호스트를 설정으로 들고 있어야 한다 — 그 종류의 설정에서 두 번 데었다
 * (`R2_PUBLIC_BASE_URL`·`APP_PUBLIC_BASE_URL`). 우리는 자기 주소를 언제나 정확히 알고 있으므로
 * 여기서 조립한다.
 *
 * **토큰이 주는 것은 미리보기까지다**(ADR-0016). 링크를 받은 사람이 눌러도 로그인과 권한 검사를
 * 지나야 내용을 본다 — 공유는 "무엇인지 알려 주는 것"이지 "볼 수 있게 해 주는 것"이 아니다.
 */

interface ShareLinkApiResponse {
  shrTkn: string | null;
  crtDt: string | null;
}

export interface ShareLink {
  token: string;
  /** 공유용 절대 주소. 이 앱의 origin으로 조립한다 */
  url: string;
}

/*
 * 토큰 → 공유 주소.
 *
 * `window.location.origin`을 쓰는 것은 이 함수가 브라우저에서만 불리기 때문이다(공유 버튼은
 * 클라이언트 컴포넌트다). 환경변수로 두지 않는 것은 프리뷰 배포마다 도메인이 달라 값이
 * 어긋나는 순간 **자기 자신을 가리키지 않는 링크**가 만들어지기 때문이다.
 */
function toShareLink(token: string): ShareLink {
  return { token, url: `${window.location.origin}/s/${token}` };
}

/**
 * GET /v1/sub-works/{subWorkId}/share — 현재 공유 상태.
 *
 * 공유한 적이 없거나 폐기했으면 **`null`이고 404가 아니다** — '공유 중이 아니다'는 오류가
 * 아니라 정상적인 조회 결과다(서버가 `data: null`인 200으로 답한다).
 */
export async function fetchSubWorkShareLink(subWorkId: number): Promise<ShareLink | null> {
  const res = await apiFetch<ShareLinkApiResponse | null>(`/v1/sub-works/${subWorkId}/share`);
  return res?.shrTkn ? toShareLink(res.shrTkn) : null;
}

/**
 * POST /v1/sub-works/{subWorkId}/share — 공유 링크 발급.
 *
 * **멱등이다** — 이미 공유 중이면 서버가 같은 토큰을 돌려준다. 만료가 없어(ADR-0016) 누를
 * 때마다 새로 만들면 죽지 않는 링크가 쌓이기 때문이며, 그래서 화면도 "다시 눌러도 같은 링크"를
 * 전제로 그린다.
 */
export async function issueSubWorkShareLink(subWorkId: number): Promise<ShareLink> {
  const res = await apiFetch<ShareLinkApiResponse | null>(`/v1/sub-works/${subWorkId}/share`, {
    method: "POST",
  });
  if (!res?.shrTkn) {
    throw new Error("공유 링크를 만들지 못했습니다");
  }
  return toShareLink(res.shrTkn);
}

/**
 * DELETE /v1/sub-works/{subWorkId}/share — 공유 중지.
 *
 * 만료를 두지 않기로 했으므로 **이것이 링크를 거두는 유일한 길이다.** 폐기하면 그 링크로는
 * 미리보기도 상세도 열리지 않는다. 공유 중이 아니어도 오류가 아니다.
 */
export async function revokeSubWorkShareLink(subWorkId: number): Promise<void> {
  await apiFetch<void>(`/v1/sub-works/${subWorkId}/share`, { method: "DELETE" });
}

/* ── 익명 미리보기 (서버 컴포넌트 전용) ─────────────────────── */

export interface SharePreview {
  trgtSeCd: string;
  trgtId: number;
  title: string;
  summary: string | null;
}

/**
 * GET /public/v1/share/{token} — 익명 미리보기.
 *
 * **`apiFetch`를 쓰지 않는다.** 그 클라이언트는 브라우저의 Supabase 토큰을 붙이고 401·403에
 * 리다이렉트까지 거는데, 이 함수를 부르는 것은 `generateMetadata`(서버 컴포넌트)이고 실제
 * 소비자는 카카오톡·슬랙의 크롤러다 — 토큰이 없고, 리다이렉트는 곧 깨진 카드다.
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
