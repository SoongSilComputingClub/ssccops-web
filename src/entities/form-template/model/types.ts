import type { FormSttsCd } from "@/shared/config/codes";
import type { QitemCpstCn } from "@/entities/form";

/*
 * 폼 템플릿 도메인 타입 (ssccops-server #142).
 *
 * ── 왜 entities/form 이 아니라 별도 슬라이스인가 ────────────────
 * 템플릿은 폼과 다른 자원이다(/v1/form-templates). 상태·접수 기간·라벨·응답이 없고 사용_여부
 * 하나만 갖는다 — 폼 타입에 옵셔널로 얹으면 "이 폼은 접수 기간이 없는가, 템플릿이라 자리가
 * 없는가"를 타입으로 구분할 수 없게 된다.
 *
 * 문항 구성(`QitemCpstCn`)만은 entities/form 의 것을 그대로 쓴다. **서버가 폼과 템플릿을 같은
 * 검증기로 보므로 구조가 갈리면 템플릿으로 만든 폼이 저장에서 거절된다** — 두 벌을 두지 않는
 * 것이 이 이슈의 핵심 제약이다.
 *
 * ── 목록과 상세를 나눈다 ───────────────────────────────────────
 * 목록(GET /v1/form-templates)은 문항 구성을 싣지 않고 문항 수(qitemCnt)만 준다. 폼과 같은
 * 계약이며 이유도 같다 — 하나로 합쳐 옵셔널로 두면 목록에서 온 값을 상세처럼 그리다가
 * 문항이 통째로 비는 사고가 난다.
 */

/** GET /v1/form-templates 항목 — 생성·수정·사용 여부 전환의 응답이기도 하다 */
export interface FormTemplateSummary {
  formTmplId: number;
  /** 명V200 */
  tmplNm: string;
  /** 설명V500 — 선택 입력이라 비어 있을 수 있다 */
  tmplExpln: string | null;
  /** 여부B — 이 템플릿으로 새 폼을 시작할 수 있는가 (조회·수정은 꺼져 있어도 된다) */
  useYn: boolean;
  /** 서버가 세어 준 문항 수. 목록이 문항 구성을 싣지 않는 대신 갖는 값이다 */
  qitemCnt: number;
  creatrMbrId: number;
  creatrMbrNm: string;
  crtDt: string | null;
  mdfcnDt: string | null;
}

/** GET /v1/form-templates/{formTmplId} — 목록 항목 + 문항 구성 */
export interface FormTemplateDetail extends FormTemplateSummary {
  qitemCpstCn: QitemCpstCn;
}

/**
 * 템플릿 저장 입력 — 생성(POST)과 수정(PUT)이 같은 본문을 쓴다.
 *
 * `useYn`이 없는 것은 서버 계약 그대로다. 새 템플릿은 언제나 활성이고, 수정은 사용_여부를
 * 건드리지 않는다 — 전환은 PATCH .../use 하나뿐이다.
 */
export interface FormTemplateSaveInput {
  tmplNm: string;
  tmplExpln: string | null;
  qitemCpstCn: QitemCpstCn;
}

/**
 * 템플릿으로 만든 폼 (POST /v1/form-templates/{formTmplId}/forms).
 *
 * 라벨·접수 기간·응답 수는 실리지 않는다 — 템플릿에서 나온 폼은 반드시 비어 있어서, 늘 같은
 * 값을 내리면 "승계되는 경우도 있나" 하는 의문만 남기기 때문이다(서버 판단).
 */
export interface FormFromTemplateResult {
  formId: number;
  formTmplId: number;
  formTtlNm: string;
  /** 반드시 DRAFT다. 그 사실이 계약이라 응답에 드러난다 */
  formSttsCd: FormSttsCd;
  crtDt: string | null;
}
