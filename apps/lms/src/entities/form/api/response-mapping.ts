import type { QitemCpstCn } from "@ssccops/form-renderer";
import type { FormReceiptStatus, RecruitmentForm, RecruitmentFormView } from "../model/types";

/*
 * 모집 폼 응답 → 도메인 변환 (#528 · ssccops-server#483).
 *
 * **전송 계층을 모르는 순수 모듈이다** — 조회(SSR · `recruitment-form-read.ts`)와
 * 저장(브라우저 · `recruitment-form-write.ts`)이 이 한 벌을 함께 쓴다. 두 파일이 각자 옮겨
 * 적으면 계약이 바뀌었을 때 한쪽만 고쳐진다(`entities/academic-session/api/response-mapping.ts`가
 * 세운 규칙).
 *
 * **서버 응답의 모양을 아는 곳은 이 파일 하나다.**
 */

/** 서버 `FormDetailResponse` — 화면이 쓰는 필드만 적는다(라벨·생성자·응답 집계는 이 앱에 화면이 없다) */
interface FormDetailApiResponse {
  formId: number;
  formTtlNm: string | null;
  receiptStatus: FormReceiptStatus | null;
  rcptBgngDt: string | null;
  rcptEndDt: string | null;
  qitemCpstCn: QitemCpstCn | null;
  qitemVer: number | null;
  systemRequiredQitemIds: string[] | null;
  responseCount: number | null;
}

/** 서버 `RecruitmentFormResponse` */
export interface RecruitmentFormApiResponse {
  form: FormDetailApiResponse;
  isEditable: boolean;
}

/**
 * 문항 구성이 비어 오는 배포에서 편집기가 옵셔널 체이닝으로 뒤덮이지 않게 자리를 채운다
 * (`entities/response/api/system-form.ts`와 같은 판단).
 *
 * **페이지 0개를 그대로 두지 않는다** — 편집기는 «지금 보고 있는 페이지»가 있어야 아무것도
 * 그리지 못하는 상태를 피한다. 승인 이관이 만든 폼은 문항 0개로 태어나므로(서버 #150) 이
 * 자리가 **정상 흐름의 첫 진입**이다.
 */
function toQitemCpstCn(value: QitemCpstCn | null | undefined): QitemCpstCn {
  const pages = value?.pages ?? [];
  return {
    pages: pages.length > 0 ? pages : [{ pageTtl: "페이지 1", pageDescCn: "" }],
    qitems: value?.qitems ?? [],
  };
}

export function toRecruitmentFormView(res: RecruitmentFormApiResponse): RecruitmentFormView {
  return {
    form: toRecruitmentForm(res.form),
    isEditable: res.isEditable,
  };
}

/*
 * 없는 값을 만들어 내지 않는다(AGENTS.md) — 빈 제목을 "-"로 채우는 것은 표시 규칙이고 그것은
 * 그리는 쪽이 정한다. 여기서 채우면 «값이 없다»와 «서버가 그렇게 줬다»를 구별할 수 없다.
 * 아래에서 기본값을 두는 것은 **없으면 화면이 그려지지 않는 구조적 자리**뿐이다(문항 구성 ·
 * 계약 문항 목록 · 숫자 집계).
 */
function toRecruitmentForm(res: FormDetailApiResponse): RecruitmentForm {
  return {
    formId: res.formId,
    formTtlNm: res.formTtlNm ?? "",
    // 서버가 늘 파생해 내리는 값이다 — 없으면 아직 접수 일시가 없는 폼으로 본다
    receiptStatus: res.receiptStatus ?? "DRAFT",
    rcptBgngDt: res.rcptBgngDt,
    rcptEndDt: res.rcptEndDt,
    qitemCpstCn: toQitemCpstCn(res.qitemCpstCn),
    qitemVer: res.qitemVer ?? 0,
    // 서버는 «없음»과 «비어 있음»을 섞지 않고 빈 배열로 내린다(AP-15) — null은 옛 배포 대비
    systemRequiredQitemIds: res.systemRequiredQitemIds ?? [],
    responseCount: res.responseCount ?? 0,
  };
}
