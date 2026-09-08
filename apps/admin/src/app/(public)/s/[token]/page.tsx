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
import { ShareLanding } from "@/views/share-landing";

/*
 * 공유 링크 착지 페이지 (ssccops#200 · ssccops#250 · ADR-0016 · ADR-0017).
 *
 * 두 종류의 방문자가 같은 주소로 온다.
 *
 *   크롤러 → generateMetadata가 익명으로 미리보기를 받아 OG 카드를 만든다
 *   사람   → 이 화면이 그려진 뒤 클라이언트에서 실제 상세로 보낸다
 *
 * **서버에서 `redirect()`로 보내지 않는 것이 요점이다.** 그러면 응답이 307이 되어 크롤러가
 * OG 태그가 담긴 HTML을 받지 못하고 리다이렉트를 따라가 버린다 — 카드가 통째로 만들어지지
 * 않는다. 그래서 HTML을 한 번 그려 주고 이동은 브라우저에게 맡긴다.
 *
 * **이 경로는 미들웨어의 인증 리다이렉트에서 빠져 있다**(`proxy.ts`의 PUBLIC_PATHS). 빠져
 * 있지 않으면 미인증 요청이 곧바로 /login으로 튕겨 `generateMetadata`가 아예 돌지 않고,
 * 크롤러는 정의상 미인증이다. 대신 **여기서는 아무 내용도 그리지 않으므로** 인증 없이 열려
 * 있어도 새는 것이 없다 — 사람이 실제로 보게 되는 상세 화면은 종전대로 미들웨어가 지킨다
 * (미인증이면 /login?next={상세}로 걸러져 로그인 뒤 그 자리로 돌아온다).
 *
 * **토큰은 미리보기 권한까지다**(ADR-0016). 여기서 상세 내용을 그리지 않고 원래 화면으로
 * 보내기만 하는 것이 그 결정을 지키는 방법이며, 내용을 직접 렌더하면 권한 검사를 지나지 않는
 * 읽기 경로가 생겨 B안(열람까지 허용)을 기각한 이유가 무너진다.
 *
 * 라우트를 `apps/www`가 아니라 여기에 둔 근거(2026-09-06): ① 사람이 도착할 곳이 이 앱이라
 * 공개 앱에 두면 그쪽이 어드민의 URL 구조를 알아야 한다 ② 익명 경로가 내주는 값의 범위는 어느
 * 앱이 렌더하든 서버가 정한다 — 옮겨도 새는 양은 같고 호스트 이름만 바뀐다.
 *
 * **이 화면이 받는 것은 운영진에게 뿌리는 대상뿐이다**(ADR-0017). 부원·외부로 나가는 대상
 * (학술·행사)은 `apps/www`의 같은 경로가 받으며, 그 라우트는 받을 대상이 생길 때 만든다
 * (`ssccops#253`·`#254`). 어느 앱이 받는지는 `@ssccops/share-meta`의 표가 정한다.
 *
 * `robots.txt`로 이 경로를 막지 않는다 — 슬랙 등은 robots를 존중해서 카드가 통째로 안 뜨고,
 * 토큰이 추측 불가라 검색엔진이 URL을 발견할 경로 자체가 없다.
 */

/*
 * 이 앱이 받는 대상 → 사람을 보낼 상세 경로.
 *
 * **경로는 앱이 갖고 있고 표에는 없다.** 어느 앱이 받는지는 세 앱이 함께 보는 규칙이지만,
 * 그 앱 안의 주소는 그 앱만 아는 것이다(위 ①과 같은 이유다 — 남의 URL 구조를 아는 앱을 만들지
 * 않는다). `ShareTargetOf<"admin">`이라 **표에 admin 착지 대상을 더하면 여기가 비어 컴파일이
 * 깨진다** — 갈 곳 없는 대상이 조용히 404가 되는 것보다 낫다.
 */
const DETAIL_PATH: Record<ShareTargetOf<"admin">, (targetId: number) => string> = {
  SUB_WORK: ROUTES.subWorkDetail,
  WORK: ROUTES.workDetail,
  MEETING: ROUTES.meetingDetail,
};

/**
 * 서버가 준 대상 구분 코드 → 이 앱의 상세 경로. 받지 않는 대상이면 `null`이다.
 *
 * 두 가지가 걸러진다. **이 웹이 모르는 대상**(서버만 먼저 배포됐다)과 **www가 받는
 * 대상**(ADR-0017)이다. 둘을 가르지 않는 것은 갈 곳을 모르는 링크와 죽은 링크가 사용자에게
 * 같은 것이기 때문이다.
 */
function detailPathOf(trgtSeCd: string): ((targetId: number) => string) | null {
  if (!isShareTargetType(trgtSeCd)) return null;
  const paths = DETAIL_PATH as Partial<Record<ShareTargetType, (targetId: number) => string>>;
  return paths[trgtSeCd] ?? null;
}

export async function generateMetadata({ params }: PageProps<"/s/[token]">): Promise<Metadata> {
  const { token } = await params;
  const preview = await fetchSharePreview(token);
  if (!preview) return {};

  /*
   * 서버는 본문을 잘라서만 주고 마크다운 표식은 그대로다 — 걷어 한 줄로 줄이는 것은 카드를
   * 만드는 쪽의 규칙이고 `@ssccops/share-meta`가 그것을 갖는다(ssccops#201에서 두 앱이
   * 나눠 쓰려고 올린 패키지다).
   *
   * 요약이 없으면 서비스 설명으로 떨어진다. **상태·마감일을 대신 채우지 않는다** — 카드는 한
   * 번 굳으므로 그 순간의 사실이 영영 남는다(ssccops#194 제약 ②).
   */
  const description = preview.summary
    ? toShareDescription(preview.summary)
    : "숭실컴퓨팅클럽(SSCC) 운영 업무입니다";

  return {
    title: preview.title,
    description,
    openGraph: {
      // og:title 에는 레이아웃의 기본 title 이 적용되지 않아 서비스 이름을 직접 붙인다
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
   * 배포된 경우), 알지만 www가 받는 대상일 수도 있다(ADR-0017) — 어느 쪽이든 여기서는 404다.
   */
  const toDetail = detailPathOf(preview.trgtSeCd);
  if (!toDetail) notFound();

  return <ShareLanding title={preview.title} href={toDetail(preview.trgtId)} />;
}
