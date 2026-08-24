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
