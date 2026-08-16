import { isChoiceQitemType, type QitemTypeCd } from "@/shared/config/codes";
import type { FormDraft } from "./form-draft";

/*
 * 저장 전 클라이언트 검증.
 *
 * **서버(ssccops-server #32 QuestionCompositionValidator)와 같은 규칙을 화면에서도 먼저 본다.**
 * 서버가 최종 방어선이라는 사실은 그대로지만, 자동 저장은 사용자가 저장 버튼을 누르지 않아도
 * 계속 요청을 보내므로 여기서 걸러 주지 않으면 잘못된 구성으로 400을 반복해 왕복하게 된다.
 * 게다가 400은 "어느 문항이 문제인지"를 아직 서버가 알려주지 않기로 돼 있어(#32 미확정),
 * 응답만으로는 화면이 문제 지점을 짚어 줄 수 없다.
 *
 * 검증이 걸리면 자동 저장을 **보류**한다. 보내 봐야 거절당할 요청이고, 실패로 표시하면
 * 사용자는 서버 장애로 오해한다 — 대신 "무엇을 고치면 저장되는지"를 문구로 남긴다.
 */

/** 문항 유형 중 정규식(ptrnCn)을 가질 수 있는 것 */
export function isTextQitemType(cd: QitemTypeCd): boolean {
  return cd === "SHORT_TEXT" || cd === "LONG_TEXT";
}

export interface FormDraftIssues {
  /** 기본정보 인라인 오류 (빈 문자열이면 정상) */
  formTtlNm: string;
  rcptDt: string;
  /** qitemId → 그 문항에 붙일 오류 문구들 */
  qitems: Record<string, string[]>;
  /**
   * 응답이 있는 폼에서 사라진 기존 문항 ID.
   * 서버가 409 QUESTION_ITEM_IN_USE로 막으므로 저장을 시도하기 전에 알린다.
   */
  removedInUseQitemIds: string[];
  /**
   * 자동 저장을 보류시키는 사유 한 줄. 비어 있으면 저장해도 된다.
   * 여러 개가 걸려도 하나만 보여 준다 — 상태 표시줄은 한 줄이고, 하나를 고치면 다음 것이 뜬다.
   */
  blockingMessage: string;
}

export interface FormDraftContext {
  /** 서버에 이미 저장돼 있는 문항 ID들 (신규 폼이면 빈 배열) */
  savedQitemIds: string[];
  /** 이 폼에 제출된 응답이 있는가 */
  hasResponses: boolean;
}

/** 문항 카드에 붙일 이름 — 제목이 비어 있으면 순번으로 부른다 */
function qitemLabel(index: number, qitemLblNm: string): string {
  return qitemLblNm.trim() ? `‘${qitemLblNm.trim()}’ 문항` : `${index + 1}번 문항`;
}

export function validateFormDraft(
  draft: FormDraft,
  context: FormDraftContext,
): FormDraftIssues {
  const { pages, qitems } = draft.qitemCpstCn;
  const issues: Record<string, string[]> = {};
  const add = (qitemId: string, message: string) => {
    (issues[qitemId] ??= []).push(message);
  };

  /* ── 기본정보 ─────────────────────────────────────────────── */

  const formTtlNm = draft.formTtlNm.trim() ? "" : "폼_제목_명을 입력해야 저장됩니다";

  /*
   * 문자열 비교로 충분하다 — 둘 다 같은 형식(오프셋이 붙은 ISO-8601)으로만 들어온다.
   * 그 전제를 지키는 곳은 `withServiceOffset`이다(입력 시점 · 저장 본문 두 곳). 한쪽만
   * 오프셋이 없으면 같은 시각인데도 긴 쪽이 커서 "종료가 시작보다 빠르다"가 잘못 뜬다.
   */
  const rcptDt =
    draft.rcptBgngDt && draft.rcptEndDt && draft.rcptBgngDt > draft.rcptEndDt
      ? "접수_종료_일시가 시작보다 빠릅니다"
      : "";

  /* ── 문항 구성 (서버 규칙과 1:1) ──────────────────────────── */

  const seen = new Set<string>();

  qitems.forEach((qitem, index) => {
    const name = qitemLabel(index, qitem.qitemLblNm);

    if (!qitem.qitemId) {
      add(qitem.qitemId, `${name}: 문항 식별자가 비어 있습니다`);
    } else if (seen.has(qitem.qitemId)) {
      // 식별자 중복은 응답 데이터가 섞이는 사고다 — 저장 전에 반드시 막는다
      add(qitem.qitemId, `${name}: 문항 식별자(${qitem.qitemId})가 중복입니다`);
    }
    seen.add(qitem.qitemId);

    const pageSeq = qitem.pageSeq ?? 0;
    if (pageSeq < 0 || pageSeq >= pages.length) {
      add(qitem.qitemId, `${name}: 존재하지 않는 페이지에 놓여 있습니다`);
    }

    if (isChoiceQitemType(qitem.qitemTypeCd)) {
      if (qitem.optionList.length === 0) {
        add(qitem.qitemId, `${name}: 선택지를 1개 이상 추가하세요`);
      }
      const duplicated = qitem.optionList.filter(
        (option, i) => qitem.optionList.indexOf(option) !== i,
      );
      if (duplicated.length > 0) {
        add(qitem.qitemId, `${name}: 선택지가 중복입니다 (${duplicated[0]})`);
      }
      if (qitem.optionList.some((option) => !option.trim())) {
        add(qitem.qitemId, `${name}: 빈 선택지가 있습니다`);
      }
    }

    if (qitem.qitemTypeCd === "SINGLE_CHOICE" && qitem.branchMap) {
      for (const [option, target] of Object.entries(qitem.branchMap)) {
        if (!qitem.optionList.includes(option)) {
          // 선택지를 지우면 분기도 같이 지우지만, 이름을 고친 경우 여기서 잡힌다
          add(qitem.qitemId, `${name}: 없는 선택지(${option})에 분기가 남아 있습니다`);
        }
        if (!Number.isInteger(target) || target < 0 || target >= pages.length) {
          add(qitem.qitemId, `${name}: ‘${option}’ 분기가 없는 페이지를 가리킵니다`);
        }
      }
    }

    if (qitem.qitemTypeCd === "MULTI_CHOICE" && qitem.maxSlctCnt !== undefined) {
      if (qitem.maxSlctCnt < 1) {
        add(qitem.qitemId, `${name}: 최대 선택 개수는 1 이상이어야 합니다`);
      } else if (qitem.maxSlctCnt > qitem.optionList.length) {
        add(
          qitem.qitemId,
          `${name}: 최대 선택 개수(${qitem.maxSlctCnt})가 선택지 수(${qitem.optionList.length})보다 많습니다`,
        );
      }
    }

    if (qitem.ptrnCn && isTextQitemType(qitem.qitemTypeCd)) {
      /*
       * 깨진 정규식이 저장되면 공개 폼의 응답 검증 전체가 무너진다. 컴파일 가능 여부는
       * 실제로 만들어 보는 것 말고 확인할 방법이 없다 — 서버도 Pattern.compile()로 같은
       * 검사를 한다. (자바와 자바스크립트의 문법이 완전히 같지는 않지만, 프리셋과 손으로
       * 쓰는 정규식 수준에서 갈라지는 경우는 거의 없다)
       */
      try {
        new RegExp(qitem.ptrnCn);
      } catch {
        add(qitem.qitemId, `${name}: 입력 형식 정규식이 올바르지 않습니다`);
      }
    }
  });

  /* ── 응답이 있는 폼의 문항 삭제 ───────────────────────────── */

  const removedInUseQitemIds = context.hasResponses
    ? context.savedQitemIds.filter((qitemId) => !seen.has(qitemId))
    : [];

  /* ── 저장 보류 사유 ───────────────────────────────────────── */

  const firstQitemIssue = Object.values(issues).flat()[0] ?? "";

  let blockingMessage = "";
  if (pages.length === 0) {
    blockingMessage = "페이지가 최소 1개 필요합니다";
  } else if (formTtlNm) {
    blockingMessage = formTtlNm;
  } else if (rcptDt) {
    blockingMessage = rcptDt;
  } else if (removedInUseQitemIds.length > 0) {
    // 서버가 409로 거절할 요청이다. 보내서 실패를 보여 주는 대신 원인을 그대로 말한다
    blockingMessage = `이미 응답이 있어 삭제할 수 없는 문항입니다 (${removedInUseQitemIds.join(", ")}). 되돌리면 저장이 재개됩니다`;
  } else if (firstQitemIssue) {
    blockingMessage = firstQitemIssue;
  }

  return { formTtlNm, rcptDt, qitems: issues, removedInUseQitemIds, blockingMessage };
}
