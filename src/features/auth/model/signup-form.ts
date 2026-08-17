import type { MbrSttsCd } from "@/shared/config/codes";
import { API_ERROR, ApiError } from "@/shared/lib/api/client";

/*
 * 회원가입 폼의 값·검증·요청 변환. 화면(views/signup)은 렌더링만 하고 규칙은 여기 모은다 —
 * "재학이면 학번이 필수" 같은 판단이 JSX 사이에 흩어지면 상태 전환 때마다 빠뜨리게 된다.
 *
 * 필드명을 DB 컬럼명(mbrNm · stdntNo …)이 아니라 서버 요청 본문 이름으로 둔 것은 의도한 것이다.
 * entities/session의 세션 타입과 같은 이유로, 계약이 바뀌었을 때 고칠 곳이 한눈에 보인다.
 */

/** 가입 화면에서 고를 수 있는 회원_상태 — 나머지 상태(휴학·탈퇴 등)는 운영진이 바꾼다 */
export type SignupStatusCode = Extract<MbrSttsCd, "ENROLLED" | "GRADUATED">;

export interface SignupFormValues {
  name: string;
  phoneNumber: string;
  studentNumber: string;
  departmentName: string;
  academicYear: string;
  generationNumber: string;
}

export type SignupField = keyof SignupFormValues;

export type SignupFieldErrors = Partial<Record<SignupField, string>>;

/**
 * POST /v1/members/signup 요청 본문 (ssccops-server #21).
 *
 * eml · auth_user_id · mbr_grd_cd(TEMP) · join_ymd는 서버가 토큰과 현재 시각으로 채우므로
 * 여기에 없다. 클라이언트가 보낸 값을 믿고 저장하면 남의 계정으로도 가입할 수 있다.
 *
 * 선택 항목이 `?`인 것은 "빈 문자열을 보내지 않기" 위해서다 — stdnt_no는 UNIQUE라
 * 빈 문자열로 저장하면 두 번째 졸업 회원부터 중복으로 막힌다. 값이 없으면 키 자체를 빼고
 * (JSON.stringify가 undefined 키를 지운다) 서버가 NULL로 저장하게 한다.
 */
export interface SignupRequest {
  name: string;
  phoneNumber: string;
  memberStatusCode: SignupStatusCode;
  studentNumber?: string;
  departmentName?: string;
  academicYear?: number;
  generationNumber?: number;
}

export const EMPTY_SIGNUP_VALUES: SignupFormValues = {
  name: "",
  phoneNumber: "",
  studentNumber: "",
  departmentName: "",
  academicYear: "",
  generationNumber: "",
};

/*
 * 학번은 mbr.stdnt_no(V20)이고 입학연도 4자리 + 일련번호 형태다. 목 데이터에는 9자리,
 * 오래된 학번은 8자리도 있어 자릿수를 하나로 못 박지 않고 숫자 8~10자리로만 거른다.
 */
const STUDENT_NUMBER_PATTERN = /^\d{8,10}$/;
/** 휴대전화만 받는다 — 가입 안내·알림이 개인 번호로 나간다 */
const PHONE_NUMBER_PATTERN = /^01[016-9]-?\d{3,4}-?\d{4}$/;
const DIGITS_ONLY = /^\d+$/;

/** 하이픈이 있든 없든 같은 값으로 저장되도록 010-1234-5678 형태로 맞춘다 */
export function normalizePhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return value.trim();
}

/** 재학 회원만 학적 정보(학번·학과·학년)가 필수다 — 졸업 회원은 기억나지 않으면 비워둘 수 있다 */
export function requiresAcademicInfo(statusCode: SignupStatusCode): boolean {
  return statusCode === "ENROLLED";
}

/**
 * 제출 가능한 값인지 검사해 필드별 메시지를 돌려준다.
 *
 * 서버도 같은 규칙을 검증하지만, 왕복 한 번 없이 어느 칸이 잘못됐는지 알려주는 편이
 * 사용자에게 훨씬 빠르다. 서버 응답은 어느 필드가 문제인지 알려주지 않는다.
 */
export function validateSignup(
  values: SignupFormValues,
  statusCode: SignupStatusCode,
): SignupFieldErrors {
  const errors: SignupFieldErrors = {};
  const academic = requiresAcademicInfo(statusCode);

  if (!values.name.trim()) errors.name = "회원명을 입력하세요";

  const phoneNumber = values.phoneNumber.trim();
  if (!phoneNumber) {
    errors.phoneNumber = "전화번호를 입력하세요";
  } else if (!PHONE_NUMBER_PATTERN.test(phoneNumber)) {
    errors.phoneNumber = "전화번호는 010-1234-5678 형식으로 입력하세요";
  }

  const studentNumber = values.studentNumber.trim();
  if (!studentNumber) {
    if (academic) errors.studentNumber = "학번을 입력하세요";
  } else if (!STUDENT_NUMBER_PATTERN.test(studentNumber)) {
    errors.studentNumber = "학번은 숫자 8~10자리입니다";
  }

  if (academic && !values.departmentName.trim()) {
    errors.departmentName = "학과를 입력하세요";
  }

  const academicYear = values.academicYear.trim();
  if (!academicYear) {
    if (academic) errors.academicYear = "학년을 입력하세요";
  } else if (!DIGITS_ONLY.test(academicYear) || Number(academicYear) < 1 || Number(academicYear) > 4) {
    errors.academicYear = "학년은 1~4 사이의 숫자입니다";
  }

  const generationNumber = values.generationNumber.trim();
  if (generationNumber && (!DIGITS_ONLY.test(generationNumber) || Number(generationNumber) < 1)) {
    errors.generationNumber = "기수는 1 이상의 숫자입니다";
  }

  return errors;
}

export function hasErrors(errors: SignupFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * 검증을 통과한 폼 값을 요청 본문으로 옮긴다.
 *
 * 예전에는 `Number(f.scyrNo) || null`로 조용히 삼켰다 — "3학년"처럼 잘못 입력해도 값이
 * null로 바뀌어 아무 말 없이 학년 없는 회원이 만들어졌다. 여기서는 이미 검증된 값만 받는다.
 */
export function buildSignupRequest(
  values: SignupFormValues,
  statusCode: SignupStatusCode,
): SignupRequest {
  const studentNumber = values.studentNumber.trim();
  const departmentName = values.departmentName.trim();
  const academicYear = values.academicYear.trim();
  const generationNumber = values.generationNumber.trim();

  return {
    name: values.name.trim(),
    phoneNumber: normalizePhoneNumber(values.phoneNumber),
    memberStatusCode: statusCode,
    // 빈 값은 키째 빼서 서버가 NULL로 저장하게 한다 (위 SignupRequest 주석 참고)
    studentNumber: studentNumber || undefined,
    departmentName: departmentName || undefined,
    academicYear: academicYear ? Number(academicYear) : undefined,
    generationNumber: generationNumber ? Number(generationNumber) : undefined,
  };
}

/* ── 서버 오류 코드 → 화면 처리 ─────────────────────────────── */

/** 가입 요청이 돌려주는 오류 코드 (운영관리 API 정의서 03_오류_코드) */
export const SIGNUP_ERROR = {
  VALIDATION_FAILED: "VALIDATION_FAILED",
  /** 상태 코드가 기준 코드에 없다 — 칩을 다시 고르게 한다 */
  INVALID_CODE_VALUE: "INVALID_CODE_VALUE",
  STUDENT_NUMBER_DUPLICATED: "STUDENT_NUMBER_DUPLICATED",
  /** 이미 가입된 계정 — 중복 제출·뒤로가기로 온다. 실패가 아니라 완료로 다룬다 */
  ALREADY_SIGNED_UP: "ALREADY_SIGNED_UP",
} as const;

/**
 * 가입 실패를 화면이 붙일 자리별로 나눈다.
 *
 * - `field` 해당 입력칸 아래 인라인 에러
 * - `status` 재학/졸업 칩 재선택 유도
 * - `form` 어느 칸의 문제인지 알 수 없는 실패 — 제출 버튼 위에 한 줄
 * - `already-signed-up` 오류가 아니다. 세션을 다시 받아 서비스로 들여보낸다
 * - `student-number-duplicated` 막다른 오류가 아니다. 연결 경로로 안내한다 (아래 주석)
 */
export type SignupFailure =
  | { kind: "field"; field: SignupField; message: string }
  | { kind: "status"; message: string }
  | { kind: "form"; message: string }
  | { kind: "already-signed-up" }
  | { kind: "student-number-duplicated" };

export function toSignupFailure(error: unknown): SignupFailure {
  if (!(error instanceof ApiError)) {
    return { kind: "form", message: "회원 가입에 실패했습니다. 잠시 후 다시 시도해주세요" };
  }

  switch (error.code) {
    case SIGNUP_ERROR.ALREADY_SIGNED_UP:
      return { kind: "already-signed-up" };

    case SIGNUP_ERROR.STUDENT_NUMBER_DUPLICATED:
      /*
       * **이 코드가 오는 경우는 사실상 하나다 — 본인이 이미 명부에 있다**(CSV로 이관된 회원이
       * 처음 로그인해 자기 학번을 넣었다). 그래서 인라인 오류로 끝내지 않는다.
       *
       * 예전에는 학번 칸에 "이미 등록된 학번입니다. 운영진에게 문의해주세요"를 붙였다. 그 문장을
       * 본 사람이 실제로 하는 일은 둘 중 하나였다 — 아무것도 못 하고 멈추거나, **학번을 지우고
       * 가입**하거나. 뒤쪽이 더 나쁘다: 통과는 되지만 같은 사람이 명부에 두 줄이 되고 이관된 줄은
       * 로그인 없는 유령으로 남는다. 이제는 자동으로 이어 붙이지 않는다는 원칙(#3)은 그대로
       * 두되, 본인임을 스스로 증명할 수 있는 경로(연결 화면 · #58)로 보낸다.
       *
       * 문장을 여기서 만들지 않고 종류만 돌려주는 것은 화면이 붙여야 할 것이 한 줄이 아니라
       * **버튼이 달린 안내**이기 때문이다(views/signup/ui/signup-page.tsx).
       */
      return { kind: "student-number-duplicated" };

    case SIGNUP_ERROR.INVALID_CODE_VALUE:
      return { kind: "status", message: "재학 · 졸업 상태를 다시 선택해주세요" };

    case SIGNUP_ERROR.VALIDATION_FAILED:
      // 서버는 어느 필드가 문제인지 내려주지 않는다 — 메시지를 그대로 보여 준다
      return { kind: "form", message: error.message };

    case API_ERROR.CONFIG_MISSING:
      return {
        kind: "form",
        message: "API 서버 주소가 설정되지 않았습니다 (NEXT_PUBLIC_API_BASE_URL)",
      };

    case API_ERROR.NETWORK_ERROR:
      return { kind: "form", message: "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요" };

    default:
      return { kind: "form", message: error.message };
  }
}
