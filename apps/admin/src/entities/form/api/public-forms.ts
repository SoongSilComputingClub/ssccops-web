import { ApiError, apiFetch } from "@/shared/lib/api/client";
import type { QitemCpstCn } from "../model/types";
import { FORM_ERROR } from "./forms";

/*
 * 응답자용 공개 폼 조회 API (ssccops-server #35 · PublicFormController).
 *
 * **운영자용 조회(api/forms.ts)와 파일을 나눈다.** 서버가 컨트롤러와 응답 스키마를 나눈 것과
 * 같은 이유다 — 응답자에게는 생성자·응답 집계·`formSttsCd`를 줄 이유가 없고, 한 파일에서
 * 두 응답을 함께 다루면 운영자용 필드가 늘 때마다 공개 링크 쪽으로 새어 나갈 것이 함께 는다.
 *
 * 이 경로도 **인증이 필요하다**. '공개'는 링크를 아는 누구나 열 수 있다는 뜻이지 익명 제출이
 * 아니다(ssccops #61) — 응답자는 전원 회원이며, 미가입 주체는 apiFetch가 403 SIGNUP_REQUIRED를
 * 보고 가입 화면으로 보낸다.
 */

/* ── 서버 응답(Response DTO) ────────────────────────────────── */

interface PublicFormApiResponse {
  formId: number | null;
  formTtlNm: string | null;
  rcptBgngDt: string | null;
  rcptEndDt: string | null;
  qitemCpstCn: QitemCpstCn | null;
  mltplRspnsYn: boolean | null;
  alreadySubmitted: boolean | null;
  myResponseCount: number | null;
  submittedAt: string | null;
}

/* ── 오류 코드 ─────────────────────────────────────────────── */

/**
 * 응답자 화면이 분기에 쓰는 오류 코드 (ssccops-server FormErrorCode).
 *
 * 폼 조회·자동 저장·제출이 **하나의 enum**을 공유하므로(서버도 `FormErrorCode` 하나다) 코드
 * 목록도 한곳에 둔다. 화면이 어느 요청에서 받았는지에 따라 문구만 달라진다.
 */
export const PUBLIC_FORM_ERROR = {
  /**
   * 404 — 없는 폼.
   *
   * **서버 enum 이름은 `FORM_NOT_FOUND`지만 응답 본문에 실리는 코드 문자열은 `"NOT_FOUND"`다**
   * (`FormErrorCode.FORM_NOT_FOUND`의 두 번째 인자). 이름으로 짐작해 분기하면 영원히 맞지 않는다.
   */
  FORM_NOT_FOUND: FORM_ERROR.FORM_NOT_FOUND,
  /**
   * 409 — 지금 응답을 받지 않는 폼.
   *
   * DRAFT·CLOSED·접수 기간 전·접수 기간 후가 **전부 이 코드 하나로** 온다. 넷을 구분해 주면
   * 링크만 가진 사람에게 폼의 준비 상태가 새어 나가므로 서버가 일부러 묶었다. 문항이 실린
   * 200을 받는 경로는 없다 — 이 코드를 받으면 화면은 문항을 그리지 않는다.
   */
  FORM_NOT_ACCEPTING: "FORM_NOT_ACCEPTING",
  /**
   * 409 — 더 낼 수 없는 폼. 자동 저장·제출 양쪽에서 온다.
   *
   * 뜻이 좁아졌다 (ssccops-server #141 · #143). 심사를 기다리는 중이거나 이미 승인된 응답에만
   * 붙으며, 수정요청받은 응답은 재제출이 열려 있고 반려는 아래 코드로 갈렸다. 다중 응답 폼은
   * 이미 몇 건을 냈어도 여기 걸리지 않는다 — 그 폼에서 이 코드가 오는 것은 이어 쓸 응답이
   * 심사 중일 때뿐이다.
   */
  RESPONSE_ALREADY_SUBMITTED: "RESPONSE_ALREADY_SUBMITTED",
  /**
   * 409 — 반려된 응답을 다시 내려 했다 (ssccops-server #141).
   *
   * `RESPONSE_ALREADY_SUBMITTED`와 코드가 갈린 것은 **응답자가 할 수 있는 일이 다르기**
   * 때문이다. "이미 제출했다"는 기다리면 결과가 나온다는 뜻이지만 반려는 그 응답에 대해
   * 끝났다는 뜻이라, 같은 문구를 돌려주면 응답자는 오지 않을 통보를 기다린다.
   *
   * 이 코드가 실제로 보이는 것은 1건 폼이다 — 다중 응답 폼에서는 반려된 응답만 남아 있어도
   * 새 응답이 만들어지므로 여기까지 오지 않는다.
   */
  RESPONSE_ALREADY_REJECTED: "RESPONSE_ALREADY_REJECTED",
  /** 409 — 첫 자동 저장이 동시에 도착해 부딪혔다. **서버가 재시도를 요구하는 유일한 409다** */
  RESPONSE_SAVE_CONFLICT: "RESPONSE_SAVE_CONFLICT",
  /** 413 — 답 전체가 10만 자를 넘었다. 자동 저장·제출 모두에 걸린다 */
  RESPONSE_CONTENT_TOO_LARGE: "RESPONSE_CONTENT_TOO_LARGE",
  /** 400 — 폼에 없는 qitemId가 섞였다. 문항이 바뀐 낡은 화면이라는 뜻이다 */
  UNKNOWN_QUESTION_ITEM: "UNKNOWN_QUESTION_ITEM",
  /** 400 — 문항 유형과 맞지 않는 값(다중선택인데 문자열 등). 자동 저장에서도 걸린다 */
  INVALID_ANSWER_VALUE: "INVALID_ANSWER_VALUE",
  /** 400 — 필수 문항 누락. **제출에서만** 걸린다 */
  REQUIRED_ANSWER_MISSING: "REQUIRED_ANSWER_MISSING",
  /** 400 — 정규식 불일치. **제출에서만** 걸린다 */
  ANSWER_PATTERN_MISMATCH: "ANSWER_PATTERN_MISMATCH",
  /** 400 — 최대 선택 수 초과. **제출에서만** 걸린다 */
  ANSWER_SELECTION_LIMIT_EXCEEDED: "ANSWER_SELECTION_LIMIT_EXCEEDED",
  /** 422 — 저장된 문항 구성을 서버가 읽지 못했다 */
  FORM_CONTENT_MALFORMED: "FORM_CONTENT_MALFORMED",
} as const;

/* ── 조회 ──────────────────────────────────────────────────── */

/**
 * 응답자가 보는 폼.
 *
 * `qitemCpstCn`이 이 객체에 실려 있다는 것 자체가 "지금 답을 낼 수 있다"는 뜻이다 — 접수
 * 불가인 폼은 문항을 뺀 200이 아니라 409로 끊기므로 여기까지 오지 않는다.
 */
export interface PublicForm {
  formId: number;
  formTtlNm: string;
  rcptBgngDt: string | null;
  rcptEndDt: string | null;
  qitemCpstCn: QitemCpstCn;
  /**
   * 이 폼이 한 사람의 여러 건을 받는가 (ssccops-server #143).
   *
   * 켜져 있으면 이미 낸 뒤에도 또 내는 것이 정상이라, 화면은 제출 내역이 아니라 작성 폼을
   * 계속 보여준다. 건별 상태는 이 응답이 아니라 GET .../responses/mine이 준다.
   */
  mltplRspnsYn: boolean;
  /**
   * **"냈는가"가 아니라 "더 낼 수 없는가"다** (ssccops-server #143에서 뜻이 좁아졌다).
   *
   * 1건 폼에서는 두 뜻이 완전히 같아 서버가 필드 이름을 바꾸지 않았고, 다중 응답 폼에서만
   * 갈린다 — 그쪽은 이미 두 건을 냈어도 false다. 임시저장(DRAFT)은 어느 쪽에서도 제출로
   * 치지 않는다.
   */
  alreadySubmitted: boolean;
  /** 내가 이 폼에 **낸** 건수 (임시저장은 빠진다). 1건 폼에서는 0 아니면 1이다 */
  myResponseCount: number;
  /**
   * **마지막** 제출 일시 (Asia/Seoul 오프셋 포함). 한 건도 내지 않았으면 null.
   *
   * 다중 응답 폼에서는 `alreadySubmitted`가 false인데도 값이 있을 수 있다 — 두 필드가 묻는
   * 것이 다르다(하나는 지금 낼 수 있는가, 다른 하나는 마지막으로 언제 냈는가).
   */
  submittedAt: string | null;
}

/**
 * GET /v1/forms/{formId}/public — 응답자용 폼 조회.
 *
 * 운영자용 목록·상세에서 폼을 꺼내 쓰지 않는다. 응답자에게는 `GET /v1/forms` 자체가 열려 있지
 * 않고(운영 화면용 경로다), 무엇보다 접수 가능 여부 판정이 이 경로에만 걸려 있어서 목록에서
 * 꺼낸 폼으로 그리면 DRAFT·마감된 폼의 문항이 그대로 보인다.
 */
export async function fetchPublicForm(formId: number): Promise<PublicForm> {
  const res = await apiFetch<PublicFormApiResponse | null>(`/v1/forms/${formId}/public`);

  /*
   * 문항 구성이 비어 오면 폴백으로 빈 폼을 그리지 않고 그 자리에서 끊는다. 편집기(#8)와 판단이
   * 다른 것은 화면의 목적이 다르기 때문이다 — 편집기는 빈 폼에서 시작해 채워 나가는 화면이지만,
   * 여기서 문항이 0개라는 것은 응답자가 아무것도 입력할 수 없는데 '제출하기'만 보인다는 뜻이다.
   */
  if (!res?.qitemCpstCn) {
    throw new ApiError(
      PUBLIC_FORM_ERROR.FORM_CONTENT_MALFORMED,
      "폼의 문항 구성을 불러오지 못했습니다. 잠시 후 다시 시도해주세요",
    );
  }

  return {
    formId: res.formId ?? formId,
    formTtlNm: res.formTtlNm ?? "",
    rcptBgngDt: res.rcptBgngDt,
    rcptEndDt: res.rcptEndDt,
    qitemCpstCn: res.qitemCpstCn,
    /*
     * **서버가 true라고 말할 때만 여러 건을 받는 폼이다.** 이 필드를 모르는 배포의 응답을
     * true로 읽으면, 1건 폼에서 제출을 마친 응답자에게 작성 화면이 계속 보이고 다시 낼 수
     * 있는 것처럼 굴다 제출에서 409를 받는다.
     */
    mltplRspnsYn: res.mltplRspnsYn === true,
    alreadySubmitted: res.alreadySubmitted === true,
    myResponseCount: res.myResponseCount ?? 0,
    submittedAt: res.submittedAt,
  };
}
