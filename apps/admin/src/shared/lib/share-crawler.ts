/*
 * 공유 카드를 만들려고 들어오는 크롤러를 가려낸다 (ssccops#269).
 *
 * **왜 필요한가.** 미들웨어는 미인증 요청을 `/login`으로 돌려보내는데 **크롤러는 정의상
 * 미인증**이다. 그래서 `#201`이 `/f/{formId}`에 붙인 `generateMetadata`가 아예 실행되지
 * 않고, 메신저에는 로그인 화면의 기본 메타가 뜬다.
 *
 * `/s`(운영 건 공유)처럼 `/f`를 통째로 공개 경로에 넣는 길은 막혀 있다 — 넣으면 미인증
 * 응답자가 폼까지 들어와 답을 다 쓴 뒤 제출에서 튕겨 **작성한 답이 날아간다**(이미 한 번
 * 되돌린 자리다). 그래서 사람은 종전대로 로그인으로 보내고 크롤러에게만 길을 연다.
 */

/*
 * UA 문자열은 실측으로 적는다 (2026-09-06 확인).
 *
 *   카카오톡  facebookexternalhit/1.1; kakaotalk-scrap/1.0; +https://devtalk.kakao.com/t/scrap/33984
 *   LINE      facebookexternalhit/1.1;line-poker/1.0
 *   네이버    Yeti/1.0 (NHN Corp.; http://help.naver.com/robots/)
 *   슬랙      Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)
 *
 * 앞의 셋은 이름에 `bot`이 없어 일반형으로는 걸리지 않는다 — 개별로 적는 이유가 그것이다.
 *
 * **`kakaotalk`이 아니라 `kakaotalk-scrap`이다.** 카카오톡 **인앱 브라우저**의 UA에는
 * `KAKAOTALK`이 들어가는데 그쪽은 사람이다. 짧게 적으면 카카오톡에서 링크를 연 응답자가
 * 크롤러로 판정되어 폼을 열지 못한다.
 */
const CRAWLER_UA_PATTERNS = [
  // 메신저 · SNS 미리보기 — 이름에 bot이 없다
  "facebookexternalhit",
  "kakaotalk-scrap",
  "line-poker",
  "linespider",
  "yeti",
  "skypeuripreview",
  "whatsapp",
  "embedly",
  "vkshare",
  "pinterest",
  "quora link preview",
  // 일반형. `bot`은 부분 문자열로 본다 — `Googlebot`·`Twitterbot`·`Slackbot`·`Discordbot`·
  // `TelegramBot`이 전부 한 낱말이라 낱말 경계로는 걸리지 않는다.
  "bot",
  "crawler",
  "spider",
] as const;

/**
 * 공유 카드용 크롤러인가.
 *
 * 넓게 잡는 쪽을 택했다 — **틀렸을 때의 대가가 양쪽에서 다르기 때문이다.** 크롤러를 놓치면
 * 카드가 통째로 안 뜨지만(이 이슈가 고치려는 것), 사람을 크롤러로 잘못 보아도 폼 화면이
 * 뜨는 순간 `usePublicForm`의 조회가 401을 받아 `apiFetch`가 곧바로 로그인으로 보낸다 —
 * **답을 쓰기 전이라 잃을 것이 없다.** 미들웨어가 막던 것과 결과가 같고 한 박자 늦을 뿐이다.
 */
export function isSharePreviewCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return CRAWLER_UA_PATTERNS.some((pattern) => ua.includes(pattern));
}

/**
 * 크롤러에게 열어 주는 경로인가 — `/f/{formId}` **한 겹뿐이다.**
 *
 * `/f/{formId}/done`(제출 완료)은 공유되는 주소가 아니라 카드가 필요 없고, 그 아래로 경로가
 * 늘어나도 자동으로 열리지 않게 한 겹으로 못 박는다. 공개 경로 판정(`isPublicPath`)을 통째로
 * 무르지 않는 것과 같은 이유다 — 예외는 필요한 자리에만 준다.
 */
export function isCrawlableFormPath(pathname: string): boolean {
  return /^\/f\/[^/]+$/.test(pathname);
}
