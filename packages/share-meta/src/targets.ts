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
 * 정한다. `landingApp`이 `"admin"`이면 그 앱의 착지 라우트가 상세 경로를 채울 때까지 타입이
 * 맞지 않아 빌드가 깨진다(`ShareTargetOf` 참고) — 갈 곳 없는 대상이 조용히 404가 되는 것보다
 * 낫다고 보아 그렇게 뒀다.
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
