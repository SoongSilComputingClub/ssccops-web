import type { Metadata } from "next";
import { toShareDescription } from "@ssccops/share-meta";
import { fetchPublicFormMeta } from "@/entities/form";
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

  const parsed = Number(formId);
  if (!Number.isInteger(parsed) || parsed <= 0) return {};

  const meta = await fetchPublicFormMeta(parsed);
  if (!meta) return {};

  /*
   * 안내 문구가 없으면 서비스 설명으로 떨어진다 — 제목만 있는 카드는 "무슨 폼인지"를 절반만
   * 답한다. 대체 문구를 서버가 아니라 여기서 만드는 것은 그것이 표시 규칙이기 때문이다.
   */
  const description = meta.pageDescCn
    ? toShareDescription(meta.pageDescCn)
    : "숭실컴퓨팅클럽(SSCC) 신청서입니다";

  return {
    title: meta.formTtlNm,
    description,
    openGraph: {
      // og:title 에는 레이아웃의 기본 title 이 적용되지 않아 서비스 이름을 직접 붙인다
      title: `${meta.formTtlNm} · SSCC`,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${meta.formTtlNm} · SSCC`,
      description,
    },
  };
}

export default async function Page({ params }: PageProps<"/f/[formId]">) {
  const { formId } = await params;
  return <PublicFormPage formId={Number(formId)} />;
}
