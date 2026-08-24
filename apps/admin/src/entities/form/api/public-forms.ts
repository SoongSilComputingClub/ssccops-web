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
  alreadySubmitted: boolean | null;
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
  /** 409 — 이미 제출한 폼. 자동 저장·제출 양쪽에서 온다 */
  RESPONSE_ALREADY_SUBMITTED: "RESPONSE_ALREADY_SUBMITTED",
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
  /** 이미 제출을 마쳤는가. 임시저장(DRAFT)은 제출로 치지 않는다 */
  alreadySubmitted: boolean;
  /** 제출 일시 (Asia/Seoul 오프셋 포함). 미제출이면 null */
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
    alreadySubmitted: res.alreadySubmitted === true,
    submittedAt: res.submittedAt,
  };
}
