import type { Metadata } from "next";
import { toShareDescription } from "@ssccops/share-meta";
import { fetchPublicFormMeta, isFormRef } from "@/entities/form";
import { PublicFormPage } from "@/views/public-form";

/**
 * 공유 카드용 메타 (ssccops#201 — 카카오톡·슬랙 링크 공유).
 *
 * 신입 모집 지원서 링크가 실제로 가장 많이 공유되는 링크인데 그동안 아무 설명 없이 떴다.
 *
 * **읽는 곳이 응답자용 조회가 아니라 익명 메타 경로다.** 크롤러에는 토큰이 없고
 * `GET /v1/forms/{formId}/public`은 인증을 요구하므로(응답자는 전원 회원이다), 서버가 제목·안내
 * 문구만 내주는 `/public/v1/forms/{formId}/meta`를 따로 열었다 (ssccops-server#247).
 *
 * **접수 상태·마감일은 담지 않는다.** 메신저는 OG를 한 번 캐싱하면 갱신하지 않아 카드가 굳는다 —
 * 담으면 마감된 뒤에도 "모집 중"이라 말하는 카드가 방에 남는다(ssccops#194 제약 ②). 서버 응답에
 * 애초에 그 값이 없으므로 여기서 실수로 실을 수도 없다.
 *
 * 조회가 실패하거나 아직 접수를 연 적 없는 폼이면 **기본 메타로 조용히 떨어진다** — 여기서 404를
 * 내지 않는 것은 그 판단을 본문 쪽 한 곳에서만 하기 때문이고, 공유 카드가 밋밋한 것과 페이지가
 * 안 뜨는 것은 무게가 다르다(행사 상세 OG와 같은 자리).
 *
 * **이 앱에서는 크롤러를 따로 통과시킬 필요가 없다**(ssccops#214). 어드민에서는 미들웨어가
 * 미인증 요청을 로그인으로 돌려보내 이 함수가 아예 돌지 않았고 그래서 UA 판정이 필요했는데
 * (ssccops-web#269), 이 앱의 미들웨어는 세션 쿠키만 갱신하고 리다이렉트를 하지 않는다.
 */
export async function generateMetadata({
  params,
}: PageProps<"/f/[formId]">): Promise<Metadata> {
  const { formId } = await params;

  if (!isFormRef(formId)) return {};

  const meta = await fetchPublicFormMeta(formId);
  if (!meta) return {};

  /*
   * 안내 문구가 없으면 서비스 설명으로 떨어진다 — 제목만 있는 카드는 "무슨 폼인지"를 절반만
   * 답한다. 대체 문구를 서버가 아니라 여기서 만드는 것은 그것이 표시 규칙이기 때문이다.
   */
  const description = meta.pageDescCn
    ? toShareDescription(meta.pageDescCn)
    : "숭실컴퓨팅클럽(SSCC) 신청서입니다";

  /*
   * 카드 이미지는 요청 시점에 그리는 라우트(`/f/{ref}/og`, ssccops#361)다. og:image 는 절대
   * 주소여야 하는데 **여기서는 상대 경로만 쓴다** — 루트 레이아웃의 `metadataBase`(#602)가
   * 절대화한다.
   *
   * ── 요청 헤더로 오리진을 만들던 자리다 (#698 · ssccops#516) ──
   *
   * 그전에는 `x-forwarded-host`를 읽어 조립했고, 그 근거로 «`metadataBase`가 없다»고 적혀
   * 있었다. **그 전제가 #602 에서 없어졌다** — 이 앱은 `siteOrigin()`을 갖게 됐고 루트
   * 레이아웃이 `metadataBase`를 건다. 근거가 사라진 뒤에도 코드가 남아 있었던 것이다.
   *
   * 남겨 두면 `X-Forwarded-Host: evil.example` 을 실은 요청이 이 페이지를 가져갈 때 그 응답의
   * `og:image` 가 **남의 도메인**이 된다(링크 미리보기 서비스가 그 헤더를 넘기는 경우). 피해는
   * 그림 한 장이지만 고치는 값은 이 몇 줄이다. `apps/www/AGENTS.md` 가 «요청 헤더로 오리진을
   * 지어내지 않는다»고 적어 둔 규칙이 이 자리에만 적용되지 않고 있었다.
   *
   * **lms 는 그대로다**(`shared/lib/og-image-url.ts`) — 자기 오리진 env 가 여전히 없어 예외의
   * 근거가 살아 있다. 그쪽에 env 가 생기면 같은 이유로 함께 걷는다.
   */
  const imageUrl = `/f/${formId}/og`;

  return {
    title: meta.formTtlNm,
    description,
    openGraph: {
      // og:title 에는 레이아웃의 기본 title 이 적용되지 않아 서비스 이름을 직접 붙인다
      title: `${meta.formTtlNm} · SSCC`,
      description,
      type: "website",
      images: [{ url: imageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      // 이미지가 «있을 때만» 큰 카드였다 — 이제 언제나 있으므로 분기가 없다
      card: "summary_large_image",
      title: `${meta.formTtlNm} · SSCC`,
      description,
      images: [imageUrl],
    },
  };
}

export default async function Page({ params }: Readonly<PageProps<"/f/[formId]">>) {
  const { formId } = await params;
  return <PublicFormPage formRef={formId} />;
}
