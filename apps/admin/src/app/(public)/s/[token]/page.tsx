import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { toShareDescription } from "@ssccops/share-meta";
import { fetchSharePreview } from "@/entities/share";
import { ROUTES } from "@/shared/config/routes";
import { ShareLanding } from "@/views/share-landing";

/*
 * 공유 링크 착지 페이지 (ssccops#200 · ADR-0016).
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
 * `robots.txt`로 이 경로를 막지 않는다 — 슬랙 등은 robots를 존중해서 카드가 통째로 안 뜨고,
 * 토큰이 추측 불가라 검색엔진이 URL을 발견할 경로 자체가 없다.
 */

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
   * 서버가 아는 대상 종류를 이 앱이 모를 수 있다(서버만 먼저 배포된 경우). 그때 빈 화면을
   * 그리는 대신 404로 두는 것은, 갈 곳을 모르는 링크와 죽은 링크가 사용자에게 같은 것이기
   * 때문이다.
   */
  if (preview.trgtSeCd !== "SUB_WORK") notFound();

  return <ShareLanding title={preview.title} href={ROUTES.subWorkDetail(preview.trgtId)} />;
}
