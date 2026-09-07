import { isChoiceQitemType } from "@ssccops/form-renderer";
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

/* ── 문항별 분포 (ssccops#224) ─────────────────────────────────────────────
 *
 * 표(#227)와 축이 또 다르다. 표는 응답 하나를 가로로 읽고 분포는 문항 하나를 세로로 읽는다 —
 * 같은 `rspns_cn`을 보지만 묻는 것이 "이 사람이 뭐라 답했나"가 아니라 "이 선택지를 몇 명이
 * 골랐나"다. 그래서 `answerText`를 쓸 수 없다: 그쪽은 다중선택을 쉼표로 이어 **한 칸의 문자열**로
 * 만드는데, 세는 쪽은 이어 붙이기 전의 값 하나하나가 필요하다.
 *
 * 그래도 같은 파일에 두는 이유는 둘이 **같은 저장 형태를 읽는 규칙**이기 때문이다. 다중선택이
 * 배열이라는 것, 빈 값인 key가 아예 저장되지 않는다는 것 — 그 사실을 아는 자리가 갈리면
 * 표와 분포가 같은 폼에서 다른 말을 한다.
 */

/** 선택지 하나의 집계 */
export interface DistributionBucket {
  label: string;
  count: number;
  /**
   * 폼이 지금 선언하고 있는 선택지인가.
   *
   * 운영자가 접수를 연 뒤 선택지를 지우면 **그 선택지를 고른 답은 그대로 남는다**. 버리면
   * 합이 응답자 수와 어긋나고, 그 어긋남은 화면에서 설명되지 않는다 — 그래서 선언 목록 뒤에
   * 이어 붙이고 지워진 것임을 표시한다.
   */
  declared: boolean;
}

/** 문항 하나의 집계 */
export interface QitemDistribution {
  qitemId: string;
  label: string;
  typeCd: QitemTypeCd;
  /** 선택지별 집계를 그릴 수 있는 문항인가 */
  choice: boolean;
  /** 한 사람이 여럿 고를 수 있는가 — 비율의 합이 100%를 넘을 수 있다 */
  multi: boolean;
  /**
   * 이 문항에 답한 사람 수 — **비율의 분모다.**
   *
   * 분모를 '전체 응답자'로 두지 않는 것이 이 설계의 요점이다. 서버는 빈 값인 key를 저장하지
   * 않고 응답이 어느 문항 구성 버전으로 작성됐는지도 내려주지 않으므로(`qitem_ver`), 답이 없는
   * 것이 **비워 둔 것인지 그때는 없던 문항인지 가릴 수 없다**(같은 파일 아래 경고). 전체를
   * 분모로 삼으면 나중에 추가된 문항의 비율이 실제보다 낮게 나오고, 그것은 화면이 지어낸
   * 거짓이다. '답한 사람 중 몇 %'는 어느 경우에도 참이다.
   */
  answeredCount: number;
  /** 선택형만 채워진다. 선언 순서 그대로이고 **0인 선택지도 남는다** */
  buckets: DistributionBucket[];
}

/**
 * 한 응답의 답 하나를 **고른 값들**로 편다.
 *
 * 다중선택은 배열, 나머지는 문자열이다. 같은 값이 두 번 들어 있어도 한 사람은 한 번만 센다 —
 * 묻는 것이 "몇 번 골렸나"가 아니라 "몇 명이 골랐나"이기 때문이다.
 */
function selectedValues(value: AnswerValue | undefined): string[] {
  if (value === undefined || value === null) return [];
  const list = Array.isArray(value) ? value : [value];
  return [...new Set(list.filter((v) => v !== ""))];
}

/**
 * 문항 구성과 응답 전량에서 문항별 집계를 만든다.
 *
 * **문항 순서는 폼이 정한 그대로다** — `answerColumns`와 같은 규칙이며, 표와 분포에서 "세 번째
 * 문항"이 다른 것을 가리키지 않게 한다.
 */
export function answerDistributions(
  qitemCpstCn: QitemCpstCn | null | undefined,
  rspnsCns: readonly (RspnsCn | null | undefined)[],
): QitemDistribution[] {
  const qitems: Qitem[] = qitemCpstCn?.qitems ?? [];

  return qitems.map((q) => {
    const choice = isChoiceQitemType(q.qitemTypeCd);

    /*
     * 선언된 선택지를 0으로 먼저 깔아 둔다 — 아무도 고르지 않은 선택지가 목록에서 사라지면
     * "그런 선택지가 없었다"로 읽힌다. Map이라 삽입 순서가 유지되고, 나중에 나타나는 선언 밖
     * 값은 자연히 뒤에 붙는다.
     */
    const counts = new Map<string, number>();
    if (choice) for (const option of q.optionList) counts.set(option, 0);

    let answeredCount = 0;
    for (const rspnsCn of rspnsCns) {
      const selected = selectedValues(rspnsCn?.[q.qitemId]);
      if (selected.length === 0) continue;
      answeredCount += 1;
      if (!choice) continue;
      for (const value of selected) counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    const declared = new Set(q.optionList);
    return {
      qitemId: q.qitemId,
      label: q.qitemLblNm,
      typeCd: q.qitemTypeCd,
      choice,
      multi: q.qitemTypeCd === "MULTI_CHOICE",
      answeredCount,
      buckets: choice
        ? [...counts].map(([label, count]) => ({
            label,
            count,
            declared: declared.has(label),
          }))
        : [],
    };
  });
}
