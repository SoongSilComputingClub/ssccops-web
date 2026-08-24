import type { QitemCpstCn } from "@/entities/form";
import {
  TMPL_EXPLN_MAX_LENGTH,
  TMPL_NM_MAX_LENGTH,
  type FormTemplateDetail,
  type FormTemplateSaveInput,
} from "@/entities/form-template";
import { validateQitemCpst, type QitemCpstIssues } from "@/features/form";

/*
 * 템플릿 편집기가 들고 다니는 초안과, 초안을 다루는 순수 함수들 (#134).
 *
 * 폼 초안(features/form 의 FormDraft)과 나눠 둔 것은 저장되는 값이 다르기 때문이다 — 템플릿에는
 * 접수 기간도 상태도 라벨도 없고 이름·설명·문항 구성 셋뿐이다. 하나로 합쳐 옵셔널을 늘리면
 * "이 값이 비어 있다"와 "이 자원에는 그 자리가 없다"가 구별되지 않는다.
 *
 * 반대로 **문항 구성 검증은 폼과 한 벌을 쓴다**(`validateQitemCpst`). 서버가 두 자원을 같은
 * 검증기로 보므로, 규칙을 여기 다시 적으면 템플릿에서는 만들 수 있었던 구성이 그 템플릿으로
 * 만든 폼의 저장에서 거절된다.
 *
 * `useYn`은 초안에 없다. 새 템플릿은 항상 활성이고 수정은 사용 여부를 건드리지 않는다 —
 * 전환은 목록의 토글(PATCH .../use) 하나뿐이라 편집 화면에 자리를 두면 저장해도 반영되지 않는
 * 입력란이 생긴다.
 */

export interface FormTemplateDraft {
  tmplNm: string;
  /** 선택 입력이라 화면에서는 빈 문자열로 다루고, 서버로 나갈 때 null이 된다 */
  tmplExpln: string;
  qitemCpstCn: QitemCpstCn;
}

/** 새 템플릿의 초기 초안 — 페이지 1개 + 빈 단답형 문항 1개 (새 폼과 같은 시작점) */
export function emptyFormTemplateDraft(): FormTemplateDraft {
  return {
    tmplNm: "",
    tmplExpln: "",
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
 * 페이지·문항을 얕은 복사해 둔다(폼과 같은 이유) — 조회 결과 객체를 그대로 편집하면 같은
 * 참조를 보는 다른 화면이 저장도 안 된 값을 보여 준다. 페이지가 0개인 템플릿은 편집기가
 * 아무것도 그리지 못하므로 여기서 최소 1개를 채운다.
 */
export function toFormTemplateDraft(template: FormTemplateDetail): FormTemplateDraft {
  const pages = template.qitemCpstCn.pages.map((p) => ({ ...p }));
  return {
    tmplNm: template.tmplNm,
    tmplExpln: template.tmplExpln ?? "",
    qitemCpstCn: {
      pages: pages.length > 0 ? pages : [{ pageTtl: "페이지 1", pageDescCn: "" }],
      qitems: template.qitemCpstCn.qitems.map((q) => ({ ...q })),
    },
  };
}

export function toFormTemplateSaveInput(draft: FormTemplateDraft): FormTemplateSaveInput {
  return {
    tmplNm: draft.tmplNm,
    tmplExpln: draft.tmplExpln,
    qitemCpstCn: draft.qitemCpstCn,
  };
}

export interface FormTemplateDraftIssues {
  /** 기본정보 인라인 오류 (빈 문자열이면 정상) */
  tmplNm: string;
  tmplExpln: string;
  /** qitemId → 그 문항에 붙일 오류 문구들 */
  qitems: Record<string, string[]>;
  /** 저장을 막는 사유 한 줄. 비어 있으면 저장해도 된다 */
  blockingMessage: string;
}

/**
 * 저장 전 클라이언트 검증.
 *
 * 서버가 최종 방어선이라는 사실은 그대로다. 먼저 보는 이유는 400의 응답만으로는 **어느 문항이**
 * 잘못됐는지 화면이 짚어 줄 수 없기 때문이다 — 길이 제한도 왕복 한 번을 기다리지 않고 바로
 * 알려 주는 편이 낫다.
 */
export function validateFormTemplateDraft(
  draft: FormTemplateDraft,
): FormTemplateDraftIssues {
  const tmplNm = validateTmplNm(draft.tmplNm);
  const tmplExpln =
    draft.tmplExpln.length > TMPL_EXPLN_MAX_LENGTH
      ? `설명은 ${TMPL_EXPLN_MAX_LENGTH}자를 넘을 수 없습니다`
      : "";

  const cpst: QitemCpstIssues = validateQitemCpst(draft.qitemCpstCn, {
    // 템플릿에는 응답이 달릴 수 없다 — 문항을 지워도 잃을 답이 없다
    savedQitemIds: [],
    hasResponses: false,
  });

  let blockingMessage = "";
  if (draft.qitemCpstCn.pages.length === 0) {
    blockingMessage = "페이지가 최소 1개 필요합니다";
  } else if (tmplNm) {
    blockingMessage = tmplNm;
  } else if (tmplExpln) {
    blockingMessage = tmplExpln;
  } else if (cpst.firstQitemIssue) {
    blockingMessage = cpst.firstQitemIssue;
  }

  return { tmplNm, tmplExpln, qitems: cpst.qitems, blockingMessage };
}

function validateTmplNm(value: string): string {
  const tmplNm = value.trim();
  if (!tmplNm) return "템플릿 이름을 입력해야 저장됩니다";
  if (tmplNm.length > TMPL_NM_MAX_LENGTH) {
    return `템플릿 이름은 ${TMPL_NM_MAX_LENGTH}자를 넘을 수 없습니다`;
  }
  return "";
}
