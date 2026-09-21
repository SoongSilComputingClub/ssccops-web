import { LMS_HOME_PATH, LMS_PROPOSAL_NEW_PATH } from "@/shared/config/lms-routes";
import type { BadgeTone } from "@/shared/ui";
import { PROPOSAL_SYS_FORM_CD } from "./system-form-code";
import type { ResponseStatus } from "./types";

/*
 * 응답 상태 표기.
 *
 * **코드값을 화면에 그대로 내보내지 않는다** — 라벨은 여기서만 만든다(신청 상태 배지와 같은
 * 규칙이다, `entities/application/model/display.ts`).
 *
 * 색은 그쪽 표와 맞춘다. 한 앱에서 '반려'가 화면마다 다른 색이면 사용자는 두 화면이 다른
 * 이야기를 한다고 읽는다 — 어드민은 반려에 붉은색을 쓰지만 이 앱의 팔레트에는 그 톤이 없고,
 * '내 신청'이 이미 회색으로 그리고 있다.
 */
export const RESPONSE_STATUS_BADGE: Record<
  ResponseStatus,
  { label: string; tone: BadgeTone }
> = {
  /** 아직 내지 않은 답 — 심사 축이 아니라는 것이 한눈에 보여야 해서 무채색으로 둔다 */
  DRAFT: { label: "작성 중", tone: "outline" },
  SUBMITTED: { label: "제출됨", tone: "outline-accent" },
  /*
   * 수정요청은 응답자의 차례로 넘어간 상태다 — 결론(승인·반려)도 아니고 검토를 기다리는 중도
   * 아니라, 앞뒤 어느 쪽과도 같은 색이면 목록에서 구별되지 않는다.
   */
  CHANGES_REQUESTED: { label: "수정요청", tone: "amber" },
  ACCEPTED: { label: "승인", tone: "blue" },
  REJECTED: { label: "반려", tone: "grey" },
};

/*
 * 시스템 폼 안내 (ssccops#417 · #555).
 *
 * 공개 폼 화면이 `sysFormCd`가 실린 폼을 열었을 때 문항 대신 그리는 카드의 문구와 LMS 목적지다.
 * 코드마다 갈리는 것은 제목 한 줄과 어느 화면으로 보내는가 둘뿐이라 표 하나로 둔다 —
 * LMS로 보내는 시스템 폼은 기획안 하나지만, 모르는 코드가 와도 죽은 안내가 되지 않게 기본값을
 * 갖는다(LMS 홈 — 그 앱이 역할별 상단 바로 제 자리를 찾아 준다). 신입회원 모집 지정 폼(`RECRUIT`)은
 * 이 안내에 오지 않는다 — 그 폼은 이 앱이 곧 지원서라 문항을 그린다(`answersOnWww` · #588 · ADR-0044).
 *
 * 경로만 두고 오리진은 붙이지 않는다 — 오리진은 배포 설정(`lmsOrigin()`)이고 없을 수 있다.
 * 붙이는 것은 그리는 쪽의 일이다.
 */
export interface SystemFormNotice {
  title: string;
  description: string;
  /** LMS 안의 경로 — `lmsOrigin()` 뒤에 붙인다 */
  lmsPath: string;
  /** 버튼 라벨 */
  action: string;
}

export function systemFormNotice(sysFormCd: string): SystemFormNotice {
  if (sysFormCd === PROPOSAL_SYS_FORM_CD) {
    return {
      title: "기획안은 LMS에서 냅니다",
      description: "이 링크는 기획안 폼입니다. 기획안 작성과 제출은 LMS 화면에서 합니다.",
      lmsPath: LMS_PROPOSAL_NEW_PATH,
      action: "LMS에서 기획안 제출하기",
    };
  }
  return {
    title: "이 폼은 LMS에서 냅니다",
    description: "이 링크는 LMS가 쓰는 폼입니다. 작성과 제출은 LMS 화면에서 합니다.",
    lmsPath: LMS_HOME_PATH,
    action: "LMS로 가기",
  };
}
