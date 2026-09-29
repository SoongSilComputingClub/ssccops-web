import { ROUTES } from "./routes";

/*
 * 하위 내비 — 두 축(소개 · 모집) 안의 탭 줄 (#524 · ssccops#385 · #723).
 *
 * #520이 하위 페이지(연혁·핵심 가치·역대 운영진·FAQ·지난 모집)를 만들었지만 가는 길이 없었다 —
 * 상단 바는 축 하나에 항목 하나라 `/about/history`는 주소를 아는 사람만 열 수 있었다. 이 표가
 * 페이지 제목 아래 탭 줄이 되어 그 길을 준다. 기록 축은 분류 탭(`views/records`)이 이미 있어
 * 여기 없고, 법적 페이지(개인정보처리방침·사진 게재 안내·이용약관)는 축이 아니라 탭이 없다.
 *
 * 상단 바 항목(`app/_shell/nav-links.ts`)과 같은 모양(`href`·`label`·`isActive`)이다. 둘을
 * 한 표로 합치지 않은 것은 상단 바가 클라이언트 컴포넌트(경로로 켜기)이고 탭 줄은 서버
 * 컴포넌트가 자기 주소를 넘겨 그리기 때문이다 — 같은 표를 양쪽에서 읽으면 어느 쪽이 정본인지
 * 흐려진다.
 *
 * **이 표가 곧 상단 바 드롭다운이다** (#712 · ADR-0056 · #723). `app/_shell/nav-links.ts`의
 * «소개»·«모집» 축이 여기 `about`·`join`을 **그대로** `children`으로 쓴다 — 둘의 역할은 갈리지만
 * (드롭다운은 **착지 전의 길**, 탭 줄은 **착지한 뒤의 현재 위치**) **목록은 하나다.**
 *
 * #712에서는 드롭다운에만 «운영진»·«문의»를 뒤에 붙였는데, 그래서 착지하면 길이 오히려 줄었다 —
 * 드롭다운으로 «운영진»에 간 사람이 그 화면에서 «문의»가 같은 축인 줄 알 수 없었다. 붙이는 자리를
 * 없애고 표를 다섯으로 만든 것이 #723이다.
 *
 * #524에서는 드롭다운을 기각했었다 — «드로어에 2단을 열고 닫는 상태가 생기고, 데스크톱에서는
 * 마우스를 올려야 하위가 보인다». 뒤엣것이 탭 줄에도 그대로 남아 있었고(축에 가 보기 전에는
 * 하위가 있는지 모른다) 앞엣것은 드로어를 **펼친 채** 그려 없앴다. 그 판단의 정본은 ADR-0056이다.
 */
/*
 * `me`(내 활동 · #574 · ssccops#428)는 콘텐츠 축이 아니라 로그인한 부원의 화면이지만 같은 탭 줄을
 * 쓴다 — 허브 `/me` 아래 내부 페이지 넷(신청한 행사 · 낸 폼 · 낸 기획안 · 이끄는 프로그램)으로
 * 가는 길이고, lms `/my/applications`처럼 «내 것»을 종류별로 한 장씩 보는 모양이다.
 */
export type SectionAxis = "about" | "join" | "me";

export interface SectionTab {
  href: string;
  label: string;
  /** 지금 주소가 이 탭인가 */
  isActive: (pathname: string) => boolean;
}

export const exact = (href: string) => (pathname: string) => pathname === href;

const startsWith = (prefix: string) => (pathname: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export const SECTION_TABS: Record<SectionAxis, readonly SectionTab[]> = {
  /*
   * 소개 축은 다섯이다 (#723) — 운영진·문의가 #712에서 이 축으로 들어왔다.
   *
   * **«운영진»만 접두 판정이다.** 역대 대수(`/operators/44`)는 그 문서의 과거 판본이라 그 주소에서도
   * 같은 탭이 켜져야 한다. 나머지는 하위 주소가 없어 정확히 일치면 된다.
   *
   * 옛 «운영진» 축(«지금» + 게시된 대수 «44대»·«43대»…)은 걷었다 — 대수는 축의 자매 페이지가
   * 아니라 문서의 과거 판본이고, 게시된 페이지 수만큼 자라 학기마다 탭 줄이 길어졌다. 지금은
   * 운영진 문서 **아래**에 목록으로 선다(`views/content-page/ui/operator-cohorts.tsx`).
   */
  about: [
    { href: ROUTES.about, label: "소개", isActive: exact(ROUTES.about) },
    { href: ROUTES.aboutHistory, label: "연혁", isActive: exact(ROUTES.aboutHistory) },
    { href: ROUTES.aboutValues, label: "핵심 가치", isActive: exact(ROUTES.aboutValues) },
    { href: ROUTES.operators, label: "운영진", isActive: startsWith(ROUTES.operators) },
    { href: ROUTES.contact, label: "문의", isActive: exact(ROUTES.contact) },
  ],
  join: [
    { href: ROUTES.join, label: "안내", isActive: exact(ROUTES.join) },
    { href: ROUTES.joinFaq, label: "FAQ", isActive: exact(ROUTES.joinFaq) },
    { href: ROUTES.joinHistory, label: "지난 모집", isActive: exact(ROUTES.joinHistory) },
  ],
  /*
   * 내 활동 — 허브는 «요약». 상태 필터(`?status=`)가 붙어도 같은 탭이 켜지도록 `exact`는
   * pathname만 본다(쿼리는 `pathname`에 실리지 않는다).
   */
  me: [
    { href: ROUTES.me, label: "요약", isActive: exact(ROUTES.me) },
    {
      href: ROUTES.meApplications,
      label: "신청한 행사",
      isActive: exact(ROUTES.meApplications),
    },
    { href: ROUTES.meResponses, label: "낸 폼", isActive: exact(ROUTES.meResponses) },
    { href: ROUTES.meProposals, label: "낸 기획안", isActive: exact(ROUTES.meProposals) },
    { href: ROUTES.mePrograms, label: "이끄는 프로그램", isActive: exact(ROUTES.mePrograms) },
  ],
};
