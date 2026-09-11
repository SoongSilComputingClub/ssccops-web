import {
  type ShareTargetType,
  shareLandingPath,
  shareTargetRule,
} from "@ssccops/share-meta";
import { apiFetch } from "@/shared/lib/api/client";

/*
 * 공유 링크 API (ssccops#200 · ssccops#250 · ssccops-server#255 · ADR-0016 · ADR-0017).
 *
 * **서버는 URL이 아니라 토큰을 준다.** 링크가 가리키는 곳은 API가 아니라 이 웹이라, 서버가
 * 주소를 조립하려면 웹의 호스트를 설정으로 들고 있어야 한다 — 그 종류의 설정에서 두 번 데었다
 * (`R2_PUBLIC_BASE_URL`·`APP_PUBLIC_BASE_URL`). 우리는 자기 주소를 언제나 정확히 알고 있으므로
 * 여기서 조립한다.
 *
 * **토큰이 주는 것은 미리보기까지다**(ADR-0016). 링크를 받은 사람이 눌러도 로그인과 권한 검사를
 * 지나야 내용을 본다 — 공유는 "무엇인지 알려 주는 것"이지 "볼 수 있게 해 주는 것"이 아니다.
 *
 * **여기 있는 함수는 어느 대상이든 받는다.** 서버는 처음부터 대상 중립이었고(`shr_lnk`가
 * 구분 코드 + 대상 ID다) 막혀 있던 것은 웹뿐이었다 — 대상별 경로·문구는 전부
 * `@ssccops/share-meta`의 표가 갖는다.
 */

interface ShareLinkApiResponse {
  shrTkn: string | null;
  crtDt: string | null;
}

export interface ShareLink {
  token: string;
  /** 공유용 절대 주소. 오리진은 대상 종류가 정한다 */
  url: string;
}

/*
 * 토큰 → 공유 주소.
 *
 * **오리진은 발급하는 앱이 아니라 대상 종류가 정한다**(ADR-0017). 링크를 받는 사람이 운영진이면
 * 운영 도메인을 가리켜도 자연스럽고, 부원·외부에게 나가는 링크는 공개 도메인이어야 한다.
 * 그래서 두 갈래가 있고 이유가 서로 다르다.
 *
 *   착지가 이 앱(admin)  → `window.location.origin`
 *     환경변수로 두지 않는 것은 프리뷰 배포마다 도메인이 달라 값이 어긋나는 순간 **자기 자신을
 *     가리키지 않는 링크**가 만들어지기 때문이다. 착지가 이 앱인 한 이 방어는 그대로 유효하다 —
 *     지금 접속한 오리진이 곧 링크가 가야 할 오리진이다.
 *
 *   착지가 www        → `NEXT_PUBLIC_PUBLIC_FORM_ORIGIN`
 *     남의 앱 주소는 지금 접속한 오리진으로부터 알아낼 방법이 없어 설정으로 받는다. 그래서 위
 *     방어가 여기서는 성립하지 않는다 — 값이 비면 **죽은 주소를 쥐어 주는 대신 실패한다**
 *     (`publicFormUrl()`이 `null`로 떨어지는 것과 같은 판단이다). 그 변수를 재사용하는 것은
 *     같은 www 오리진이라서이고, 이름이 쓰임새보다 좁아진 것은 남아 있는 빚이다(ADR-0017).
 *
 * 이 함수는 브라우저에서만 불린다(공유 버튼은 클라이언트 컴포넌트다).
 */
export class ShareOriginMissingError extends Error {
  constructor() {
    super("NEXT_PUBLIC_PUBLIC_FORM_ORIGIN is not configured");
    this.name = "ShareOriginMissingError";
  }
}

function toShareLink(targetType: ShareTargetType, token: string): ShareLink {
  const path = shareLandingPath(token);

  if (shareTargetRule(targetType).landingApp === "admin") {
    return { token, url: `${window.location.origin}${path}` };
  }

  // `/\/+$/`는 되돌아가는 정규식이지만 입력이 배포 설정값이라 닿을 일이 없다 (#401 · S8786)
  const configured = process.env.NEXT_PUBLIC_PUBLIC_FORM_ORIGIN?.replace(/\/+$/, "");
  if (!configured) {
    throw new ShareOriginMissingError();
  }
  return { token, url: `${configured}${path}` };
}

/**
 * GET {대상 경로} — 현재 공유 상태.
 *
 * 공유한 적이 없거나 폐기했으면 **`null`이고 404가 아니다** — '공유 중이 아니다'는 오류가
 * 아니라 정상적인 조회 결과다(서버가 `data: null`인 200으로 답한다).
 */
export async function fetchShareLink(
  targetType: ShareTargetType,
  targetId: number,
): Promise<ShareLink | null> {
  const res = await apiFetch<ShareLinkApiResponse | null>(
    shareTargetRule(targetType).apiPath(targetId),
  );
  return res?.shrTkn ? toShareLink(targetType, res.shrTkn) : null;
}

/**
 * POST {대상 경로} — 공유 링크 발급.
 *
 * **멱등이다** — 이미 공유 중이면 서버가 같은 토큰을 돌려준다. 만료가 없어(ADR-0016) 누를
 * 때마다 새로 만들면 죽지 않는 링크가 쌓이기 때문이며, 그래서 화면도 "다시 눌러도 같은 링크"를
 * 전제로 그린다.
 */
export async function issueShareLink(
  targetType: ShareTargetType,
  targetId: number,
): Promise<ShareLink> {
  const res = await apiFetch<ShareLinkApiResponse | null>(
    shareTargetRule(targetType).apiPath(targetId),
    { method: "POST" },
  );
  if (!res?.shrTkn) {
    throw new Error("공유 링크를 만들지 못했습니다");
  }
  return toShareLink(targetType, res.shrTkn);
}

/**
 * DELETE {대상 경로} — 공유 중지.
 *
 * 만료를 두지 않기로 했으므로 **이것이 링크를 거두는 유일한 길이다.** 폐기하면 그 링크로는
 * 미리보기도 상세도 열리지 않는다. 공유 중이 아니어도 오류가 아니다.
 */
export async function revokeShareLink(
  targetType: ShareTargetType,
  targetId: number,
): Promise<void> {
  await apiFetch<void>(shareTargetRule(targetType).apiPath(targetId), { method: "DELETE" });
}

/* ── 익명 미리보기 (서버 컴포넌트 전용) ─────────────────────── */

export interface SharePreview {
  /**
   * 서버가 준 대상 구분 코드 **그대로**다. `ShareTargetType`으로 좁히지 않는 것은 서버만 먼저
   * 배포되면 이 웹이 모르는 값이 올 수 있기 때문이며, 아는 값인지는 착지 화면이
   * `isShareTargetType`으로 묻는다.
   */
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
  // `/\/+$/`는 되돌아가는 정규식이지만 입력이 배포 설정값이라 닿을 일이 없다 (#401 · S8786)
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
