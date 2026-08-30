import type { RspnsCn } from "@ssccops/form-renderer";
import type {
  MbrGrdCd,
  MbrSttsCd,
  RspnsPrcsSeCd,
  RspnsSttsCd,
} from "@/shared/config/codes";

/*
 * 응답_내용(내용J) 타입 `RspnsCn`은 여기 없다 — `@ssccops/form-renderer`가 정의한다(#152).
 * 저장 형태(다중선택만 배열)는 응답자 화면이 답을 만드는 규칙과 한 몸이라 렌더러 쪽에 둔다.
 * 이 파일에는 **운영자가 응답을 심사할 때 쓰는 조회 모델**만 남는다.
 */

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

/*
 * ── 응답 순번(rspnsSeq)과 제출 회차(sbmsnSeq)는 다른 값이다 (ssccops-server #143) ──
 *
 * **순번은 새 응답이 생길 때 오르고 회차는 같은 응답을 다시 낼 때 오른다.** 한 사람이 제안을
 * 두 개 내면 순번 1·2인 두 건이 되고, 그중 하나가 수정요청을 받아 다시 제출되면 그 건의
 * 회차만 2가 된다(순번은 그대로다). 세는 대상이 '응답'과 '제출'로 달라서, 두 값을 한 자리에
 * 섞으면 "2회차"가 두 번째 제안인지 첫 제안의 재제출인지 갈린다.
 *
 * 둘 다 서버가 언제나 채워 보내지만(NOT NULL) 모르는 배포에서 1이라고 **지어내지 않는다** —
 * 없으면 화면이 그 표기를 빼고 나머지를 그대로 그린다.
 */

/** GET /v1/forms/{formId}/responses 항목 — 목록 표가 쓰는 것만 */
export interface FormResponseItem {
  formRspnsId: number;
  /** 응답 순번 — 다중 응답 폼에서 같은 회원의 두 행을 가르는 값 (위 주석 참고) */
  rspnsSeq: number | null;
  /**
   * 대표 문항의 답 — 이 응답 한 건을 목록에서 알아보는 값 (ssccops-server #196).
   *
   * 어느 문항이 대표값인지는 **서버의 선언**이다(`SystemFormContract` · 기획안은 활동명).
   * 웹이 문항 코드를 골라 응답 내용에서 꺼내는 것이 아니라 서버가 뽑아 준 한 줄을 그린다 —
   * 목록 응답은 여전히 응답 내용(`rspnsCn`)을 싣지 않는다.
   *
   * **`null`이 정상이다.** 대표 문항 선언이 없는 평범한 폼, 그 문항이 지워진 폼, 제출자가
   * 비워 둔 답이 전부 null이며 서버가 "제목 없음" 같은 대체값을 만들지 않는다. 화면도 만들지
   * 않는다 — 값이 없으면 순번 표기로 떨어진다.
   *
   * **`rspnsSeq`를 대체하지 않는다.** 같은 사람이 같은 이름으로 두 번 낼 수 있어 그 둘을
   * 가르는 것은 여전히 순번뿐이다.
   */
  responseTitle: string | null;
  rspnsSttsCd: RspnsSttsCd;
  /** 작성 중(DRAFT)은 아직 제출 전이라 값이 없다 */
  sbmsnDt: string | null;
  member: ResponseMember;
}

/**
 * GET /v1/forms/{formId}/responses/mine 항목 — 응답자 본인이 이 폼에 낸 응답 한 건 (#143).
 *
 * **운영자용 목록(`FormResponseItem`)과 타입을 나눈다.** 저쪽은 남의 응답을 심사하는 화면이라
 * 응답자 정보(`member`)를 싣지만, 여기서는 그 회원이 요청 주체 본인이라 실을 값이 없다.
 * 응답 내용(`rspnsCn`)도 없다 — 서버가 계약에서 뺐고, 이 화면이 묻는 것은 "몇 건을 냈고 각각
 * 어떤 상태인가"다.
 *
 * 작성 중(DRAFT) 응답도 이 목록에 들어온다(그때 `sbmsnDt`가 null이다). 운영자 목록이 DRAFT를
 * 빼는 것과 갈리는데, 그 규칙은 남의 제출 전 답안을 심사 목록에서 빼기 위한 것이라 내 것을
 * 나에게 숨길 이유는 없다.
 */
export interface MyFormResponse {
  formRspnsId: number;
  /** 응답 순번 — 몇 번째로 낸 건인가 */
  rspnsSeq: number | null;
  rspnsSttsCd: RspnsSttsCd;
  /** 제출 회차 — 그 한 건을 몇 번 냈는가 (수정요청 뒤 재제출에서 오른다) */
  sbmsnSeq: number | null;
  /** 아직 내지 않은 작성 중 응답은 null */
  sbmsnDt: string | null;
  /** 마지막 수정 일시 — 작성 중 응답이 언제 저장됐는지의 유일한 단서다 */
  mdfcnDt: string | null;
}

/**
 * table: form_rspns_rvw_hstry — 처리 이력 한 줄 (ssccops-server #141).
 *
 * 제출도 한 줄로 들어간다(`prcsSeCd === "SUBMIT"`) — 검토만 쌓으면 타임라인이 "무엇에 대한
 * 검토였는가"의 출발점을 잃는다. 재제출이 있으면 SUBMIT 줄이 여러 번 나타나고 `sbmsnSeq`로
 * 갈린다.
 *
 * 서버가 처리 일시 오름차순으로 내려주고 처리가 없으면 빈 배열이다 — 화면이 다시 정렬하지
 * 않는다(정렬 규칙이 두 벌이 되면 갈린다).
 */
export interface FormResponseReviewHistory {
  formRspnsRvwHstryId: number;
  /**
   * 몇 회차 제출에 대한 처리였는가 — 재제출이 있으면 회차가 늘어난다.
   *
   * 서버는 언제나 채워 보내지만(NOT NULL), 회차를 모르는 배포를 만났을 때 1회차라고 **지어내지
   * 않는다** — 없으면 화면이 회차 표기를 빼고 나머지를 그대로 그린다.
   */
  sbmsnSeq: number | null;
  prcsSeCd: RspnsPrcsSeCd;
  /** 처리자 — 이름은 이력 행이 아니라 mbr에서 오므로 개명하면 함께 바뀐다 */
  prcsMbrId: number;
  prcsMbrNm: string;
  /** 승인은 의견이 선택이라 비어 있을 수 있다. 제출 줄에는 없다 */
  rvwOpnnCn: string | null;
  prcsDt: string | null;
}

/**
 * 승인하면 만들어질 커리큘럼 회차 한 줄 (ssccops-server #150 · `CurriculumItemDraft`).
 *
 * **이 값은 화면이 만든 것이 아니라 서버가 파싱한 결과다.** 커리큘럼은 자유 텍스트로 접수되고
 * (정규식을 걸지 않는다) 승인 시점에 회차로 쪼개지는데, 그 파싱은 서버에 한 곳뿐이다
 * (`ProposalResponseParser`). 화면이 답변 원문을 다시 쪼개 표를 그리면 검토자가 승인한 것과
 * 실제로 만들어지는 것이 갈린다 — 자유 텍스트라 그 갈림은 실제로 일어난다.
 *
 * 필드 이름이 컬럼(`seqno` · `ttl` · `plan_ymd`)과 같은 것은 이 값이 그 컬럼으로 그대로
 * 들어가기 때문이다.
 */
export interface CurriculumItemPreview {
  /** 제출자가 적은 회차 번호 — 서버가 줄 순서로 지어내지 않는다 */
  seqno: number | null;
  /** 회차 주제 */
  ttl: string;
  /** 계획일(서버 컬럼 `plan_ymd`). 커리큘럼 줄 포맷이 날짜를 생략할 수 있게 두어 비어 있을 수 있다 */
  planDt: string | null;
}

/**
 * 승인 시 만들어질 학술 활동의 미리보기 (ssccops-server #150).
 *
 * **기획안 폼(`sys_form_cd = 'PROPOSAL'`)의 응답에서만 채워지고 그 밖의 응답에서는 `null`이다.**
 * 실제 이관과 **같은 파서**가 만든 값이라, 여기 보이는 것이 승인 버튼을 눌렀을 때 만들어지는
 * 것 그 자체다.
 *
 * 파싱 실패를 오류가 아니라 값으로 싣는 것이 이 필드의 요점이다 — 형식이 어긋난 기획안이야말로
 * 검토자가 열어 봐야 하는 기획안인데, 상세 조회가 통째로 실패하면 그 화면을 열 수조차 없다.
 */
export interface AcademicProgramPreview {
  /**
   * 매핑된 학술 활동 유형 코드. 매핑에 실패했으면 `null`이다.
   *
   * **화면에 그대로 노출하지 않는다** — `STUDY`는 사람이 읽는 값이 아니고, 제출자가 고른 유형
   * 문자열("스터디")은 이미 응답 내용에 그대로 실려 있다. 매핑이 끊겼다는 사실은
   * `migratable`·`failureReason`이 말한다.
   */
  typeCd: string | null;
  /** 파싱된 회차 목록. 파싱에 실패했으면 빈 배열이다(절반만 채워 내리지 않는다) */
  curriculumItems: CurriculumItemPreview[];
  /** 지금 승인할 수 있는가. false면 승인은 400 `PROPOSAL_MIGRATION_FAILED`로 거절된다 */
  migratable: boolean;
  /**
   * `migratable`이 false일 때의 사유. 승인을 눌렀을 때 서버가 돌려줄 400의 문장과 **같다** —
   * 몇 번째 커리큘럼 줄이 어떻게 어긋났는지까지 담겨 있어 검토자가 수정요청에 그대로 옮겨
   * 적을 수 있다.
   */
  failureReason: string | null;
}

/** GET /v1/forms/{formId}/responses/{formRspnsId} */
export interface FormResponseDetail {
  formRspnsId: number;
  /** 응답 순번 — 이 응답자의 몇 번째 응답인가 (제출 회차와 다른 값이다 · 위 주석 참고) */
  rspnsSeq: number | null;
  rspnsSttsCd: RspnsSttsCd;
  sbmsnDt: string | null;
  /** 제출 회차 — 이력의 각 줄이 몇 회차에 대한 처리였는지 읽는 기준점이다 */
  sbmsnSeq: number | null;
  member: ResponseMemberDetail;
  /** 문항 라벨은 여기 없다 — 폼 상세 API의 qitemCpstCn과 맞춰 그린다 */
  rspnsCn: RspnsCn;
  /**
   * 처리 이력. 별도 엔드포인트가 없고 상세가 통째로 싣는다 — 나누면 상세를 여는 화면이 두 번
   * 요청하고, 두 응답 사이에 다른 검토자의 처리가 끼어들면 배지와 타임라인이 서로 다른 시점을
   * 가리킨다.
   */
  reviewHistories: FormResponseReviewHistory[];
  /**
   * 목록 정렬 기준의 인접 응답. 없으면(목록의 처음·끝) null.
   *
   * 상세 화면에 목록 배열이 없으므로 이전/다음 이동은 전적으로 이 두 값에 의존한다.
   */
  prevFormRspnsId: number | null;
  nextFormRspnsId: number | null;
  /**
   * 승인 시 만들어질 학술 활동의 미리보기 (ssccops-server #150).
   *
   * **기획안이 아닌 응답에서는 `null`이다.** 폼 응답 API 하나가 지원서·설문·모집 신청서를 함께
   * 나르므로, 이 필드가 있는지 자체가 "이 응답이 기획안인가"의 답이다 — 응답 상세를 그리는
   * 화면은 값이 없으면 그 자리를 통째로 비운다.
   */
  academicProgramPreview: AcademicProgramPreview | null;
}
