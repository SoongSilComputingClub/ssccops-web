"use client";

import {
  type ShareTargetOf,
  shareLandingPath,
  shareTargetRule,
} from "@ssccops/share-meta";
import { apiFetchAuthedFromBrowser, apiFetchAuthedNullableFromBrowser } from "@/shared/api/browser-client";

/*
 * 공유 링크 API (ssccops#253 · ssccops-server#311 · ADR-0016 · ADR-0017).
 *
 * `apps/admin/src/entities/share`에서 옮겨 왔다 — 옮긴 것과 갈린 것을 아래에 적는다.
 *
 * **서버는 URL이 아니라 토큰을 준다.** 링크가 가리키는 곳은 API가 아니라 웹이라, 서버가
 * 주소를 조립하려면 웹의 호스트를 설정으로 들고 있어야 한다 — 그 종류의 설정에서 두 번 데었다
 * (`R2_PUBLIC_BASE_URL`·`APP_PUBLIC_BASE_URL`). 그래서 조립은 웹이 한다.
 *
 * **토큰이 주는 것은 미리보기까지다**(ADR-0016). 링크를 받은 사람이 눌러도 로그인과 권한 검사를
 * 지나야 내용을 본다 — 공유는 "무엇인지 알려 주는 것"이지 "볼 수 있게 해 주는 것"이 아니다.
 *
 * ── 어드민과 갈리는 것 ①: 이 앱은 익명 미리보기를 읽지 않는다 ──
 * 어드민에는 `fetchSharePreview`가 함께 있지만 그것은 **착지 화면의 것**이고, 학술 착지는
 * `apps/www`가 받는다(ADR-0017). 이 앱은 발급·조회·폐기만 한다.
 *
 * ── 어드민과 갈리는 것 ②: 오리진 분기가 없다 ────────────────
 * 어드민은 대상에 따라 `window.location.origin`과 www 오리진으로 갈린다 — 운영 건은 자기가
 * 받고 행사는 www가 받기 때문이다. **이 앱이 발급하는 대상은 전부 www가 받는다.** 그래서
 * 갈래가 하나뿐이고, 그 사실을 주석이 아니라 타입으로 적어 둔다(아래 `ShareTargetOf<"www">`) —
 * 언젠가 lms가 admin 착지 대상을 발급하려 들면 컴파일이 막는다.
 *
 * ── 브라우저 전용이다 ──────────────────────────────────────
 * 공유 버튼은 클라이언트 컴포넌트다. 이 앱은 조회를 서버 컴포넌트로 그리지만(AGENTS.md),
 * 발급·폐기는 사람이 누르는 순간의 동작이라 브라우저에서 나간다 — 그래서
 * `browser-client.ts`를 탄다(기획안 자동 저장·제출과 같은 통로다).
 */

/**
 * 이 앱이 발급할 수 있는 대상 — **착지가 www인 것뿐이다**(ADR-0017).
 *
 * 표에 www 착지 대상이 늘면 여기가 저절로 넓어지고, admin 착지 대상은 애초에 들어오지 못한다.
 */
export type LmsShareTargetType = ShareTargetOf<"www">;

interface ShareLinkApiResponse {
  shrTkn: string | null;
  crtDt: string | null;
}

export interface ShareLink {
  token: string;
  /** 공유용 절대 주소. 오리진은 대상 종류가 정한다 */
  url: string;
}

/**
 * 착지 오리진이 설정되지 않았다 — 서버 실패가 아니라 배포 설정 문제다.
 *
 * 갈라 두는 것은 안내 문구가 달라야 하기 때문이다. "잠시 후 다시"로 안내하면 사람이 영영
 * 다시 눌러 본다.
 */
export class ShareOriginMissingError extends Error {
  constructor() {
    super("NEXT_PUBLIC_PUBLIC_FORM_ORIGIN is not configured");
    this.name = "ShareOriginMissingError";
  }
}

/*
 * 토큰 → 공유 주소.
 *
 * 오리진은 `NEXT_PUBLIC_PUBLIC_FORM_ORIGIN`(www)이다. 어드민이 운영 건에 쓰는
 * `window.location.origin` 방어 — *"프리뷰 배포마다 도메인이 달라 값이 어긋나는 순간 자기
 * 자신을 가리키지 않는 링크가 만들어진다"* — 는 **여기서 성립하지 않는다.** 착지가 남의 앱이라
 * 지금 접속한 오리진으로부터 알아낼 방법이 없다. 그래서 값이 비면 **죽은 주소를 쥐어 주는
 * 대신 실패한다.**
 *
 * 공개 폼용 변수를 재사용하는 것은 같은 www 오리진이라서이고, 이름이 쓰임새보다 좁아진 것은
 * 남아 있는 빚이다(ADR-0017 — 바꾸려면 배포 시크릿을 함께 옮겨야 해서 별도로 다룬다).
 */
function toShareLink(token: string): ShareLink {
  const configured = process.env.NEXT_PUBLIC_PUBLIC_FORM_ORIGIN?.replace(/\/+$/, "");
  if (!configured) throw new ShareOriginMissingError();
  return { token, url: `${configured}${shareLandingPath(token)}` };
}

/**
 * GET {대상 경로} — 현재 공유 상태.
 *
 * 공유한 적이 없거나 폐기했으면 **`null`이고 404가 아니다** — '공유 중이 아니다'는 오류가
 * 아니라 정상적인 조회 결과다(서버가 `data: null`인 200으로 답한다).
 */
export async function fetchShareLink(
  targetType: LmsShareTargetType,
  targetId: number,
): Promise<ShareLink | null> {
  const res = await apiFetchAuthedNullableFromBrowser<ShareLinkApiResponse>(
    shareTargetRule(targetType).apiPath(targetId),
  );
  return res?.shrTkn ? toShareLink(res.shrTkn) : null;
}

/**
 * POST {대상 경로} — 공유 링크 발급.
 *
 * **멱등이다** — 이미 공유 중이면 서버가 같은 토큰을 돌려준다. 만료가 없어(ADR-0016) 누를
 * 때마다 새로 만들면 죽지 않는 링크가 쌓이기 때문이며, 그래서 화면도 "다시 눌러도 같은 링크"를
 * 전제로 그린다.
 */
export async function issueShareLink(
  targetType: LmsShareTargetType,
  targetId: number,
): Promise<ShareLink> {
  const res = await apiFetchAuthedFromBrowser<ShareLinkApiResponse | null>(
    shareTargetRule(targetType).apiPath(targetId),
    { method: "POST" },
  );
  if (!res?.shrTkn) throw new Error("공유 링크를 만들지 못했습니다");
  return toShareLink(res.shrTkn);
}

/**
 * DELETE {대상 경로} — 공유 중지.
 *
 * 만료를 두지 않기로 했으므로 **이것이 링크를 거두는 유일한 길이다.** 폐기하면 그 링크로는
 * 미리보기도 상세도 열리지 않는다. 공유 중이 아니어도 오류가 아니다.
 */
export async function revokeShareLink(
  targetType: LmsShareTargetType,
  targetId: number,
): Promise<void> {
  await apiFetchAuthedNullableFromBrowser<void>(shareTargetRule(targetType).apiPath(targetId), {
    method: "DELETE",
  });
}
