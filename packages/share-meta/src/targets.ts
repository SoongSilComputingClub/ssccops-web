/*
 * 공유 대상 → 착지 앱 · 서버 경로 · 문구 (ssccops#250 · ADR-0017).
 *
 * **착지 앱은 발급하는 앱이 아니라 대상 종류가 정한다**(ADR-0017). 운영진끼리 도는 링크는
 * 운영 도메인(admin)을 가리켜도 자연스럽지만, 부원·외부로 나가는 링크는 다르다 — 가르는 기준은
 * "누구에게 뿌리는 링크인가"이지 "누가 발급했는가"가 아니다. 규칙을 발급 주체에 걸면 같은 행사를
 * admin에서 발급했는지 다른 앱에서 발급했는지에 따라 다른 링크가 나온다.
 *
 * 이 표가 `apps/admin`이 아니라 여기 있는 것은 **admin·www·lms 셋이 함께 보기 때문이다.**
 * 발급하는 쪽은 오리진을 고르려고 보고, 착지하는 쪽은 "내가 받을 대상인가"를 물으려고 본다.
 * 표가 두 벌이 되면 같은 토큰이 앱에 따라 다르게 동작한다.
 *
 * ── 대상을 더할 때 ──────────────────────────────────────────
 * 아래 `SHARE_TARGETS`에 한 줄을 더한다. 그 한 줄이 착지 앱·서버 경로·오류 문구를 한꺼번에
 * 정한다. **그 앱의 착지 라우트가 상세 경로를 채울 때까지 타입이 맞지 않아 빌드가 깨진다**
 * (`ShareTargetOf` 참고) — 갈 곳 없는 대상이 조용히 404가 되는 것보다 낫다고 보아 그렇게 뒀다.
 * `landingApp`이 `"www"`인 줄을 더하면 `apps/www`의 착지 라우트가, `"admin"`이면
 * `apps/admin`의 것이 깨진다.
 *
 * ── 늦게 들어온 대상: 세션(ACADEMIC_SESSION) ────────────────
 * `ssccops#253`은 프로그램과 세션 둘을 함께 열기로 했지만 **세션 줄만 한 박자 늦게 들어왔다.**
 * 위 장치가 실제로 막아 세운 자리라 경위를 남긴다.
 *
 * 처음에는 넣을 수 없었다 — 넣는 순간 `apps/www`의 착지 라우트가 "이 세션을 사람에게 어디로
 * 보낼 것인가"를 채워야 하는데, 토큰이 들고 오는 것은 `trgt_id` **하나**(세션 id)인 반면 당시
 * 세션을 읽는 서버 경로도 세션 공유 경로도 **활동 id를 함께 요구했다.** 억지로 넣었다면 카드는
 * 펼쳐지는데 눌렀을 때 갈 곳이 없는 링크가 나갔을 것이고, 그것이 이 표가 막으려 세운 바로 그
 * 상태다 — 컴파일이 깨지는 장치가 제 일을 한 것이라 우회하지 않았다.
 *
 * 풀린 것은 **서버가 세션을 자기 PK 하나로 서는 자원으로 세우면서**다. `ssccops-server#316`이
 * `GET /v1/academic-sessions/{sessionId}`를 열어 응답에 활동 id를 실었고, 이어서 `#319`가 공유
 * 세 메서드도 `/v1/academic-sessions/{sessionId}/share`로 옮겼다(중첩 경로는 없어졌다).
 *
 * **그래서 `apiPath`의 `(targetId: number) => string`이 그대로 성립한다.** 시그니처를 넓혀
 * 대상마다 식별자가 몇 개 필요한지를 이 표가 알게 되는 길을 택하지 않은 것이 여기서 값을
 * 한다 — 대상을 더할 때 한 줄만 는다는 위 규칙이 여섯 번째 대상에서도 지켜졌다.
 */

/** 링크를 받는 앱 */
export type ShareLandingApp = "admin" | "www";

export interface ShareTargetRule {
  /**
   * 오류 문구에 넣는 대상 이름. `codes.ts`의 코드 표시명과 달리 **서버 시드와의 계약이 아니라
   * 화면 문구**라 여기서 정한다.
   */
  label: string;
  /**
   * 이 대상을 읽을 때 서버가 요구하는 권한 — 이름과 코드를 함께 적는다.
   * 권한 오류 문구가 "무엇이 필요한지"를 밝혀야 하기 때문이다(웹 AGENTS.md §화면 문구).
   */
  readAuthority: string;
  landingApp: ShareLandingApp;
  /**
   * 발급·조회·폐기가 함께 쓰는 서버 경로. 지금은 세 메서드가 대상별 컨트롤러 안에 있어 경로도
   * 대상별이다 — 그 모양을 하나로 모을지는 두 번째 대상이 붙어 봐야 알 수 있어(`ssccops#251`)
   * 여기서는 **경로를 한 곳에 모아 두기만 한다.** 서버가 모양을 바꾸면 이 표만 고친다.
   */
  apiPath: (targetId: number) => string;
}

/*
 * `as const satisfies`로 적는 것은 `landingApp`의 리터럴 타입을 살려 두기 위해서다 —
 * `ShareTargetOf`가 그것으로 "어느 앱이 받는 대상인가"를 타입 수준에서 가른다.
 */
const SHARE_TARGETS = {
  SUB_WORK: {
    label: "하위 업무",
    readAuthority: "업무 조회(WORK_READ)",
    landingApp: "admin",
    apiPath: (targetId: number) => `/v1/sub-works/${targetId}/share`,
  },
  /*
   * 업무 (ssccops#251 · ssccops-server#306). 하위 업무의 부모라 받는 사람이 같다 —
   * 운영진끼리 도는 링크이므로 admin이 받는다(ADR-0017의 표 그대로다).
   *
   * 권한이 하위 업무와 같은 `WORK_READ`인 것은 서버가 그렇게 가르기 때문이다. 업무와 하위
   * 업무는 조회 권한을 나눠 갖지 않는다 — 볼 수 있는 사람이 공유할 수 있다는 판단도 같다.
   */
  WORK: {
    label: "업무",
    readAuthority: "업무 조회(WORK_READ)",
    landingApp: "admin",
    apiPath: (targetId: number) => `/v1/works/${targetId}/share`,
  },
  /*
   * 회의 (ssccops#252 · ssccops-server#310). 운영진끼리 "이번 주 회의 이거야"를 던지는
   * 링크라 admin이 받는다(ADR-0017).
   *
   * 권한이 `MEETING_READ`인 것은 서버가 회의를 그것으로 가르기 때문이다 — 업무 계열과 달리
   * 회의는 자기 조회 권한을 따로 갖는다(`MeetingController`의 `@RequireAuthority`, 시드의
   * `authrt` 표시명이 "회의 조회"다). 발급도 조회 권한만 요구한다: 토큰이 주는 것이 미리보기
   * 까지라 볼 수 있는 사람이 공유할 수 있다는 판단이 업무와 같다(ADR-0016).
   *
   * 이슈 본문(`ssccops-web#334`)의 예시는 업무 줄을 복사해 `WORK_READ`로 적혀 있었다. 이
   * 값은 권한 오류 문구에만 쓰이는 문자열이라, 틀린 권한 이름을 그대로 두면 화면이 사용자에게
   * 받을 수 없는 권한을 요구하게 된다.
   */
  MEETING: {
    label: "회의",
    readAuthority: "회의 조회(MEETING_READ)",
    landingApp: "admin",
    apiPath: (targetId: number) => `/v1/meetings/${targetId}/share`,
  },
  /*
   * 학술 프로그램 (ssccops#253 · ssccops-server#311). **첫 www 착지 대상이다.**
   *
   * 여기서 처음으로 **발급하는 앱과 받는 앱이 갈린다** — 발급은 lms(스터디장이 자기 활동
   * 상세에서 누른다), 착지는 www다(ADR-0017). 받는 사람이 운영진이 아니라 부원이라 링크가
   * 운영 도메인을 가리키면 안 되고, 그 판단이 발급 주체가 아니라 대상에 걸려 있다는 것이
   * 이 한 줄로 드러난다.
   *
   * ── 권한 문구는 서버가 머지된 뒤 고쳤다 (ssccops-server#311) ─
   * `ssccops-web#337`은 서버에 PR이 없던 시점이라 *"활동 스터디장·팀장 본인 또는
   * ACADEMIC_PROGRAM_MANAGE"*로 **가정해 적었는데, 머지된 서버는 그렇지 않다** — 발급에
   * 권한 코드를 걸지 않고 인증만 요구한다.
   *
   * 서버가 든 근거가 그 가정을 정확히 뒤집는다. 업무가 `WORK_READ`를 요구한 이유는 *"볼 수
   * 있는 사람이 공유할 수 있다"*인데 **학술에는 그 짝이 되는 조회 권한이 없고**(활동 상세·
   * 목록·커리큘럼 조회 셋이 인증만 요구한다), `ACADEMIC_PROGRAM_MANAGE`는 조회의 짝이 아니라
   * 국장 전용 쓰기(전이·회차 승인)의 권한이다. 그것을 걸면 **정작 뿌릴 사람이 막힌다** —
   * 스터디장·팀장은 권한 코드를 갖지 않고 활동 소유자인지로만 판정되는데, 부원에게 링크를
   * 뿌리는 당사자가 바로 그 사람이다.
   *
   * 이 값은 권한 오류 안내에만 쓰이므로 고치는 비용이 한 줄이다 — `#337`이 *"서버가 다르게
   * 정하면 고칠 곳은 이 표뿐"*이라고 적어 둔 그 한 줄이 여기다.
   */
  ACADEMIC_PROGRAM: {
    label: "학술 프로그램",
    readAuthority: "활동 조회(로그인한 회원)",
    landingApp: "www",
    apiPath: (targetId: number) => `/v1/academic-programs/${targetId}/share`,
  },
  /*
   * 회차 (ssccops#253 · ssccops-server#311 · #319). 헤더의 "늦게 들어온 대상"이 이 줄이다.
   *
   * ── 프로그램과 묶지 않는다 ─────────────────────────────────
   * 모집을 뿌리는 것과 이번 주 회차를 뿌리는 것은 시점도 받는 사람도 다르다. 묶으면 대상 ID가
   * 무엇을 가리키는지가 다시 갈리므로 서버도 대상을 둘로 나눴다(`ShareTargetType`).
   *
   * ── 경로가 활동 밑이 아니다 ────────────────────────────────
   * `/v1/academic-sessions/{sessionId}/share`는 `ssccops-server#319`가 공유 세 메서드를 최상위로
   * 옮긴 결과이고, **중첩 경로는 없어졌다.** 그전에는 활동 id를 함께 요구해 이 표의 `apiPath`
   * 한 인자로 적을 수 없었다.
   *
   * ── 권한이 프로그램과 갈리지 않는다 ────────────────────────
   * 서버가 회차 조회·공유 어느 쪽에도 권한 코드를 걸지 않고 인증만 요구한다 — 회차 상세가
   * 인증만으로 열려 있어 *"볼 수 있는 사람이 공유할 수 있다"*(ADR-0016)를 그대로 옮기면
   * 여기서는 로그인까지가 된다.
   */
  ACADEMIC_SESSION: {
    label: "회차",
    readAuthority: "회차 조회(로그인한 회원)",
    landingApp: "www",
    apiPath: (targetId: number) => `/v1/academic-sessions/${targetId}/share`,
  },
  /*
   * 행사 (ssccops#254 · ssccops-server#312 · PR #315). 착지는 www다 — 행사를 뿌리는 대상이
   * 동아리 밖이라 링크가 운영 도메인을 가리키면 안 된다(ADR-0017).
   *
   * ── 이 줄이 앞의 넷과 다른 점: 발급이 상태를 본다 ──────────
   * 서버는 **게시 전(DRAFT) 행사에만 토큰을 내준다.** 게시·보관된 행사에 오는 발급 요청은
   * 409 `EVENT_SHARE_NOT_DRAFT`다. 게시된 행사에는 이미 익명이 여는 주소(`/events/{id}`)가
   * 있어 토큰이 더하는 것은 폐기 기능뿐인데, 그 폐기가 원본 공개 URL을 막지 못한다 —
   * "공유를 중지했다"는 표시가 사실이 아니게 되는 버튼이 되므로 서버가 아예 내주지 않는다.
   *
   * **조회·폐기는 상태를 보지 않는다.** 게시 전에 발급한 링크는 게시 뒤에도 살아 있고, 그때
   * 화면이 그것을 보지 못하면 폐기할 수단이 없어진다. 그래서 이 표의 `apiPath` 하나가 세
   * 메서드에 그대로 쓰이는 것은 앞의 넷과 같고, **갈리는 것은 화면이 발급을 부를지 말지다**
   * (`apps/admin`의 `EventShareButton`).
   *
   * 그 분기를 이 표에 담지 않은 것은 표가 "어느 앱이 받는가 · 어디로 부르는가"만 정하기
   * 때문이다. 대상의 상태를 아는 것은 그 대상을 그리는 화면이고, 표는 상태를 모른다.
   */
  EVENT: {
    label: "행사",
    readAuthority: "행사 관리(EVENT_MANAGE)",
    landingApp: "www",
    apiPath: (targetId: number) => `/v1/events/${targetId}/share`,
  },
} as const satisfies Record<string, ShareTargetRule>;

/** 서버 `shr_lnk.trgt_se_cd`가 쓰는 대상 구분 코드 */
export type ShareTargetType = keyof typeof SHARE_TARGETS;

const SHARE_TARGET_TYPES = Object.keys(SHARE_TARGETS) as ShareTargetType[];

/**
 * 어떤 앱이 받는 대상인가 — 타입 수준.
 *
 * 착지 라우트가 `Record<ShareTargetOf<"admin">, ...>`로 상세 경로 표를 적으면, 위 표에
 * admin 착지 대상을 더한 순간 **그 라우트가 컴파일되지 않는다.** 사람이 기억해야 할 일을
 * 하나 줄인다.
 */
export type ShareTargetOf<A extends ShareLandingApp> = {
  [K in ShareTargetType]: (typeof SHARE_TARGETS)[K]["landingApp"] extends A ? K : never;
}[ShareTargetType];

/**
 * 서버가 준 문자열이 이 웹이 아는 대상인가.
 *
 * **모르는 값이 올 수 있다** — 서버만 먼저 배포되면 새 대상이 이 앱보다 앞선다. 그때 화면은
 * 404로 떨어져야 하며(갈 곳을 모르는 링크와 죽은 링크는 사용자에게 같은 것이다), 이 함수가
 * 그 판정의 유일한 통로다.
 */
export function isShareTargetType(value: string): value is ShareTargetType {
  return (SHARE_TARGET_TYPES as string[]).includes(value);
}

/** 대상 규칙. 타입으로 걸러진 값만 받으므로 없는 대상이 들어올 수 없다 */
export function shareTargetRule(targetType: ShareTargetType): ShareTargetRule {
  return SHARE_TARGETS[targetType];
}

/**
 * 착지 주소의 경로 부분. 오리진은 발급하는 앱이 고른다(ADR-0017 §따라오는 규칙).
 *
 * 세 앱이 같은 `/s/{token}`을 쓰는 것은 우연이 아니라 규칙이다 — 토큰만 보고 어느 앱으로
 * 보낼지 정할 뿐, 경로가 갈리면 착지 화면을 옮길 때마다 이미 나간 링크가 죽는다.
 */
export function shareLandingPath(token: string): string {
  return `/s/${encodeURIComponent(token)}`;
}
