import type {
  AnswerValue,
  Qitem,
  QitemCpstCn,
  QitemTypeCd,
  RspnsCn,
} from "@ssccops/form-renderer";

/*
 * 응답을 **문항 기준으로** 읽는 규칙 (ssccops#227).
 *
 * 지금까지 화면이 응답을 다루는 방식은 "한 건을 펼쳐 보는 것"뿐이었다(응답 상세). 표 보기는
 * 축이 반대다 — 문항이 열이고 응답자가 행이라, 여러 응답을 **같은 문항 기준으로 나란히** 세워야
 * 한다. 그 변환을 화면 컴포넌트 안에 두지 않고 여기로 뺀 것은, **같은 데이터를 보는 다른 방식이
 * 둘 더 예정돼 있기 때문이다** — CSV 내보내기(ssccops#223)와 문항별 분포(ssccops#224).
 * 셋이 각자 답을 읽으면 "다중선택을 어떻게 한 칸에 적는가" 같은 규칙이 세 벌이 되고, 그때
 * 화면의 표와 내려받은 CSV가 다른 말을 한다.
 *
 * **엔티티 레이어에 두는 이유**: 이것은 화면 표현이 아니라 `rspns_cn`(내용J)이라는 저장 형태를
 * 읽는 규칙이다. 저장 형태를 아는 것은 `@ssccops/form-renderer`와 이 엔티티이지 뷰가 아니다.
 */

/** 표의 한 열 = 문항 하나 */
export interface AnswerColumn {
  /** 응답(rspnsCn)의 key */
  qitemId: string;
  /** 열 머리글 — 문항 문구 */
  label: string;
  /** 서술형인가 — 긴 답이 올 수 있어 화면이 폭을 다르게 잡는다 */
  long: boolean;
}

/*
 * 서술형으로 볼 유형 — 장문형 하나뿐이다.
 *
 * 선택형·단답형은 답이 길어야 수십 자지만 장문형은 상한이 사실상 없다(응답 한 건 전체가
 * 10만 자까지 허용된다 · 서버 `ResponseAnswerValidator.MAX_ANSWER_TOTAL_LENGTH`). 열 폭을
 * 유형으로 미리 가르지 않으면 긴 답 하나가 표 전체를 밀어낸다.
 *
 * `QitemTypeCd`로 받는 것은 유형 어휘가 서버 `QuestionItemType`과 맞춰진 계약이기 때문이다 —
 * 문자열로 적으면 유형이 하나 늘거나 이름이 바뀔 때 타입이 잡아 주지 못하고 조용히 빗나간다.
 */
const LONG_ANSWER_TYPES: readonly QitemTypeCd[] = ["LONG_TEXT"];

/**
 * 문항 구성에서 표의 열을 만든다.
 *
 * **순서는 폼이 정한 그대로다** — 화면이 다시 정렬하지 않는다. 운영자가 편집기에서 본 순서와
 * 표의 열 순서가 다르면 "세 번째 문항"이라는 말이 두 화면에서 다른 것을 가리킨다.
 */
export function answerColumns(qitemCpstCn: QitemCpstCn | null | undefined): AnswerColumn[] {
  const qitems: Qitem[] = qitemCpstCn?.qitems ?? [];
  return qitems.map((q) => ({
    qitemId: q.qitemId,
    label: q.qitemLblNm,
    long: LONG_ANSWER_TYPES.includes(q.qitemTypeCd),
  }));
}

/**
 * 답 하나를 표의 한 칸에 적을 문자열로.
 *
 * **다중선택은 배열이고 나머지는 문자열이다**(form-renderer의 AnswerValue). 배열을 쉼표로 잇는
 * 것은 한 칸에 들어가야 하기 때문이며, CSV(ssccops#223)도 같은 자리를 쓰게 되므로 구분자를
 * 여기 한 곳에서 정한다.
 *
 * **값이 없으면 빈 문자열이다 — 대체 문구를 만들지 않는다.** 화면이 무엇을 그릴지(`-`인지 빈
 * 칸인지)는 그리는 쪽이 정하고, CSV는 빈 칸이어야 한다. 여기서 "미응답" 같은 말을 넣으면
 * 내려받은 파일에 그 말이 데이터로 들어간다.
 */
export function answerText(rspnsCn: RspnsCn | null | undefined, qitemId: string): string {
  const value: AnswerValue | undefined = rspnsCn?.[qitemId];
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.join(", ");
  return value;
}

/*
 * ⚠️ **"비워 뒀다"와 "그때는 없던 문항이다"를 구별하지 못한다** (ssccops#227의 수용 기준 중 하나).
 *
 * 서버는 빈 값(`""`·`[]`)인 key를 **저장하지 않으므로**, 응답자가 선택 문항을 비워 둔 것과
 * 그 응답 이후에 문항이 추가된 것이 `rspnsCn`에서 똑같이 "key 없음"으로 온다. 가르려면 그 응답이
 * 어느 문항 구성 버전으로 작성됐는지(`form_rspns_hstry.qitem_ver`)를 알아야 하는데 **목록·상세
 * 어느 DTO에도 그 값이 없다.**
 *
 * 그래서 이 함수는 둘을 구별하지 않고, 화면도 지어내지 않는다 — 둘 다 빈 칸이다. 서버가
 * qitem_ver를 내려주면 그때 이 자리에 판정을 더한다(그전까지 화면이 추측하면, 문항을 추가한
 * 폼에서 "응답자가 비워 뒀다"는 거짓말이 표에 박힌다).
 */
