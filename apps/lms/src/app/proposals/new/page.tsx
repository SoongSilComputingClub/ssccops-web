import type { Metadata } from "next";
import { ogImageUrl } from "@/shared/lib/og-image-url";
import { ProposalNewPage } from "@/views/proposal-new";

/**
 * /proposals/new — 기획안 신규 작성 (#185).
 *
 * `app/`은 라우팅 전용이다 — 뷰(`views/proposal-new`)를 얇게 감싼다. 주소에 폼 번호가 없다
 * (`sys_form_cd = 'PROPOSAL'`이 가리키는 시스템 폼을 화면이 코드로 찾는다 · `routes.ts`).
 *
 * 로그인 본인의 데이터라 캐시하지 않는다(`shared/api/client.ts`가 no-store).
 *
 * **공유 카드는 «기획안 제출» 카드**(#556 · ssccops#418) — 학기 초마다 부원 전체에게 뿌리는
 * 링크라 앱 기본 카드(«SSCC 학술»)가 아니라 이 화면의 이름을 단 그림이 떠야 한다. og:title에는
 * 레이아웃의 title 템플릿이 적용되지 않으므로 서비스 이름을 직접 붙이고, `openGraph`는 세그먼트
 * 단위로 통째 덮이므로 siteName·type·locale을 레이아웃과 같은 값으로 다시 적는다.
 * 카드 이미지는 요청 시점에 그리는 라우트(`/og?card=proposal`)이고 주소는 요청 헤더의
 * origin으로 만든다(`ogImageUrl` 주석). 접수 기간은 카드에도 설명에도 싣지 않는다(ssccops#194).
 */
export async function generateMetadata(): Promise<Metadata> {
  const title = "기획안 제출";
  const description = "스터디·프로젝트 기획안을 내고 학술국 검토를 받습니다";
  const imageUrl = await ogImageUrl("proposal");

  return {
    title: "기획안 작성",
    description,
    openGraph: {
      title: `${title} · SSCC 학술`,
      description,
      siteName: "SSCC 학술",
      type: "website",
      locale: "ko_KR",
      images: imageUrl ? [{ url: imageUrl, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: `${title} · SSCC 학술`,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default function Page() {
  return <ProposalNewPage />;
}
