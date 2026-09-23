import {
  isChoiceQitemType,
  isTextQitemType,
  type Qitem,
  type QitemCpstCn,
} from "@ssccops/form-renderer";

/*
 * 저장 전 클라이언트 검증 — 문항 구성 규칙 (#528).
 *
 * **서버(`QuestionCompositionValidator`)와 같은 규칙을 화면에서도 먼저 본다.** 서버가 최종
 * 방어선이라는 사실은 그대로지만, 400 `INVALID_QUESTION_COMPOSITION`은 **어느 문항이 문제인지**
 * 알려주지 않아 응답만으로는 화면이 짚어 줄 수 없다.
 *
 * ── 어드민 `features/form/model/form-validation.ts`에서 옮겨 왔다 ──
 * 그쪽의 `validateQitemCpst`와 규칙이 1:1이다. 앱끼리 소스를 공유하지 않으므로(AGENTS.md)
 * 옮겨 적었고, **폼 제목·접수 기간 검증은 가져오지 않았다** — 이 화면은 그 둘을 고칠 수
 * 없어서다(서버가 본문으로 받지 않는다). 그쪽의 `validateFormDraft`가 하던 일 중 여기 남는
 * 것은 문항 구성뿐이다.
 *
 * 규칙이 갈리면 이 화면에서는 통과하던 구성이 저장에서 거절된다 — 서버 검증기가 한 벌이므로
 * 두 앱의 화면 검증도 같은 규칙이어야 한다. 손볼 일이 생기면 어드민 쪽도 함께 본다.
 */

export interface QitemCpstIssues {
  /** qitemId → 그 문항에 붙일 오류 문구들 */
  qitems: Record<string, string[]>;
  /**
   * 응답이 있는 폼에서 사라진 기존 문항 ID — 서버가 409 `QUESTION_ITEM_IN_USE`로 막는다.
   *
   * 모집 폼은 접수 전에만 고칠 수 있어 정상 흐름에서는 응답이 없다. 그래도 보는 것은,
   * 접수가 막 열린 순간의 경합에서 그 상태가 될 수 있고 그때 서버 409만으로는 어느 문항이
   * 걸렸는지 화면이 말할 수 없기 때문이다.
   */
  removedInUseQitemIds: string[];
  /** 시스템이 요구해 지울 수 없는데 초안에서 사라진 문항 ID (ssccops-server#155) */
  removedSystemQitemIds: string[];
  /**
   * 저장을 막는 사유 한 줄. 비어 있으면 저장해도 된다.
   *
   * 여러 개가 걸려도 하나만 보여 준다 — 하나를 고치면 다음 것이 뜬다.
   */
  blockingMessage: string;
}

export interface QitemCpstContext {
  /** 서버에 이미 저장돼 있는 문항 ID들 */
  savedQitemIds: string[];
  /** 이 폼에 제출된 응답이 있는가 */
  hasResponses: boolean;
  /** 시스템이 요구해 지울 수 없는 문항 ID들 — 폼 상세가 준 서버의 계약 그대로다 */
  systemRequiredQitemIds: string[];
}

/** 문항 카드에 붙일 이름 — 제목이 비어 있으면 순번으로 부른다 */
function qitemLabel(index: number, qitemLblNm: string): string {
  return qitemLblNm.trim() ? `‘${qitemLblNm.trim()}’ 문항` : `${index + 1}번 문항`;
}

/*
 * 아래 `check*`는 문항 하나를 갈래별로 보는 검사들이다 — 한 함수에 있던 것을 그대로 잘라
 * 옮겼다(#660 · S3776 인지 복잡도 29). **부르는 순서가 규칙이다**: `blockingMessage`는 모인
 * 문구 중 첫 번째라, 순서를 바꾸면 같은 초안에서 다른 문장이 뜬다.
 *
 * 갈래를 가르는 조건(`isChoiceQitemType`·`SINGLE_CHOICE`…)은 각 검사가 자기 머리에서 본다 —
 * 호출부에 두면 «이 검사가 언제 도는가»가 두 자리로 갈린다.
 */

/** 문항에 오류 문구를 붙인다 — 부른 순서대로 쌓인다 */
type AddQitemIssue = (message: string) => void;

/** 식별자 — 비었거나 앞 문항과 겹치면 응답이 섞인다 */
function checkQitemId(qitem: Qitem, name: string, seen: ReadonlySet<string>, add: AddQitemIssue) {
  if (!qitem.qitemId) {
    add(`${name}: 문항 식별자가 비어 있습니다`);
  } else if (seen.has(qitem.qitemId)) {
    // 식별자 중복은 응답 데이터가 섞이는 사고다 — 저장 전에 반드시 막는다
    add(`${name}: 문항 식별자(${qitem.qitemId})가 중복입니다`);
  }
}

/** 문항이 놓인 페이지 */
function checkPageSeq(qitem: Qitem, name: string, pageCount: number, add: AddQitemIssue) {
  const pageSeq = qitem.pageSeq ?? 0;
  if (pageSeq < 0 || pageSeq >= pageCount) {
    add(`${name}: 존재하지 않는 페이지에 놓여 있습니다`);
  }
}

/** 선택지 — 선택형 문항에서만 본다 */
function checkOptionList(qitem: Qitem, name: string, add: AddQitemIssue) {
  if (!isChoiceQitemType(qitem.qitemTypeCd)) return;

  if (qitem.optionList.length === 0) {
    add(`${name}: 선택지를 1개 이상 추가하세요`);
  }
  const duplicated = qitem.optionList.filter(
    (option, i) => qitem.optionList.indexOf(option) !== i,
  );
  if (duplicated.length > 0) {
    add(`${name}: 선택지가 중복입니다 (${duplicated[0]})`);
  }
  if (qitem.optionList.some((option) => !option.trim())) {
    add(`${name}: 빈 선택지가 있습니다`);
  }
}

/** 선택지별 페이지 이동 — 단일선택에 분기가 달려 있을 때만 본다 */
function checkBranchMap(qitem: Qitem, name: string, pageCount: number, add: AddQitemIssue) {
  if (qitem.qitemTypeCd !== "SINGLE_CHOICE" || !qitem.branchMap) return;

  for (const [option, target] of Object.entries(qitem.branchMap)) {
    if (!qitem.optionList.includes(option)) {
      // 선택지를 지우면 분기도 같이 지우지만, 이름을 고친 경우 여기서 잡힌다
      add(`${name}: 없는 선택지(${option})에 분기가 남아 있습니다`);
    }
    if (!Number.isInteger(target) || target < 0 || target >= pageCount) {
      add(`${name}: ‘${option}’ 분기가 없는 페이지를 가리킵니다`);
    }
  }
}

/** 최대 선택 개수 — 다중선택에 값이 있을 때만 본다 */
function checkMaxSlctCnt(qitem: Qitem, name: string, add: AddQitemIssue) {
  if (qitem.qitemTypeCd !== "MULTI_CHOICE" || qitem.maxSlctCnt === undefined) return;

  if (qitem.maxSlctCnt < 1) {
    add(`${name}: 최대 선택 개수는 1 이상이어야 합니다`);
  } else if (qitem.maxSlctCnt > qitem.optionList.length) {
    add(
      `${name}: 최대 선택 개수(${qitem.maxSlctCnt})가 선택지 수(${qitem.optionList.length})보다 많습니다`,
    );
  }
}

/** 입력 형식 정규식 — 값이 있는 텍스트 문항에서만 본다 */
function checkPtrnCn(qitem: Qitem, name: string, add: AddQitemIssue) {
  if (!qitem.ptrnCn || !isTextQitemType(qitem.qitemTypeCd)) return;

  /*
   * 깨진 정규식이 저장되면 지원자 화면의 응답 검증이 통째로 무너진다. 컴파일 가능 여부는
   * 실제로 만들어 보는 것 말고 확인할 방법이 없다 — 서버도 `Pattern.compile()`로 같은
   * 검사를 한다.
   */
  try {
    new RegExp(qitem.ptrnCn);
  } catch {
    add(`${name}: 입력 형식 정규식이 올바르지 않습니다`);
  }
}

export function validateQitemCpst(
  qitemCpstCn: QitemCpstCn,
  context: QitemCpstContext,
): QitemCpstIssues {
  const { pages, qitems } = qitemCpstCn;
  const issues: Record<string, string[]> = {};
  /*
   * `(issues[qitemId] ??= []).push(...)` 한 줄이던 것을 푼다 (#660 · S1121 — 부분식 안의 대입).
   * 같은 문항의 문구는 부른 순서대로 쌓이고, 문항의 순서는 처음 걸린 순서다.
   */
  const add = (qitemId: string, message: string) => {
    const messages = issues[qitemId] ?? [];
    messages.push(message);
    issues[qitemId] = messages;
  };

  const seen = new Set<string>();

  qitems.forEach((qitem, index) => {
    const name = qitemLabel(index, qitem.qitemLblNm);
    const addIssue = (message: string) => add(qitem.qitemId, message);

    checkQitemId(qitem, name, seen, addIssue);
    seen.add(qitem.qitemId);

    checkPageSeq(qitem, name, pages.length, addIssue);
    checkOptionList(qitem, name, addIssue);
    checkBranchMap(qitem, name, pages.length, addIssue);
    checkMaxSlctCnt(qitem, name, addIssue);
    checkPtrnCn(qitem, name, addIssue);
  });

  const removedInUseQitemIds = context.hasResponses
    ? context.savedQitemIds.filter((qitemId) => !seen.has(qitemId))
    : [];

  const removedSystemQitemIds = context.systemRequiredQitemIds.filter(
    (qitemId) => !seen.has(qitemId),
  );

  const firstQitemIssue = Object.values(issues).flat()[0] ?? "";

  let blockingMessage = "";
  if (pages.length === 0) {
    blockingMessage = "페이지가 최소 1개 필요합니다";
  } else if (qitems.length === 0) {
    /*
     * 문항 0개는 서버 검증기가 막지 않지만 **모집 시작(`START_RECRUITMENT`)이 400
     * `FORM_HAS_NO_QUESTION`으로 막는다**(#193이 밟은 자리). 저장은 되는데 학술국장이 모집을
     * 못 여는 상태라, 저장 전에 알린다 — 승인 이관이 만든 폼이 **바로 그 상태로 태어나므로**
     * 이 화면의 첫 진입이 언제나 여기다.
     */
    blockingMessage = "문항을 1개 이상 추가해주세요";
  } else if (removedInUseQitemIds.length > 0) {
    blockingMessage = `응답이 있는 문항은 지울 수 없습니다 (${removedInUseQitemIds.join(", ")}) — 되돌리면 저장됩니다`;
  } else if (removedSystemQitemIds.length > 0) {
    blockingMessage = `시스템이 사용하는 문항은 지울 수 없습니다 (${removedSystemQitemIds.join(", ")}) — 되돌리면 저장됩니다`;
  } else if (firstQitemIssue) {
    blockingMessage = firstQitemIssue;
  }

  return {
    qitems: issues,
    removedInUseQitemIds,
    removedSystemQitemIds,
    blockingMessage,
  };
}
