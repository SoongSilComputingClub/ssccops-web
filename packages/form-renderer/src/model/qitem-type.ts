/*
 * 문항 유형 (form.qitem_cpst_cn JSONB 내부).
 *
 * 앱의 기준 코드 사전(`shared/config/codes.ts`)에서 이 블록만 떼어 왔다 — 나머지 코드값은
 * 운영 화면이 쓰는 것이지만 문항 유형은 **폼을 그리는 쪽이 반드시 아는 값**이고, 아래
 * `isTextQitemType`은 서버 `ResponseAnswerValidator.TEXT_TYPES`와 맞춰 둔 판정이라 두 벌이 되면
 * 정규식 검사 대상이 앱마다 갈린다. 어드민의 `shared/config/codes.ts`는 이것을 다시 정의하지
 * 않고 그대로 재export한다(임포트 경로를 지키기 위한 것이고, 정의는 여기 한 곳뿐이다).
 */

export type QitemTypeCd =
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "SINGLE_CHOICE"
  | "MULTI_CHOICE"
  | "DATE";

export const QITEM_TYPE_NM: Record<QitemTypeCd, string> = {
  SHORT_TEXT: "단답형",
  LONG_TEXT: "장문형",
  SINGLE_CHOICE: "단일선택",
  MULTI_CHOICE: "다중선택",
  DATE: "날짜",
};

export const QITEM_TYPE_CDS = Object.keys(QITEM_TYPE_NM) as readonly QitemTypeCd[];

/** 선택지를 갖는 문항 유형인지 */
export function isChoiceQitemType(cd: QitemTypeCd): boolean {
  return cd === "SINGLE_CHOICE" || cd === "MULTI_CHOICE";
}

/** 문항 유형 중 정규식(ptrnCn)을 가질 수 있는 것 (서버 TEXT_TYPES와 같다) */
export function isTextQitemType(cd: QitemTypeCd): boolean {
  return cd === "SHORT_TEXT" || cd === "LONG_TEXT";
}

/*
 * ══ 입력 형식 프리셋 (#698 · ssccops#516) ═══════════════════
 *
 * `apps/admin/shared/config/constants.ts` 와 `apps/lms/features/form/model/qitem-draft.ts` 에
 * **같은 표가 두 벌** 있었다. lms 쪽 주석이 그 위험을 스스로 적어 두었다 — «두 앱이 같은 폼을
 * 그리므로 프리셋이 갈리면 «어드민에서 고른 학번 형식»과 «여기서 고른 학번 형식»이 다른
 * 정규식이 된다».
 *
 * 이 패키지가 «검증 규칙을 한 벌로 두려고» 만들어졌는데(`AGENTS.md` — «앱이 한 줄이라도 다시
 * 판정하면 두 벌이 된다») **정규식만 올라오지 않았다.** 루트 `AGENTS.md` 의 «둘 이상이 같은
 * 것을 쓰게 되면 `packages/` 로 올린다» 그대로다.
 *
 * 학번 8자리는 **가입 폼의 학번 패턴과 같은 값이다**(ssccops#268) — 갈리면 가입은 통과한 사람이
 * 폼에서 거절당한다. 한쪽을 바꾸면 다른 쪽도 함께 본다.
 */
export const PATTERN_PRESETS = [
  { name: "자유 입력", pattern: "" },
  { name: "이메일", pattern: String.raw`^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$` },
  { name: "휴대전화", pattern: "^01[016-9]-[0-9]{3,4}-[0-9]{4}$" },
  { name: "숫자만", pattern: "^[0-9]+$" },
  { name: "학번(8자리)", pattern: "^[0-9]{8}$" },
] as const;

export type PatternPreset = (typeof PATTERN_PRESETS)[number];

/**
 * 저장된 문항이 이 프리셋인가 — **라벨이 아니라 정규식으로 맞춘다** (#698).
 *
 * 두 편집기가 `q.ptrnNm === p.name` 으로 맞추고 있었다. 그러면 «학번(8자리)»를 «학번»으로
 * 다듬는 순간 **이미 저장된 문항이 전부 칩 선택을 잃는다** — `ptrnCn`(정규식)은 그대로 걸려
 * 있는데 화면만 «자유 입력»으로 보이고, 그 상태로 저장하면 형식이 실제로 풀린다. 이 레포는
 * 화면 문구를 자주 다듬는다(#492 에서 42건) — **문구를 키로 쓰면 다듬을 때마다 저장값이
 * 조용히 버려진다.**
 *
 * 정규식으로 맞추면 라벨을 바꿔도 안전하고 **저장된 데이터를 옮길 필요가 없다**(`ptrnCn` 이
 * 이미 계약이다). «자유 입력»은 빈 패턴이라 «형식이 걸려 있지 않다»와 같은 뜻이다.
 */
export function matchesPatternPreset(
  preset: PatternPreset,
  ptrnCn: string | null | undefined,
): boolean {
  return preset.pattern === "" ? !ptrnCn : ptrnCn === preset.pattern;
}
