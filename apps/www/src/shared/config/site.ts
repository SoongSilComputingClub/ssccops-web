import { deployMarks } from "@ssccops/ui";
import { withoutTrailingSlash } from "@/shared/lib/origin";
import { CONTACT } from "./contact";

/*
 * 이 앱 자신의 오리진과 색인 가능 여부 (#602 · ssccops#444).
 *
 * ── 오리진 변수의 이름이 `NEXT_PUBLIC_PUBLIC_FORM_ORIGIN`인 이유 ──
 * 어드민·lms가 www를 가리키는 변수가 이것이고(ADR-0017 — 공개 폼·게시된 행사·공유 착지의
 * 절대 주소를 만든다 · 어드민 `routes.ts` `publicFormUrl` 주석에 이름의 빚이 적혀 있다) 값은
 * 배포마다 «www의 오리진» 하나다. 이 앱에도 같은 값을 넣어 자기 오리진으로 쓴다 — `NEXT_PUBLIC_
 * SITE_ORIGIN` 같은 변수를 더 두면 같은 값을 두 이름으로 세 배포에 적게 되고, 하나만 고친 채
 * 갈린 것을 아무도 못 본다. 쓰는 곳은 `metadataBase`·robots의 `Sitemap:`·sitemap의 `<loc>`·
 * JSON-LD의 `url`뿐이다(전부 절대 주소가 필요한 자리).
 *
 * **비면 `null`이다** — 요청 헤더(`host`)로 만들지 않는다. sitemap·canonical은 «이 사이트의
 * 정본 주소가 무엇인가»를 검색엔진에 말하는 값이라 요청이 어떤 호스트로 왔는지와 무관해야
 * 한다(프록시·프리뷰 도메인으로 온 요청이 그 주소를 정본이라고 선언하면 안 된다). lms의
 * OG 카드가 헤더로 origin을 만드는 것(#556)은 og:image 하나라 자리가 다르다.
 *
 * ⚠️ **이 앱의 공개 폼도 그렇게 하고 있었고, #698에서 걷었다.** 그 자리의 근거가 «이 앱에는
 * `metadataBase`가 없다»였는데 #602가 그것을 없앴다 — 즉 **근거가 사라진 뒤에도 코드가 남아**
 * 있었다. 지금은 상대 경로를 두고 `metadataBase`가 절대화한다. 위 lms 예외를 근거로 이 앱에
 * 헤더 읽기를 다시 들이지 말 것 — 그쪽 예외는 «오리진 env가 없다»에 매여 있다.
 */
export function siteOrigin(): string | null {
  return withoutTrailingSlash(process.env.NEXT_PUBLIC_PUBLIC_FORM_ORIGIN) || null;
}

/**
 * 검색엔진이 이 배포를 색인해도 되는가 — **prod이고 오리진을 아는 배포만** 참이다.
 *
 * dev(`NEXT_PUBLIC_DEPLOY_ENV=dev` · Cloudflare 워커)는 prod와 같은 콘텐츠를 다른 도메인에서
 * 그린다 — 색인되면 중복 콘텐츠이고 검색 결과에 dev 주소가 뜬다(ssccops#444의 실측: 2026-09-21
 * 세 앱 모두 robots.txt가 404라 dev.www가 색인될 수 있는 상태였다). 오리진을 모르는 배포(로컬·
 * 변수 누락)도 막는다 — sitemap의 `<loc>`을 만들 수 없고, 변수를 잊은 prod가 색인을 «잠시»
 * 잃는 쪽이 dev가 색인되는 쪽보다 되돌리기 쉽다.
 *
 * `process.env.NEXT_PUBLIC_DEPLOY_ENV`를 여기서 글자 그대로 읽는 것은 layout.tsx와 같은 이유다
 * (빌드 시 인라인 — 패키지 안에서 읽으면 빈 값이 된다). 값 없음 = prod(루트 AGENTS «함정»).
 */
export function isIndexable(): boolean {
  return process.env.NEXT_PUBLIC_DEPLOY_ENV !== "dev" && siteOrigin() !== null;
}

/** 검색엔진·구조화 데이터에 내는 동아리 이름 — 루트 메타의 기본 제목과 같은 글자 */
export const ORGANIZATION_NAME = "SSCC 숭실컴퓨팅클럽";

/*
 * 로고는 탭·홈 화면 아이콘과 같은 파일(`deployMarks().mark` · #449)이다. `process.env.NEXT_PUBLIC_
 * DEPLOY_ENV`를 여기서 글자 그대로 읽는 것은 layout.tsx와 같은 이유다(빌드 시 인라인 — 패키지
 * 안에서 읽으면 빈 값이 된다).
 */
const MARK_PATH = deployMarks(process.env.NEXT_PUBLIC_DEPLOY_ENV).mark;

/**
 * `Organization` JSON-LD (#602) — 홈이 그대로 싣고, 행사 상세가 `organizer`로 품는다.
 *
 * `url`·`logo`는 절대 주소여야 해서 오리진을 모르면 뺀다(없는 값을 만들지 않는다). `sameAs`는
 * 푸터가 그리는 SNS와 같은 값(`contact.ts`)이다 — 메일은 정해지지 않아 여기도 없다.
 */
export function organizationJsonLd(origin: string | null) {
  return {
    "@type": "Organization",
    name: ORGANIZATION_NAME,
    alternateName: "SSCC",
    ...(origin ? { url: origin, logo: `${origin}${MARK_PATH}` } : {}),
    sameAs: [CONTACT.instagram, CONTACT.github],
  };
}
