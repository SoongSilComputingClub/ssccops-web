import type { MbrGrdCd, MbrSttsCd, RspnsSttsCd } from "@/shared/config/codes";

/**
 * 응답_내용(내용J) — 문항 ID(qitemId)를 key로 저장한다.
 * 다중선택 문항은 배열, 그 외는 문자열.
 */
export type RspnsCn = Record<string, string | string[]>;

/* ── 서버 조회 모델 (ssccops-server #35 · #36 · #37) ─────────────
 *
 * form_rspns_hstry 한 행을 그대로 옮긴 목 데이터용 `FormRspnsHstry` 타입은 지웠다(#12).
 * 그 타입의 `mbrId: number | null`은 비회원 응답을 전제한 것이었는데, 비회원 응답이
 * 폐기되면서(ssccops #61 — 공개 폼도 가입을 요구한다) 응답자는 전원 회원이고
 * `form_rspns_hstry.mbr_id`는 NOT NULL이다. 마지막까지 그 타입으로 목 스토어에 응답을 쌓던
 * 공개 폼 제출 경로가 `POST /v1/forms/{id}/responses`로 옮겨 가면서 함께 사라졌다.
 *
 * 서버 조회는 테이블이 아니라 화면이 필요로 하는 모양으로 내려온다 — 특히 **응답자 정보는
 * 응답에 복사돼 있지 않고 서버가 mbr을 조인해 `member` 블록으로 내려준다**. 그래서 화면은
 * 회원 목록을 따로 들고 있을 필요가 없고, 응답 내용(rspnsCn)에서 이름·학번을 역추적하던
 * 코드도 필요 없다.
 *
 * **목록과 상세를 한 타입으로 합치지 않는다.** 목록은 `rspnsCn`을 싣지 않기로 계약돼 있어
 * (응답 수백 건 × 문항 수십 개면 목록 응답이 비대해진다) 합쳐서 옵셔널로 두면 목록에서 온
 * 값을 상세처럼 그리다 응답 내용이 통째로 비는 사고가 난다 — 타입으로 막는다.
 */

/** 목록·상세가 함께 싣는 응답자 회원 요약 (서버가 mbr을 조인해 채운다) */
export interface ResponseMember {
  mbrId: number;
  mbrNm: string;
  stdntNo: string;
  scsbjtNm: string | null;
  mbrGrdCd: MbrGrdCd;
  mbrSttsCd: MbrSttsCd;
}

/** 상세에만 추가로 실리는 회원 정보 */
export interface ResponseMemberDetail extends ResponseMember {
  genNo: number | null;
  scyrNo: number | null;
  telno: string | null;
}

/** GET /v1/forms/{formId}/responses 항목 — 목록 표가 쓰는 것만 */
export interface FormResponseItem {
  formRspnsId: number;
  rspnsSttsCd: RspnsSttsCd;
  /** 작성 중(DRAFT)은 아직 제출 전이라 값이 없다 */
  sbmsnDt: string | null;
  member: ResponseMember;
}

/** GET /v1/forms/{formId}/responses/{formRspnsId} */
export interface FormResponseDetail {
  formRspnsId: number;
  rspnsSttsCd: RspnsSttsCd;
  sbmsnDt: string | null;
  member: ResponseMemberDetail;
  /** 문항 라벨은 여기 없다 — 폼 상세 API의 qitemCpstCn과 맞춰 그린다 */
  rspnsCn: RspnsCn;
  /**
   * 목록 정렬 기준의 인접 응답. 없으면(목록의 처음·끝) null.
   *
   * 상세 화면에 목록 배열이 없으므로 이전/다음 이동은 전적으로 이 두 값에 의존한다.
   */
  prevFormRspnsId: number | null;
  nextFormRspnsId: number | null;
}
