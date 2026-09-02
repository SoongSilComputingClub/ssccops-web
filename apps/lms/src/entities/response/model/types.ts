import type { QitemCpstCn, RspnsCn } from "@ssccops/form-renderer";
import type { RvwPrcsSeCd, RspnsSttsCd } from "@/shared/config/codes";

/*
 * 기획안(PROPOSAL 시스템 폼) 재제출 화면이 쓰는 응답 조회 모델 (#171).
 *
 * 응답_내용(`RspnsCn`)·문항 구성(`QitemCpstCn`)은 여기 없다 — `@ssccops/form-renderer`가
 * 정의한다(#152). 저장 형태와 렌더링 규칙이 한 몸이라 패키지 쪽에 둔다. 이 파일에는 **제출자
 * 본인이 자기 응답을 확인·재제출할 때 쓰는 모양**만 둔다(운영자용 심사 모델은 어드민에 있다).
 */

/**
 * 시스템 폼 한 건 (서버 신설 · `GET /v1/forms/system/{sysFormCd}`).
 *
 * 기획안 폼은 코드(`sys_form_cd = 'PROPOSAL'`)가 가리키는 시스템 폼이고 `formId`는 환경마다
 * 다르다(IDENTITY). 화면에 번호를 적으면 한 환경에서만 맞으므로 코드로 찾는다 — 어드민
 * `/proposals`가 폼 목록에서 찾는 것과 같은 판단이되, 이 앱은 일반 회원이 쓰는 화면이라
 * 폼 목록(FORM_READ 필요)을 읽을 수 없어 인증만 요구하는 전용 조회를 쓴다.
 *
 * `qitemCpstCn`을 함께 싣는다 — 재제출 화면은 마감된 폼의 문항도 그려야 하는데
 * (`CHANGES_REQUESTED` 재제출은 마감에 막히지 않는다) `GET .../public`은 마감 시 409라
 * 문항을 받을 수 없다.
 */
export interface SystemForm {
  formId: number;
  formTtlNm: string;
  sysFormCd: string;
  /** 한 사람이 여러 건을 낼 수 있는 폼인가 (기획안은 true — 스터디·프로젝트를 각각 낸다) */
  mltplRspnsYn: boolean;
  /** 지금 새 응답을 받는가. 재제출은 이 값과 무관하게 가능하다 */
  acceptingYn: boolean;
  qitemCpstCn: QitemCpstCn;
}

/**
 * 내가 이 폼에 낸 응답 한 건 — `GET /v1/forms/{formId}/responses/mine` 항목 (서버 #143).
 *
 * 응답 내용(`rspnsCn`)은 없다 — 목록이 답하는 것은 "몇 건을 어떤 상태로 냈는가"이고, 답
 * 전체는 상세(`MyFormResponseDetail`)의 몫이다. 작성 중(DRAFT) 응답도 이 목록에 온다
 * (그때 `sbmsnDt`가 null이다).
 */
export interface MyFormResponse {
  formRspnsId: number;
  /** 응답 순번 — 몇 번째로 낸 건인가. 모르는 배포에서 1이라고 지어내지 않는다 */
  rspnsSeq: number | null;
  /**
   * 대표 문항의 답 — 이 응답 한 건을 목록에서 알아보는 값 (서버 #196).
   *
   * 어느 문항이 대표값인지는 **서버의 선언**이고(`SystemFormContract` · 기획안은 활동명)
   * 목록은 그 한 줄만 받는다 — 응답 내용(`rspnsCn`)은 여전히 실리지 않는다.
   *
   * **`null`이 정상이다.** 대표 문항 선언이 없는 폼·지워진 문항·비워 둔 답이 전부 null이며
   * 서버가 대체값을 만들지 않는다. 화면도 만들지 않고 순번 표기로 떨어진다.
   */
  responseTitle: string | null;
  rspnsSttsCd: RspnsSttsCd;
  /** 제출 회차 — 그 한 건을 몇 번 냈는가 (수정요청 뒤 재제출에서 오른다) */
  sbmsnSeq: number | null;
  /** 아직 내지 않은 작성 중 응답은 null */
  sbmsnDt: string | null;
  /** 마지막 수정 일시 — 작성 중 응답이 언제 저장됐는지의 유일한 단서 */
  mdfcnDt: string | null;
}

/**
 * 처리 이력 한 줄 — `form_rspns_rvw_hstry` (서버 #141 · #177).
 *
 * 제출도 한 줄로 들어간다(`rvwPrcsSeCd === "SUBMIT"`). 서버가 처리 일시 오름차순으로 내려주고
 * 처리가 없으면 빈 배열이다 — 화면이 다시 정렬하지 않는다. **처리자_명(`prcsMbrNm`)이
 * 제출자에게도 보인다**(서버 #177 결정 1 — 동아리 내부 결재).
 */
export interface FormResponseReviewHistory {
  formRspnsRvwHstryId: number;
  /** 몇 회차 제출에 대한 처리였는가. 모르는 배포에서 지어내지 않는다 */
  sbmsnSeq: number | null;
  rvwPrcsSeCd: RvwPrcsSeCd;
  prcsMbrId: number;
  prcsMbrNm: string;
  /** 승인은 의견이 선택이라 비어 있을 수 있다. 제출 줄에는 없다 */
  rvwOpnnCn: string | null;
  prcsDt: string | null;
}

/**
 * 제출자용 본인 응답 상세 — `GET /v1/forms/{formId}/responses/mine/{formRspnsId}` (서버 #177).
 *
 * 운영자용 상세(`FormResponseDetailResponse`)와 달리 `prevFormRspnsId`·`nextFormRspnsId`
 * (남의 응답 식별자)·회원 정보를 싣지 않는다. `academicProgramPreview`(승인 미리보기)도 없다 —
 * 제출자에게는 누를 버튼이 없다.
 */
export interface MyFormResponseDetail {
  formRspnsId: number;
  rspnsSeq: number | null;
  rspnsSttsCd: RspnsSttsCd;
  sbmsnSeq: number | null;
  sbmsnDt: string | null;
  mdfcnDt: string | null;
  /** 이전 답 전체 — 재제출 프리필의 재료 */
  rspnsCn: RspnsCn;
  /** 처리 이력 — 상세가 통째로 싣는다(별도 엔드포인트 없음) */
  reviewHistories: FormResponseReviewHistory[];
}
