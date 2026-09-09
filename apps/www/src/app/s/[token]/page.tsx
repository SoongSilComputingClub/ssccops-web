import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  type ShareTargetOf,
  type ShareTargetType,
  isShareTargetType,
  toShareDescription,
} from "@ssccops/share-meta";
import { fetchSharePreview } from "@/entities/share";
import { ROUTES } from "@/shared/config/routes";
import { lmsOrigin, lmsProgramDetailPath, lmsSessionPath } from "@/shared/config/lms-routes";
import { ShareLanding } from "@/views/share-landing";

/*
 * 공유 링크 착지 페이지 (ssccops#253 · ADR-0016 · ADR-0017).
 *
 * `apps/admin/src/app/(public)/s/[token]/page.tsx`가 형판이고, **그 주석이 왜 그렇게 생겼는지가
 * 여기서도 그대로 성립한다.** 아래 넷은 옮겨 온 것이지 새로 정한 것이 아니다.
 *
 * 두 종류의 방문자가 같은 주소로 온다.
 *
 *   크롤러 → generateMetadata가 익명으로 미리보기를 받아 OG 카드를 만든다
 *   사람   → 이 화면이 그려진 뒤 클라이언트에서 실제 상세로 보낸다
 *
 * **① 서버에서 `redirect()`로 보내지 않는다.** 그러면 응답이 307이 되어 크롤러가 OG 태그가
 * 담긴 HTML을 받지 못하고 리다이렉트를 따라가 버린다 — 카드가 통째로 만들어지지 않는다.
 * 그래서 HTML을 한 번 그려 주고 이동은 브라우저에게 맡긴다.
 *
 * **② 이 경로는 인증에 걸리지 않는다 — 크롤러는 정의상 미인증이다.** 어드민에서는 미들웨어가
 * 미인증 요청을 `/login`으로 밀어내므로 `proxy.ts`의 `PUBLIC_PATHS`에 `/s`를 넣어야 했다.
 * **이 앱에는 그 목록 자체가 없다**(ssccops-web#329) — `middleware.ts`가 `updateSession`에
 * 가드를 주지 않아 리다이렉트를 아예 하지 않고, 매처도 로그인이 필요한 세 경로만 잡아 `/s`는
 * 미들웨어를 거치지도 않는다. 그 사정을 `middleware.ts`에도 적어 두었다 — 매처를 넓히면
 * 여기가 조용히 깨질 수 있는 자리라서다.
 *
 * **③ 여기서는 아무 내용도 그리지 않으므로** 인증 없이 열려 있어도 새는 것이 없다. 사람이
 * 실제로 보게 되는 lms 상세는 종전대로 그 앱이 지킨다(내 활동이 아니면 "찾을 수 없습니다").
 * **토큰은 미리보기 권한까지다**(ADR-0016) — 내용을 직접 렌더하면 권한 검사를 지나지 않는
 * 읽기 경로가 생겨 B안(열람까지 허용)을 기각한 이유가 무너진다.
 *
 * **④ `robots.txt`로 이 경로를 막지 않는다** — 슬랙 등은 robots를 존중해서 카드가 통째로 안
 * 뜨고, 토큰이 추측 불가라 검색엔진이 URL을 발견할 경로 자체가 없다. 대신 메타의
 * `robots: index:false`로 검색 색인만 막는다.
 *
 * ── 왜 이 라우트가 여기 생겼는가 (ADR-0017) ──────────────────
 * 착지 앱은 **발급하는 앱이 아니라 대상 종류가 정한다.** 운영진끼리 도는 링크(하위 업무·업무·
 * 회의)는 어드민이 받고, 부원·외부로 나가는 링크(학술·행사)를 이 앱이 받는다 — 가르는 기준은
 * "누구에게 뿌리는 링크인가"다. 라우트를 미리 만들지 않고 `ssccops#253`·`#254` 중 먼저
 * 착수하는 쪽이 만들기로 한 것은, 미리 만들면 받을 대상이 하나도 없는 라우트가 되기 때문이다.
 *
 * **행사(ssccops#254)가 그 둘째 대상이고, 여기서 처음으로 목적지가 이 앱 자신이다.** 학술은
 * 발급도 착지도 남의 앱을 거쳤지만 행사 상세(`/events/{eventId}`)는 www의 화면이라 이 라우트가
 * 남의 오리진을 알 필요가 없다 — 그 차이를 아래 `DETAIL_HREF`가 줄마다 담는다.
 *
 * ── 어드민 착지는 이 변경으로 달라지지 않는다 ────────────────
 * 저쪽 표는 `Record<ShareTargetOf<"admin">, ...>`라 www 대상이 늘어도 그 표에 들어가지 않고,
 * `detailPathOf`가 모르는 대상을 `null`로 떨어뜨려 404가 된다. **두 앱이 서로의 대상을 404로
 * 돌려보내는 것이 이 설계의 대칭이다.**
 */

/*
 * 이 앱이 받는 대상 → 사람을 보낼 주소.
 *
 * **주소는 앱이 갖고 있고 표에는 없다.** 어느 앱이 받는지는 세 앱이 함께 보는 규칙이지만,
 * 그 앱 안의 주소는 그 앱만 아는 것이다.
 *
 * `ShareTargetOf<"www">`라 **`targets.ts`에 www 착지 대상을 더하면 여기가 비어 컴파일이
 * 깨진다** — 갈 곳 없는 대상이 조용히 404가 되는 것보다 낫다. 세션(ACADEMIC_SESSION)이 한
 * 박자 늦게 들어온 것이 그 장치에 걸렸기 때문이고, 무엇이 그것을 풀었는지는
 * `packages/share-meta/src/targets.ts` 헤더에 있다.
 *
 * ── 값이 경로가 아니라 완성된 주소인 이유 ───────────────────
 * 처음(ssccops#253)에는 경로만 담고 오리진을 밖에서 한 번에 붙였다. **두 번째 대상인 행사가
 * 그 모양을 깼다** — 행사 상세는 이 앱 자신의 화면이라 붙일 오리진이 없다. 오리진을 밖에
 * 두면 "행사에는 lms 오리진을 붙이지 않는다"는 예외가 표 밖에 생기고, 대상이 늘 때마다 그
 * 예외를 기억해야 한다. 대신 각 줄이 **자기가 어디까지 아는지를 스스로 적게** 두면 예외가
 * 사라진다.
 *
 * 그래서 `null`의 뜻도 줄마다 다르다 — lms 줄은 "오리진 설정이 비었다", 이 앱 자신의 줄은
 * 애초에 `null`이 될 수 없다. 화면은 둘을 가르지 않고 안내만 그린다(`ShareLanding`).
 */
const DETAIL_HREF: Record<ShareTargetOf<"www">, (targetId: number) => string | null> = {
  /*
   * 학술 프로그램 → lms. **남의 앱이라 오리진을 설정으로 받는다**(ADR-0017 결합 ⓐ).
   * 값이 비면 `null`이고, 그때 착지 화면은 자동 이동 없이 이유만 보여 준다 — 404로 답하면
   * 사람은 "지워진 링크"로 읽고 운영진은 원인을 못 찾는다.
   */
  ACADEMIC_PROGRAM: (targetId) => {
    const origin = lmsOrigin();
    return origin ? `${origin}${lmsProgramDetailPath(targetId)}` : null;
  },
  /*
   * 회차 → lms. **이 줄이 이 표를 동기로 유지하기 위해 한 일이 있다.**
   *
   * 토큰이 주는 것은 회차 id 하나인데 lms에는 회차 상세 화면이 없어, 사람을 보내려면 활동 id가
   * 있어야 하고 그 값은 `GET /v1/academic-sessions/{sessionId}`를 불러야 나온다. **그 조회를
   * 여기서 하지 않는다** — 인증 경로인데 이 착지는 설계상 익명이라(크롤러가 닿아야 한다) 서버
   * 컴포넌트에서 부르면 크롤러가, 브라우저에서 부르면 www에 로그인하지 않은 사람이 401을
   * 받는다. www와 lms는 오리진이 달라 세션이 따로 논다.
   *
   * 대신 **해석을 목적지 앱에 맡긴다.** 여기서는 회차 id를 그대로 실은 주소 한 줄만 만들고,
   * lms의 `/studio/sessions/{sessionId}`가 자기 인증으로 활동 id를 찾아 활동 상세로 넘긴다.
   * 그래서 이 표는 프로그램·행사와 같은 모양(동기)으로 남는다 — 근거는 `lms-routes.ts`에 있다.
   */
  ACADEMIC_SESSION: (targetId) => {
    const origin = lmsOrigin();
    return origin ? `${origin}${lmsSessionPath(targetId)}` : null;
  },
  /*
   * 행사 → **이 앱 자신의 화면**(`/events/{eventId}` · ssccops#254). 남의 앱 주소를 알 필요가
   * 없는 첫 줄이라 오리진도 설정도 없다 — 같은 오리진이므로 상대 경로면 충분하다.
   *
   * 게시된 행사라면 이 주소는 익명이 그냥 열 수 있고, 게시 전이라면 이 화면이 "행사를 찾을 수
   * 없습니다"로 떨어진다. **그것이 맞다** — 토큰이 주는 것은 미리보기까지이고(ADR-0016),
   * 상세는 종전대로 게시 여부를 본다. 링크를 받은 사람이 게시 전 본문을 읽게 되면 익명에게
   * 게시 전 내용을 여는 결정이 되는데, 그것은 이 기능이 정할 일이 아니다.
   */
  EVENT: ROUTES.eventDetail,
};

/**
 * 서버가 준 대상 구분 코드 → 이 앱이 보낼 주소를 만드는 함수. 받지 않는 대상이면 `null`이다.
 *
 * 두 가지가 걸러진다. **이 웹이 모르는 대상**(서버만 먼저 배포됐다)과 **어드민이 받는
 * 대상**(ADR-0017)이다. 둘을 가르지 않는 것은 갈 곳을 모르는 링크와 죽은 링크가 사용자에게
 * 같은 것이기 때문이다.
 */
function detailHrefOf(trgtSeCd: string): ((targetId: number) => string | null) | null {
  if (!isShareTargetType(trgtSeCd)) return null;
  const hrefs = DETAIL_HREF as Partial<
    Record<ShareTargetType, (targetId: number) => string | null>
  >;
  return hrefs[trgtSeCd] ?? null;
}

export async function generateMetadata({ params }: PageProps<"/s/[token]">): Promise<Metadata> {
  const { token } = await params;
  const preview = await fetchSharePreview(token);
  if (!preview) return {};

  /*
   * 서버는 본문을 잘라서만 주고 마크다운 표식은 그대로다 — 걷어 한 줄로 줄이는 것은 카드를
   * 만드는 쪽의 규칙이고 `@ssccops/share-meta`가 그것을 갖는다.
   *
   * 요약이 없으면 서비스 설명으로 떨어진다. **상태·정원·수강 인원을 대신 채우지 않는다** —
   * 카드는 한 번 굳으므로 그 순간의 사실이 영영 남는다(ssccops#194 제약 ②).
   */
  const description = preview.summary
    ? toShareDescription(preview.summary)
    : "숭실컴퓨팅클럽(SSCC) 학술 활동입니다";

  return {
    title: preview.title,
    description,
    openGraph: {
      // og:title 에는 레이아웃의 기본 title 템플릿이 적용되지 않아 서비스 이름을 직접 붙인다
      title: `${preview.title} · SSCC`,
      description,
      type: "article",
    },
    twitter: { card: "summary", title: `${preview.title} · SSCC`, description },
    /*
     * 검색 결과에 남을 이유가 없는 주소다. OG 수집은 이 지시를 보지 않으므로 카드는 그대로
     * 만들어진다 — `robots.txt`로 막는 것과 갈리는 지점이며, 그쪽은 카드까지 함께 막는다.
     */
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }: PageProps<"/s/[token]">) {
  const { token } = await params;
  const preview = await fetchSharePreview(token);

  /*
   * 없는 토큰·폐기된 토큰·대상이 지워진 토큰이 서버에서 전부 같은 404로 오므로 여기서도
   * 가르지 않는다 — 가르면 서버가 감춘 사실(어느 토큰이 한때 존재했는가)이 화면에서 샌다.
   */
  if (!preview) notFound();

  /*
   * **이 화면은 자기 대상만 받는다.** 서버가 아는 대상을 이 앱이 모를 수도 있고(서버만 먼저
   * 배포된 경우), 알지만 어드민이 받는 대상일 수도 있다(ADR-0017) — 어느 쪽이든 여기서는 404다.
   */
  const toDetail = detailHrefOf(preview.trgtSeCd);
  if (!toDetail) notFound();

  /*
   * 주소를 만들지 못해도 404로 만들지 않는다. 링크는 살아 있고 대상도 있는데 **이 앱의 배포
   * 설정만 빠진 것**이라(lms 오리진), 404로 답하면 사람은 "지워진 링크"로 읽고 운영진은
   * 원인을 찾지 못한다. 카드는 이미 만들어졌으므로 화면은 제목과 이유만 보여 준다.
   */
  return <ShareLanding title={preview.title} href={toDetail(preview.trgtId)} />;
}
