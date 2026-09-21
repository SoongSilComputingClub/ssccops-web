/*
 * 시스템 폼 코드(`sys_form_cd`) — 코드가 폼을 가리키는 이름들 (서버 #140 · #520 · ADR-0044).
 *
 * «시스템 폼 = 코드가 답을 읽는 폼»이던 정의가 #588(ssccops#436 · ADR-0044)에서 «코드가
 * **가리키는** 폼»으로 넓어졌다 — 계약이 있을 수도(기획안) 없을 수도(신입회원 모집) 있다.
 * 둘은 세 가지가 다르고 화면이 그 셋을 이 표 하나로 가른다:
 *
 * | | 기획안 `PROPOSAL` | 신입회원 모집 `RECRUIT` |
 * |---|---|---|
 * | 지정 | 시드가 세운다 · 옮기지 않는다 | `PUT /v1/forms/system/RECRUIT` — 학기마다 폼 상세에서 옮긴다 |
 * | 문항 | 계약(`systemRequiredQitemIds`)이 있어 잠긴다 | 자유 |
 * | 응답 | LMS 기획안 화면 | www `/f/{formKey}` — 지정 폼이 곧 지원서다 |
 *
 * 문항 잠금의 판정은 이 표가 아니라 상세 응답의 `systemRequiredQitemIds`다(계약이 있는가) —
 * 코드를 나열해 잠그면 서버가 계약을 더하거나 뺄 때 화면이 따로 바뀌어야 한다. 이 표는 화면의
 * 자리(«시스템 폼» 페이지의 고정 두 줄 · 배지 문구 · 지정 버튼의 대상)만 정한다.
 */

/** 기획안 폼 — 서버 `ProposalFormSeed.SYSTEM_FORM_CODE`와 같은 문자열 */
export const PROPOSAL_SYS_FORM_CD = "PROPOSAL";

/** 신입회원 모집 지정 폼 — 서버 `DesignatableSystemForm.RECRUIT`와 같은 문자열 (#520 · ADR-0044) */
export const RECRUIT_SYS_FORM_CD = "RECRUIT";

/**
 * «시스템 폼» 페이지가 고정으로 세우는 줄 — 순서가 곧 화면 순서다.
 *
 * 서버 목록에 없어도 줄은 선다: 기획안은 시드가 세우므로 비어 있으면 환경 문제이고, 모집은
 * 운영진이 지정을 잊은 것이라 그 빈 줄이 «지정하라»는 안내 자리가 된다(ADR-0044 «나쁜 것»).
 */
export const SYSTEM_FORM_SLOTS: readonly {
  sysFormCd: string;
  label: string;
  /** 줄 아래 한 문장 — 이 코드의 폼이 무엇을 하고 어디서 응답을 받는가 */
  description: string;
}[] = [
  {
    sysFormCd: PROPOSAL_SYS_FORM_CD,
    label: "기획안",
    description: "답을 코드가 읽어 문항이 잠겨 있습니다. 응답은 LMS 기획안 화면에서 받습니다.",
  },
  {
    sysFormCd: RECRUIT_SYS_FORM_CD,
    label: "신입회원 모집",
    description:
      "학기마다 폼 상세에서 지정합니다. 문항은 자유롭고 응답은 홍보 사이트 모집 페이지의 «지원하기»로 받습니다.",
  },
];
