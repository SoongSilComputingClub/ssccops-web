import type { FormDetail, FormSaveInput, Qitem, QitemCpstCn } from "@/entities/form";
import type { FormSttsCd } from "@/shared/config/codes";

/*
 * 폼 편집기가 들고 다니는 초안(draft) 모델과, 초안을 다루는 순수 함수들.
 *
 * 화면(views/form-edit)이 아니라 features에 두는 이유는 두 가지다.
 * - 편집기 UI는 이미 700줄에 가깝다. 여기에 자동 저장까지 얹으면 "무엇이 서버로 나가는
 *   값인지"가 JSX 사이에 흩어진다
 * - 저장 페이로드의 모양을 정하는 규칙(어떤 필드가 초안에 속하는가)은 화면이 아니라
 *   기능의 책임이다. 미리보기·복제 등 다른 화면이 같은 초안을 다룰 때 재사용된다
 *
 * `Form`(테이블 한 행 모양)을 그대로 쓰지 않는다. 편집기가 고칠 수 있는 값은 아래 5개뿐이고,
 * formId·creatrMbrId·crtDt·mdfcnDt는 서버가 정한다 — 초안에 섞어 두면 화면이 그 값을 만들어
 * 낼 수 있다는 착각이 생기고, 실제로 예전 코드는 `formId: 0`·고정 시각을 지어내고 있었다.
 */

export interface FormDraft {
  formTtlNm: string;
  /**
   * 접수 상태. **편집기는 이 값을 절대 바꾸지 않는다.**
   * 접수 시작/마감은 별도 API(ssccops-server #33 · 웹 #9)의 몫이고, 자동 저장은 서버에서
   * 받은 값을 그대로 되돌려 보내는 역할만 한다.
   */
  formSttsCd: FormSttsCd;
  rcptBgngDt: string | null;
  rcptEndDt: string | null;
  qitemCpstCn: QitemCpstCn;
  /**
   * 다중 응답 허용 (ssccops-server #143). **접수 상태와 달리 편집기가 직접 바꾸는 값이다.**
   *
   * `formSttsCd`가 초안에 있으면서도 잠겨 있는 것과 갈리는 자리다. 접수 상태는 별도 API의
   * 몫이라 되돌려 보내기만 하지만, 이쪽은 폼의 설정이라 제목·문항과 같은 축에 있다.
   */
  mltplRspnsYn: boolean;
}

/** 새 폼의 초기 초안 — 페이지 1개 + 빈 단답형 문항 1개 */
export function emptyFormDraft(): FormDraft {
  return {
    formTtlNm: "",
    formSttsCd: "DRAFT",
    rcptBgngDt: null,
    rcptEndDt: null,
    // 새 폼은 언제나 1건 폼에서 시작한다 — 여러 건을 받는 것은 명시적인 선택이다 (서버와 같다)
    mltplRspnsYn: false,
    qitemCpstCn: {
      pages: [{ pageTtl: "페이지 1", pageDescCn: "" }],
      qitems: [
        {
          qitemId: "q1",
          qitemLblNm: "",
          qitemTypeCd: "SHORT_TEXT",
          reqYn: false,
          pageSeq: 0,
          optionList: [],
        },
      ],
    },
  };
}

/**
 * 서버에서 받은 상세 → 초안.
 *
 * 페이지·문항을 얕은 복사해 둔다. 조회 결과 객체를 그대로 편집하면 같은 참조를 보고 있는
 * 다른 화면(미리보기 등)이 저장도 안 된 값을 보여 준다.
 *
 * 문항 구성이 비어 있는 폼(서버가 null을 주는 경우)이라도 페이지는 최소 1개여야 하므로
 * 여기서 채운다 — 페이지가 0개면 편집기가 아무것도 그리지 못한다.
 */
export function toFormDraft(form: FormDetail): FormDraft {
  const pages = form.qitemCpstCn.pages.map((p) => ({ ...p }));
  return {
    formTtlNm: form.formTtlNm,
    formSttsCd: form.formSttsCd,
    rcptBgngDt: form.rcptBgngDt,
    rcptEndDt: form.rcptEndDt,
    mltplRspnsYn: form.mltplRspnsYn,
    qitemCpstCn: {
      pages: pages.length > 0 ? pages : [{ pageTtl: "페이지 1", pageDescCn: "" }],
      qitems: form.qitemCpstCn.qitems.map((q) => ({ ...q })),
    },
  };
}

/** 초안 + 라벨 지정 → 저장 요청 입력 (라벨은 폼 저장 본문에 함께 나간다 — #10 합의) */
export function toFormSaveInput(draft: FormDraft, labelIds: number[]): FormSaveInput {
  return {
    formTtlNm: draft.formTtlNm,
    formSttsCd: draft.formSttsCd,
    rcptBgngDt: draft.rcptBgngDt,
    rcptEndDt: draft.rcptEndDt,
    qitemCpstCn: draft.qitemCpstCn,
    mltplRspnsYn: draft.mltplRspnsYn,
    labelIds,
  };
}

/**
 * 새 문항의 식별자.
 *
 * 예전 규칙은 `q${qitems.length + 1}`이었다. 문항 3개(q1·q2·q3)에서 q2를 지우면 길이가 2가
 * 되므로 다음 추가가 다시 q3이 되어 **살아 있는 문항과 ID가 겹친다.** qitemId는 응답 내용
 * (rspns_cn)의 key라서, 겹친 채로 저장되면 서로 다른 질문의 답이 한 칸에 섞이고 과거 응답을
 * 어느 문항의 것으로 읽어야 할지 알 수 없게 된다 — 되돌릴 수 없는 데이터 손상이다.
 *
 * 그래서 개수가 아니라 **지금 쓰이는 번호의 최대값 + 1**로 만든다. 지운 번호는 재사용하지
 * 않으므로 편집 중 어떤 순서로 지우고 더해도 겹치지 않는다. `q1` 형태가 아닌 ID(과거 데이터나
 * 다른 도구가 만든 것)는 번호 계산에서 빼고, 그렇게 만든 후보가 그래도 겹치면 뒤로 밀어 둔다.
 */
export function nextQitemId(qitems: Qitem[]): string {
  const used = new Set(qitems.map((q) => q.qitemId));

  let max = 0;
  for (const q of qitems) {
    const matched = /^q(\d+)$/.exec(q.qitemId);
    if (matched) max = Math.max(max, Number(matched[1]));
  }

  let candidate = `q${max + 1}`;
  for (let n = max + 2; used.has(candidate); n += 1) candidate = `q${n}`;
  return candidate;
}

/**
 * 최대 선택 개수 입력 파싱 결과.
 *
 * 예전 코드는 `Number(e.target.value) || undefined`였다. "0"도 "abc"도 조용히 "제한 없음"이
 * 되므로, 사용자는 자기가 넣은 값이 사라진 것을 알 수 없었다. 세 갈래를 구분해 호출부가
 * 각각 다르게 반응하게 한다 — 특히 invalid를 무시하지 않고 알린다.
 */
export type MaxSlctCntInput =
  | { kind: "empty" }
  | { kind: "number"; value: number }
  | { kind: "invalid" };

/**
 * 범위 검사는 하지 않는다. 선택지 수보다 큰 값도 일단 초안에 담고 검증(form-validation)이
 * 문구로 잡게 한다 — 입력 순간에 되돌려 버리면 "선택지를 먼저 늘리고 오세요"를 전할 자리가 없다.
 */
export function parseMaxSlctCnt(raw: string): MaxSlctCntInput {
  const value = raw.trim();
  if (value === "") return { kind: "empty" };

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return { kind: "invalid" };
  return { kind: "number", value: parsed };
}
