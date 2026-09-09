/*
 * @ssccops/share-meta — 공유 카드(OG) 문구를 만드는 규칙.
 *
 * `apps/www`의 행사 entity 안에 있던 `toShareDescription`을 꺼내 왔다(ssccops#201). 공개 폼
 * 링크에도 같은 요약이 필요해졌고, 복사하면 **표식을 어디까지 걷어 내는가**가 두 벌이 되어
 * 그중 한 벌만 고쳐지는 순간 같은 본문이 앱마다 다른 카드로 나간다 —
 * `@ssccops/form-renderer`가 만들어진 이유와 같다(ssccops#136).
 *
 * ── 여기 있는 것 ────────────────────────────────────────────
 * 문자열 → 카드 문구 변환, 그리고 **공유 대상 → 착지 앱·서버 경로·문구 규칙**(`targets.ts` —
 * ssccops#250 · ADR-0017). 둘 다 의존성이 없는 순수 값·함수라 어느 앱에서든 돈다.
 *
 * 대상 규칙이 여기 온 것은 카드 문구와 같은 이유다 — **admin·www·lms가 함께 봐야 하고, 두
 * 벌이 되는 순간 같은 토큰이 앱마다 다르게 동작한다.**
 *
 * ── 여기 없는 것 ────────────────────────────────────────────
 * `Metadata` 객체 조립. 무엇을 카드에 실을지는 도메인마다 다르고(행사는 일시·장소를 앞세우고
 * 폼은 안내 문구만 싣는다), 무엇보다 **무엇을 싣지 않을지**가 도메인 판단이라 이 패키지가
 * 정할 것이 아니다.
 *
 * 착지 주소의 **오리진**도 없다. 그것은 발급하는 앱이 자기 배포 환경을 보고 고르며(ADR-0017
 * §따라오는 규칙), 이 패키지가 `process.env`를 읽으면 앱마다 다른 변수 이름을 이 패키지가
 * 알아야 한다.
 */

/**
 * Markdown 본문 → 공유 카드에 실을 한 줄 요약 (og:description).
 *
 * 카카오톡·에브리타임의 공유 카드는 두 줄 남짓만 보여 주므로 앞부분만 남긴다. 표식(`#`,
 * `**`, 링크 문법 등)을 걷어 내는 것은, 걷어 내지 않으면 공유 카드에 `## 모집 일정` 같은
 * 글자가 그대로 뜨기 때문이다. 완전한 파서가 아니라 **표기를 지우는 정도**이고, 그것으로
 * 충분한 자리다(여기서 만든 문자열은 화면에 HTML로 그려지지 않고 메타태그 값으로만 쓰인다).
 *
 * 마크다운이 아닌 평문을 넣어도 안전하다 — 표식이 없으면 공백을 정리하고 길이만 줄인다.
 */
export function toShareDescription(text: string, limit = 120): string {
  const plain = text
    .replace(/```[\s\S]*?```/g, " ") // 코드 블록
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // 이미지
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // 링크는 글자만 남긴다
    .replace(/^\s{0,3}#{1,6}\s+/gm, "") // 제목 표식
    .replace(/^\s{0,3}>\s?/gm, "") // 인용
    .replace(/^\s{0,3}([-*+]|\d+\.)\s+/gm, "") // 목록 표식
    .replace(/[*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= limit) return plain;
  return `${plain.slice(0, limit).trimEnd()}…`;
}

export {
  type ShareLandingApp,
  type ShareTargetOf,
  type ShareTargetRule,
  type ShareTargetType,
  isShareTargetType,
  shareLandingPath,
  shareTargetRule,
} from "./targets";
