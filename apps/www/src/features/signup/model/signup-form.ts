import { SIGNUP_ERROR, type SignupRequest, type SignupStatusCode } from "@/entities/member";
import { API_ERROR, ApiError } from "@/shared/api/client";

/*
 * 간편 가입 폼의 값·검증·요청 변환 (wave2 §8-4).
 *
 * ── 왜 어드민보다 짧은가 ────────────────────────────────────
 * 신청 버튼 → 로그인 → 가입 → 폼 작성의 4단계는 이탈이 크고, 가장 줄일 수 있는 것이 가입
 * 폼이다. 그래서 **입력란을 최소로 줄였다** — 어드민 가입 화면에 있는 기수(선택 · 운영진이
 * 배정한다)를 여기서는 받지 않는다. 값이 없으면 요청에서 키째 빠지고 운영진이 나중에 채우는
 * 항목이라, 신청하러 온 사람에게 물을 이유가 없다.
 *
 * ── 규칙 자체는 새로 만들지 않았다 ───────────────────────────
 * 필수 판정은 서버 `MemberSignupRequest`(+ `AcademicProfilePolicy`)와 같다 — **재학이면
 * 학번·학과·학년이 모두 필수**이고 졸업이면 회원명·전화번호만 필수다. 서버도 같은 것을 보지만
 * 왕복 없이 어느 칸이 잘못됐는지 알려 주는 편이 훨씬 빠르고, 서버 응답은 어느 필드가 문제인지
 * 알려주지 않는다.
 */

export interface SignupFormValues {
  name: string;
  phoneNumber: string;
  studentNumber: string;
  departmentName: string;
  academicYear: string;
}

export type SignupField = keyof SignupFormValues;

export type SignupFieldErrors = Partial<Record<SignupField, string>>;

export const EMPTY_SIGNUP_VALUES: SignupFormValues = {
  name: "",
  phoneNumber: "",
  studentNumber: "",
  departmentName: "",
  academicYear: "",
};

/* 학번은 입학연도 4자리 + 일련번호 형태다. 오래된 학번은 8자리도 있어 숫자 8~10자리로만 거른다 */
const STUDENT_NUMBER_PATTERN = /^\d{8,10}$/;
/** 휴대전화만 받는다 — 선발·확정 안내가 개인 번호로 나간다 */
const PHONE_NUMBER_PATTERN = /^01[016-9]-?\d{3,4}-?\d{4}$/;
const DIGITS_ONLY = /^\d+$/;

/** 하이픈이 있든 없든 같은 값으로 저장되도록 010-1234-5678 형태로 맞춘다 */
export function normalizePhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return value.trim();
}

/** 재학 회원만 학적 정보(학번·학과·학년)가 필수다 — 서버 `AcademicProfilePolicy`와 같은 판정이다 */
export function requiresAcademicInfo(statusCode: SignupStatusCode): boolean {
  return statusCode === "ENROLLED";
}

/** 제출 가능한 값인지 검사해 칸별 문구를 돌려준다 */
export function validateSignup(
  values: SignupFormValues,
  statusCode: SignupStatusCode,
): SignupFieldErrors {
  const errors: SignupFieldErrors = {};
  const academic = requiresAcademicInfo(statusCode);

  if (!values.name.trim()) errors.name = "이름을 입력해 주세요";

  const phoneNumber = values.phoneNumber.trim();
  if (!phoneNumber) {
    errors.phoneNumber = "전화번호를 입력해 주세요";
  } else if (!PHONE_NUMBER_PATTERN.test(phoneNumber)) {
    errors.phoneNumber = "전화번호는 010-1234-5678 형식으로 입력해 주세요";
  }

  const studentNumber = values.studentNumber.trim();
  if (!studentNumber) {
    if (academic) errors.studentNumber = "학번을 입력해 주세요";
  } else if (!STUDENT_NUMBER_PATTERN.test(studentNumber)) {
    errors.studentNumber = "학번은 숫자 8~10자리입니다";
  }

  if (academic && !values.departmentName.trim()) {
    errors.departmentName = "학과를 입력해 주세요";
  }

  const academicYear = values.academicYear.trim();
  if (!academicYear) {
    if (academic) errors.academicYear = "학년을 입력해 주세요";
  } else if (
    !DIGITS_ONLY.test(academicYear) ||
    Number(academicYear) < 1 ||
    Number(academicYear) > 4
  ) {
    errors.academicYear = "학년은 1~4 사이의 숫자입니다";
  }

  return errors;
}

export function hasErrors(errors: SignupFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * 검증을 통과한 값을 요청 본문으로 옮긴다.
 *
 * 빈 값은 **키째 뺀다** — 학번은 UNIQUE 컬럼이라 빈 문자열로 저장하면 두 번째 졸업 회원부터
 * 중복으로 막힌다(`entities/member/api/signup.ts`의 요청 타입 주석).
 */
export function buildSignupRequest(
  values: SignupFormValues,
  statusCode: SignupStatusCode,
): SignupRequest {
  const studentNumber = values.studentNumber.trim();
  const departmentName = values.departmentName.trim();
  const academicYear = values.academicYear.trim();

  return {
    name: values.name.trim(),
    phoneNumber: normalizePhoneNumber(values.phoneNumber),
    memberStatusCode: statusCode,
    studentNumber: studentNumber || undefined,
    departmentName: departmentName || undefined,
    academicYear: academicYear ? Number(academicYear) : undefined,
  };
}

/* ── 서버 오류 → 화면이 할 일 ───────────────────────────────── */

/**
 * 가입 실패를 **화면이 붙일 자리별로** 나눈다.
 *
 * - `field` 그 칸 아래 인라인 문구
 * - `status` 재학·졸업 칩을 다시 고르게 한다
 * - `form` 어느 칸의 문제인지 알 수 없는 실패 — 버튼 위에 한 줄
 * - `already-signed-up` 오류가 아니다. 이미 회원이므로 그대로 신청서로 넘긴다
 * - `student-number-duplicated` 막다른 오류가 아니다 — 대개 **본인이 이미 명부에 있다**
 */
export type SignupFailure =
  | { kind: "field"; field: SignupField; message: string }
  | { kind: "status"; message: string }
  | { kind: "form"; message: string }
  | { kind: "already-signed-up" }
  | { kind: "student-number-duplicated" };

export function toSignupFailure(error: unknown): SignupFailure {
  if (!(error instanceof ApiError)) {
    return { kind: "form", message: "가입하지 못했습니다 — 잠시 후 다시 시도해 주세요" };
  }

  switch (error.code) {
    /*
     * 중복 제출·뒤로 가기로 이미 가입된 계정이 다시 제출한 경우다. 실패로 그릴 것이 아니라
     * 이미 도달한 상태(회원)로 다뤄 신청서 작성으로 넘긴다.
     */
    case SIGNUP_ERROR.ALREADY_SIGNED_UP:
      return { kind: "already-signed-up" };

    /*
     * 이 코드가 오는 경우는 사실상 하나다 — **본인이 이미 명부에 있다**(이관된 회원이 처음
     * 로그인해 자기 학번을 넣었다). 학번 칸을 붉히면 남은 선택지가 "학번을 지우고 가입"처럼
     * 보이고, 그렇게 하면 같은 사람이 명부에 두 줄이 된다. 문구 한 줄이 아니라 **안내와 갈 곳**을
     * 내줘야 하는 자리라 종류만 돌려주고 화면이 그린다.
     */
    case SIGNUP_ERROR.STUDENT_NUMBER_DUPLICATED:
      return { kind: "student-number-duplicated" };

    case SIGNUP_ERROR.INVALID_CODE_VALUE:
      return { kind: "status", message: "재학·졸업을 다시 선택해 주세요" };

    // 서버는 어느 칸이 문제인지 내려주지 않는다 — 서버 문구를 그대로 한 줄로 보여 준다
    case SIGNUP_ERROR.VALIDATION_FAILED:
      return { kind: "form", message: error.message };

    case API_ERROR.CONFIG_MISSING:
      return {
        kind: "form",
        message: "서비스 설정이 끝나지 않아 가입할 수 없습니다 — 잠시 후 다시 시도해 주세요",
      };

    case API_ERROR.NETWORK_ERROR:
      return {
        kind: "form",
        message: "서버에 연결하지 못했습니다 — 네트워크 상태를 확인한 뒤 다시 시도해 주세요",
      };

    default:
      return { kind: "form", message: "가입하지 못했습니다 — 잠시 후 다시 시도해 주세요" };
  }
}
