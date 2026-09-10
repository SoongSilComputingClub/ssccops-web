import { MEMBER_LINK_ERROR, type MemberLinkRequest } from "@/entities/member";
import { AUTH_ERROR } from "@/shared/api/auth-error";
import { API_ERROR, ApiError } from "@/shared/api/client";

/*
 * 기존 회원 연결 폼의 값·검증·요청 변환 (#364 · 어드민 #58 · 서버 #86 · ssccops#78 A안).
 *
 * 어드민의 `features/auth/model/link-form.ts`를 옮겨 온 것이다. **옮긴 것은 코드가 아니라
 * 판단이다** — 아래 두 규칙은 옆의 가입 폼(`signup-form.ts`)과 정반대이며, 둘 다 이유가 있다.
 *
 * 1. 값을 정규화하지 않는다. 가입은 전화번호를 `010-1234-5678`로 맞춰 보내지만(저장 형식을
 *    화면이 정한다), 연결은 **비교만** 한다. 판정하는 쪽은 서버이며 숫자만 남겨 대조하므로
 *    화면이 한 번 더 손대면 정규화 규칙이 두 벌이 된다 — 두 벌은 반드시 갈리고, 갈리는 순간
 *    "명부에 있는데 연결이 안 되는" 회원이 생긴다. 그 실패는 404 하나로만 보여 원인이 보이지
 *    않는다. 그래서 여기서는 사용자가 친 문자열을 그대로 싣는다.
 * 2. 실패를 항목별로 나누지 않는다. 아래 {@link toMemberLinkFailure} 주석 참고.
 *
 * ── 왜 공유 패키지로 올리지 않았는가 ─────────────────────────
 * 어드민과 이 앱이 같은 것을 부르지만 **감싸고 있는 것이 전부 다르다.** 어드민의 `apiFetch`는
 * 401·403을 리다이렉트로 끝내고(공개 앱은 밀어낼 로그인 화면이 없어 오류로 올린다), 성공 뒤
 * 가는 곳도 다르며(가입 완료 화면 ↔ 지금 이 자리의 신청서), 오류를 그리는 부품도 다르다 —
 * `Button`·토스트가 앱마다 다르다는 것은 ssccops-web#322·#335에서 두 번 확인됐다. 실제로
 * 공유할 수 있는 것은 문자열 상수 몇 개뿐이라, 지금 올리면 두 앱의 차이를 옵션으로 받는
 * 껍데기가 하나 늘 뿐이다. **대신 판단이 갈리지 않도록 근거를 양쪽 주석에 서로 가리켜 둔다.**
 */

export interface MemberLinkFormValues {
  studentNumber: string;
  name: string;
  phoneNumber: string;
}

export type MemberLinkField = keyof MemberLinkFormValues;

export type MemberLinkFieldErrors = Partial<Record<MemberLinkField, string>>;

export const EMPTY_MEMBER_LINK_VALUES: MemberLinkFormValues = {
  studentNumber: "",
  name: "",
  phoneNumber: "",
};

/**
 * 보내기 전에 걸러야 하는 것은 **비어 있는가** 하나뿐이다.
 *
 * 형식 검사(학번 자릿수·전화번호 모양)를 넣지 않는 것은 의도한 것이다. 명부에는 이관 과정에서
 * 들어온 옛 표기가 그대로 있어(8자리 학번, `01012345678`처럼 하이픈 없는 번호), 화면이 가입
 * 폼과 같은 정규식으로 거르면 **명부에 실재하는 값을 화면이 먼저 거절한다.** 그러면 사용자는
 * 서버에 물어볼 기회조차 없이 막히고, 유일한 우회로인 운영진 문의로도 가지 않는다.
 *
 * 빈 값만 막는 이유는 반대다 — 세 값이 모두 있어야 후보가 한 명으로 좁혀지므로, 빈 칸으로
 * 보내면 왕복 한 번을 버리고 시도 횟수(429)만 깎아 먹는다.
 */
export function validateMemberLink(values: MemberLinkFormValues): MemberLinkFieldErrors {
  const errors: MemberLinkFieldErrors = {};
  if (!values.studentNumber.trim()) errors.studentNumber = "학번을 입력해주세요";
  if (!values.name.trim()) errors.name = "이름을 입력해주세요";
  if (!values.phoneNumber.trim()) errors.phoneNumber = "전화번호를 입력해주세요";
  return errors;
}

export function hasMemberLinkErrors(errors: MemberLinkFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** 폼 값 → 요청 본문. 이름만 서버 계약에 맞춰 옮길 뿐 값은 손대지 않는다(파일 상단 주석) */
export function buildMemberLinkRequest(values: MemberLinkFormValues): MemberLinkRequest {
  return {
    stdntNo: values.studentNumber,
    mbrNm: values.name,
    telno: values.phoneNumber,
  };
}

/* ── 서버 오류 코드 → 화면 처리 ─────────────────────────────── */

/**
 * 연결 실패를 화면이 할 일별로 나눈다.
 *
 * - `form` 폼 위에 한 줄. **어느 칸이 틀렸는지는 말하지 않는다**
 * - `locked` 시도 횟수 초과 — 문장과 함께 입력을 잠근다
 * - `already-linked` 실패가 아니다. 이미 회원이므로 그대로 신청서로 넘긴다
 *
 * ── 왜 `field` 갈래가 없는가 ────────────────────────────────
 * **서버가 어느 항목이 틀렸는지 알려주지 않기 때문이고, 그것이 설계다**(VR-M23). 화면이
 * "전화번호가 다릅니다" 같은 문장을 지어내려면 세 값 중 무엇이 맞았는지를 알아야 하는데, 그
 * 정보가 화면에 있으면 학번만 바꿔 가며 두드려 남의 이름·연락처를 맞혀 볼 수 있다 — 연결 폼이
 * 곧 명부 조회 도구가 된다. 시도 횟수 제한(429)도 같은 것을 막으려고 서버에 있다. 그래서 세
 * 값이 모두 필요하다는 사실은 **누르기 전에** 알리고, 실패한 뒤에는 좁혀 주지 않는다.
 *
 * 이 화면은 로그인 없이 열리지 않지만(신청 흐름이 구글 로그인 뒤에 그린다) 폼을 채우는 동안
 * 토큰이 죽을 수는 있다. 그때는 `form` 한 줄로 다시 로그인하라고만 말한다 — 공개 앱에는
 * 밀어낼 로그인 화면이 없고, 로그인은 지금 보고 있는 화면 위에서 다시 시작한다.
 */
export type MemberLinkFailure =
  | { kind: "form"; message: string }
  | { kind: "locked"; message: string }
  | { kind: "already-linked" };

export function toMemberLinkFailure(error: unknown): MemberLinkFailure {
  if (!(error instanceof ApiError)) {
    return { kind: "form", message: "연결하지 못했습니다 — 잠시 후 다시 시도해주세요" };
  }

  switch (error.code) {
    /*
     * 이미 가입(또는 연결)이 끝난 계정이다. 중복 제출·뒤로 가기로 온다. 실패로 그릴 것이
     * 아니라 이미 도달한 상태(회원)로 다뤄 신청서 작성으로 넘긴다 — 가입 실패 처리
     * (`signup-form.ts`의 `already-signed-up`)와 같은 판단이다.
     */
    case MEMBER_LINK_ERROR.ALREADY_SIGNED_UP:
      return { kind: "already-linked" };

    /*
     * 여기서 사용자가 다음에 할 일이 정해져 있어 서버 문구를 화면 문구로 바꾸는 유일한
     * 자리다 — 다시 쳐 보거나, 연락처가 명부에 없어 애초에 연결이 될 수 없는 경우라면
     * 운영진 문의다. 그 두 갈래를 문장이 함께 담아야 한다.
     */
    case MEMBER_LINK_ERROR.MEMBER_LINK_FAILED:
      return {
        kind: "form",
        message: "입력한 정보와 일치하는 회원을 찾지 못했습니다 — 운영진에게 문의해주세요",
      };

    case MEMBER_LINK_ERROR.MEMBER_ALREADY_LINKED:
      return {
        kind: "form",
        message: "이미 다른 계정과 연결된 회원입니다 — 본인이 맞다면 운영진에게 문의해주세요",
      };

    /*
     * 남은 대기 시간을 아는 것은 서버뿐이라(우리 쪽에는 헤더도 필드도 오지 않는다) 서버 문장이
     * 있으면 그대로 보여 준다. 화면이 "5분 뒤" 같은 숫자를 지어내면 그 시각에 다시 눌러도
     * 똑같이 막히고, 사용자는 무엇을 기다려야 하는지 알 수 없게 된다.
     */
    case MEMBER_LINK_ERROR.TOO_MANY_LINK_ATTEMPTS:
      return {
        kind: "locked",
        message: error.message || "연결 시도가 너무 많습니다 — 잠시 후 다시 시도해주세요",
      };

    case AUTH_ERROR.UNAUTHENTICATED:
    case AUTH_ERROR.UNAUTHORIZED:
      return {
        kind: "form",
        message: "로그인이 풀렸습니다 — 새로고침한 뒤 다시 로그인해주세요",
      };

    case API_ERROR.CONFIG_MISSING:
      return {
        kind: "form",
        message: "서비스 설정이 끝나지 않아 연결할 수 없습니다 — 잠시 후 다시 시도해주세요",
      };

    case API_ERROR.NETWORK_ERROR:
      return {
        kind: "form",
        message: "서버에 연결하지 못했습니다 — 네트워크 상태를 확인한 뒤 다시 시도해주세요",
      };

    default:
      /*
       * 코드 문자열이 서버 enum 이름과 갈리는 경우가 실제로 있어(회원 API의 MEMBER_NOT_FOUND가
       * 코드로는 "NOT_FOUND"다) 상태로 한 번 더 받아 준다. 여기까지 온 404·429를 "알 수 없는
       * 오류"로 흘리면, 잠긴 줄 모르고 계속 두드려 잠금만 길어진다.
       */
      if (error.status === 401) {
        return {
          kind: "form",
          message: "로그인이 풀렸습니다 — 새로고침한 뒤 다시 로그인해주세요",
        };
      }
      if (error.status === 404) {
        return {
          kind: "form",
          message: "입력한 정보와 일치하는 회원을 찾지 못했습니다 — 운영진에게 문의해주세요",
        };
      }
      if (error.status === 429) {
        return {
          kind: "locked",
          message: error.message || "연결 시도가 너무 많습니다 — 잠시 후 다시 시도해주세요",
        };
      }
      return { kind: "form", message: "연결하지 못했습니다 — 잠시 후 다시 시도해주세요" };
  }
}
