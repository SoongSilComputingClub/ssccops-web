"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ACADEMIC_YEAR_MAX,
  ACADEMIC_YEAR_MIN,
  CLUB_JOIN_MONTH_MAX,
  CLUB_JOIN_MONTH_MIN,
  MEMBER_FIELD_MAX,
  fetchGenerationNumber,
  updateMember,
  updateMyProfile,
  type MemberDetail,
  type MemberSelfUpdateInput,
  type MemberUpdateInput,
} from "@/entities/member";
import {
  syncSessionOnForbidden,
  useSessionStore,
  type MemberProfile,
} from "@/entities/session";
import type { MbrSttsCd } from "@/shared/config/codes";
import { useMemberDetail, type MemberDetailStatus } from "./use-member-detail";
import { toMemberSaveErrorMessage, toMyProfileSaveErrorMessage } from "./member-error";

/*
 * 회원 정보 수정 (#47 · 서버 #77) — 운영진 경로와 본인 경로.
 *
 * ── 왜 두 훅이 한 파일에 있는가 ─────────────────────────────────
 * 고칠 수 있는 필드는 다르지만 **규칙은 하나다** — 전체 교체 의미, 재학 회원의 학과·학년 필수,
 * 길이·범위 상한, 빈 칸을 null로 굳히는 방식이 모두 같다. 파일을 나누면 그 규칙이 두 벌이 되고,
 * 한쪽만 고친 규칙이 다른 화면에 남는다(서버가 검증 정책을 `AcademicProfilePolicy` 하나로
 * 모아 둔 것과 같은 이유다).
 *
 * ── 전체 교체를 화면이 어떻게 다루는가 ──────────────────────────
 * 서버의 PATCH는 메서드만 PATCH이고 본문은 한 벌 전체다. 생략한 선택 필드는 '건드리지 마라'가
 * 아니라 **'지워라'** 로 읽히므로, 폼을 서버 응답으로 채우고(`toValues`) 저장할 때 여덟 필드를
 * 언제나 모두 싣는다(`toUpdateInput`). '바뀐 것만 보내기'(features/role의 역할 수정이 하는 일)를
 * 여기서 따라 하면 손대지 않은 학과·연락처가 조용히 비워진다. 동아리 가입 연/월도 같다 —
 * 비워 두는 것이 정상인 값이라, 안 보내는 것과 지우는 것이 겉으로 구별되지 않는다.
 *
 * ── 화면 검증은 예고이고 판정은 서버다 ──────────────────────────
 * 아래 `validate`는 서버가 400으로 거절할 값을 왕복 한 번 없이 입력칸 옆에서 알려 주려는 것이다.
 * **최종 판정은 서버**이며(재학 여부는 `mbr_stts_cd`로, 규칙은 `AcademicProfilePolicy`로 본다),
 * 여기를 통과해도 거절될 수 있다. 그때는 서버가 준 메시지를 그대로 보여 준다
 * (`toMemberSaveErrorMessage`).
 */

/* ── 폼 값 ─────────────────────────────────────────────────── */

/**
 * 입력칸이 들고 있는 값. 숫자 항목도 문자열로 두는 것은 "3학년"처럼 잘못 친 값을 `Number()`가
 * 조용히 NaN·null로 바꿔 버리면 사용자는 자기가 무엇을 지웠는지 모른 채 저장하기 때문이다
 * (가입 폼이 같은 판단을 했다 · features/auth/model/signup-form.ts).
 */
export interface MemberEditValues {
  generationNumber: string;
  /** 동아리 가입 연도 — 기수 자동 채움의 입력이다. 비어 있을 수 있다 */
  clubJoinYear: string;
  /** 동아리 가입 월 — **모르면 비운다.** 비어 있는 것이 오류가 아니다 */
  clubJoinMonth: string;
  name: string;
  departmentName: string;
  academicYear: string;
  phoneNumber: string;
  email: string;
}

export type MemberEditField = keyof MemberEditValues;

export type MemberEditFieldErrors = Partial<Record<MemberEditField, string>>;

const DIGITS_ONLY = /^\d+$/;
/** 연도는 네 자리다 — 상한(기준 연도)은 서버가 쥐고 있어 화면이 숫자로 적지 않는다 */
const FOUR_DIGIT_YEAR = /^\d{4}$/;
/** 기수가 아직 정해지지 않았다 — 빈 칸과 0(미배정 센티널)이 같은 뜻이다 */
function generationUnassigned(value: string): boolean {
  const trimmed = value.trim();
  return trimmed === "" || Number(trimmed) === 0;
}

/** 서버가 준 회원(운영진 경로의 상세 · 본인 경로의 프로필)을 폼 값으로 편다 */
function toValues(
  member: Pick<
    MemberDetail,
    "generationNumber" | "name" | "departmentName" | "academicYear" | "phoneNumber" | "email"
  > &
    /*
     * 본인 경로가 넘기는 `MemberProfile`에는 동아리 가입 연/월이 아예 없다(서버 응답에도
     * 자리가 없다 · #214). 없으면 빈 칸으로 편다 — 본인 화면은 이 두 칸을 그리지도, 보내지도
     * 않으므로 값이 비어 있는 것이 옳다.
     */
    Partial<Pick<MemberDetail, "clubJoinYear" | "clubJoinMonth">>,
): MemberEditValues {
  return {
    // 0은 미배정 센티널이라 빈 칸으로 보여 준다 — "0기"라고 적힌 회원은 없다
    generationNumber: member.generationNumber ? String(member.generationNumber) : "",
    // null은 '아직 모른다'다 — 0으로 굳히지 않는다
    clubJoinYear: member.clubJoinYear == null ? "" : String(member.clubJoinYear),
    clubJoinMonth: member.clubJoinMonth == null ? "" : String(member.clubJoinMonth),
    name: member.name,
    departmentName: member.departmentName ?? "",
    academicYear: member.academicYear === null ? "" : String(member.academicYear),
    phoneNumber: member.phoneNumber ?? "",
    email: member.email ?? "",
  };
}

/** 빈 칸은 null이다 — 빈 문자열로 저장하면 "값이 있는데 안 보이는" 행이 생긴다 */
function trimToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}

/** 폼 값 → 운영진 경로 요청 본문. 여덟 필드를 언제나 모두 싣는다(전체 교체) */
function toUpdateInput(values: MemberEditValues): MemberUpdateInput {
  return {
    generationNumber: toNumberOrNull(values.generationNumber),
    clubJoinYear: toNumberOrNull(values.clubJoinYear),
    clubJoinMonth: toNumberOrNull(values.clubJoinMonth),
    name: values.name.trim(),
    departmentName: trimToNull(values.departmentName),
    academicYear: toNumberOrNull(values.academicYear),
    phoneNumber: trimToNull(values.phoneNumber),
    email: trimToNull(values.email),
  };
}

/** 폼 값 → 본인 경로 요청 본문. 기수·동아리 가입 연/월·이메일은 자리 자체가 없다 */
function toSelfUpdateInput(values: MemberEditValues): MemberSelfUpdateInput {
  const input = toUpdateInput(values);
  return {
    name: input.name,
    departmentName: input.departmentName,
    academicYear: input.academicYear,
    phoneNumber: input.phoneNumber,
  };
}

/**
 * 재학(`ENROLLED`) 회원인가 — 학과·학년이 필수인 상태인가.
 *
 * **판정 근거는 서버다.** 서버는 `MemberStatusCode.requiresAcademicProfile()`이 참인 상태에
 * 대해 `AcademicProfilePolicy`로 학과·학년을 요구하고, 어기면 400 `VALIDATION_FAILED`
 * (`ACADEMIC_PROFILE_REQUIRED`)로 거절한다. 화면의 이 함수는 그 400을 한 번 덜 왕복하려고
 * 같은 조건을 미리 보는 것뿐이며, 서버가 규칙을 넓히면(예: 휴학도 요구) 화면은 통과시키고
 * 서버가 막는다 — 반대(화면이 막고 서버가 허용)는 일어나지 않으므로 이 방향이 안전하다.
 */
export function requiresAcademicProfile(statusCode: MbrSttsCd): boolean {
  return statusCode === "ENROLLED";
}

/**
 * 저장 전 화면 검증. 길이·범위 상한은 데이터사전(`MEMBER_FIELD_MAX`)을 그대로 쓴다.
 *
 * `academicRequired`가 참이면 학과·학년이 필수다(위 `requiresAcademicProfile` 주석).
 */
export function validateMemberEdit(
  values: MemberEditValues,
  academicRequired: boolean,
): MemberEditFieldErrors {
  const errors: MemberEditFieldErrors = {};

  const name = values.name.trim();
  if (!name) {
    errors.name = "회원명을 입력하세요";
  } else if (name.length > MEMBER_FIELD_MAX.name) {
    errors.name = `회원명은 ${MEMBER_FIELD_MAX.name}자를 넘을 수 없습니다`;
  }

  const generationNumber = values.generationNumber.trim();
  if (generationNumber && !DIGITS_ONLY.test(generationNumber)) {
    // 0은 미배정이라 허용한다 — 서버도 @PositiveOrZero다
    errors.generationNumber = "기수는 0 이상의 숫자입니다";
  }

  const clubJoinYear = values.clubJoinYear.trim();
  if (clubJoinYear && !FOUR_DIGIT_YEAR.test(clubJoinYear)) {
    errors.clubJoinYear = "가입 연도는 2020처럼 네 자리 숫자로 입력하세요";
  }

  const clubJoinMonth = values.clubJoinMonth.trim();
  if (
    clubJoinMonth &&
    (!DIGITS_ONLY.test(clubJoinMonth) ||
      Number(clubJoinMonth) < CLUB_JOIN_MONTH_MIN ||
      Number(clubJoinMonth) > CLUB_JOIN_MONTH_MAX)
  ) {
    // 비어 있는 것은 오류가 아니다 — 모르는 달을 비워 두라고 만든 칸이다
    errors.clubJoinMonth = `가입 월은 ${CLUB_JOIN_MONTH_MIN}~${CLUB_JOIN_MONTH_MAX} 사이의 숫자입니다`;
  }

  const departmentName = values.departmentName.trim();
  if (!departmentName) {
    if (academicRequired) errors.departmentName = "재학 회원은 학과가 필요합니다";
  } else if (departmentName.length > MEMBER_FIELD_MAX.departmentName) {
    errors.departmentName = `학과는 ${MEMBER_FIELD_MAX.departmentName}자를 넘을 수 없습니다`;
  }

  const academicYear = values.academicYear.trim();
  if (!academicYear) {
    if (academicRequired) errors.academicYear = "재학 회원은 학년이 필요합니다";
  } else if (
    !DIGITS_ONLY.test(academicYear) ||
    Number(academicYear) < ACADEMIC_YEAR_MIN ||
    Number(academicYear) > ACADEMIC_YEAR_MAX
  ) {
    errors.academicYear = `학년은 ${ACADEMIC_YEAR_MIN}~${ACADEMIC_YEAR_MAX} 사이의 숫자입니다`;
  }

  const phoneNumber = values.phoneNumber.trim();
  if (phoneNumber.length > MEMBER_FIELD_MAX.phoneNumber) {
    errors.phoneNumber = `전화번호는 ${MEMBER_FIELD_MAX.phoneNumber}자를 넘을 수 없습니다`;
  }

  const email = values.email.trim();
  if (email.length > MEMBER_FIELD_MAX.email) {
    errors.email = `이메일은 ${MEMBER_FIELD_MAX.email}자를 넘을 수 없습니다`;
  }

  return errors;
}

function hasErrors(errors: MemberEditFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

function sameValues(a: MemberEditValues, b: MemberEditValues): boolean {
  return (
    a.generationNumber.trim() === b.generationNumber.trim() &&
    a.clubJoinYear.trim() === b.clubJoinYear.trim() &&
    a.clubJoinMonth.trim() === b.clubJoinMonth.trim() &&
    a.name.trim() === b.name.trim() &&
    a.departmentName.trim() === b.departmentName.trim() &&
    a.academicYear.trim() === b.academicYear.trim() &&
    a.phoneNumber.trim() === b.phoneNumber.trim() &&
    a.email.trim() === b.email.trim()
  );
}

/**
 * 연도 입력이 멎었다고 볼 때까지 기다리는 시간.
 *
 * 네 자리를 마저 치는 사이에 부르지 않을 만큼은 길고, 다음 칸으로 넘어가기 전에 값이 차 있을
 * 만큼은 짧다. blur가 나면 기다리지 않고 곧바로 부른다.
 */
const GENERATION_SUGGEST_DELAY_MS = 500;

const EMPTY_VALUES: MemberEditValues = {
  generationNumber: "",
  clubJoinYear: "",
  clubJoinMonth: "",
  name: "",
  departmentName: "",
  academicYear: "",
  phoneNumber: "",
  email: "",
};

/* ── 운영진 경로 ───────────────────────────────────────────── */

export interface MemberEdit {
  /** 조회 상태 — 폼은 ready 일 때만 그린다 (`useMemberDetail`과 같은 값) */
  status: MemberDetailStatus;
  /** status === "error"일 때 채워진다 */
  errorMessage: string;
  reload: () => void;
  /**
   * 서버가 준 원본. 학번·전산 가입일·등급·상태처럼 **고칠 수 없는 값**을 읽기 전용으로
   * 보여 준다. 동아리 가입 연/월은 여기 들어 있지만 읽기 전용이 아니다 — 이관 명부에 없던
   * 값이라 운영진이 뒤늦게 채우라고 연 입력란이다(#214).
   */
  member: MemberDetail | null;

  values: MemberEditValues;
  set: (patch: Partial<MemberEditValues>) => void;
  /** 저장을 한 번 누른 뒤부터 채워진다 — 아직 손대지 않은 칸을 미리 나무라지 않는다 */
  errors: MemberEditFieldErrors;
  /** 재학 회원이라 학과·학년이 필수인가 */
  academicRequired: boolean;

  /**
   * 연도 입력이 끝났을 때 기수 자동 채움을 시도한다 — 입력란의 blur에 건다.
   *
   * 타이핑마다 부르지 않는다(디바운스가 같은 일을 이미 한다). 이미 배정된 기수는 건드리지
   * 않으므로 여러 번 불려도 안전하다.
   */
  suggestGeneration: () => void;
  /** 방금 기수를 연도로 채웠는가 — 화면이 "자동으로 채웠다"를 알리는 근거다 */
  generationAutoFilled: boolean;
  /** 기수 자동 채움이 실패한 사유. 비어 있으면 정상 — 저장을 막지는 않는다 */
  generationSuggestError: string;

  dirty: boolean;
  saving: boolean;
  /** 마지막 저장이 실패한 사유(서버 문장 포함). 비어 있으면 정상 */
  saveErrorMessage: string;
  /** 성공하면 저장된 회원 — 화면은 이때만 상세로 돌아간다 */
  save: () => Promise<MemberDetail | null>;
}

/**
 * 운영진의 회원 정보 수정 (`MEMBER_MANAGE` · PATCH /v1/members/{memberId}).
 *
 * 조회는 상세 화면과 같은 훅(`useMemberDetail`)을 쓴다 — 수정 폼의 초기값은 **서버 응답**이어야
 * 하고(전체 교체라 폼에 없는 값은 지워진다), 목록에서 고른 회원을 들고 오면 URL로 바로 들어온
 * 경우 채울 값이 없다.
 */
export function useMemberEdit(memberId: number): MemberEdit {
  const { member, status, errorMessage, reload: reloadDetail } = useMemberDetail(memberId);

  /**
   * 사용자가 고친 값. **null은 "아직 손대지 않았다"**이고 그때 화면이 보여 주는 것은 서버 값
   * 그대로다 — 도착한 응답을 초안으로 복사해 넣는 효과(useEffect + setState)를 두지 않으려는
   * 것이다. 그 방식은 렌더를 한 번 더 돌리고, 조회가 다시 끝날 때마다 사용자가 입력하던 값을
   * 덮어쓸 자리를 만든다.
   */
  const [values, setValues] = useState<MemberEditValues | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState("");

  /* 기수를 연도로 채웠음을 화면이 알릴 근거 — 무심코 지나치는 것을 줄인다 */
  const [generationAutoFilled, setGenerationAutoFilled] = useState(false);
  const [generationSuggestError, setGenerationSuggestError] = useState("");
  /* 연도를 사람이 손댄 뒤에만 자동 채움이 돈다 — 화면을 열자마자 값이 움직이면 안 된다 */
  const [yearTouched, setYearTouched] = useState(false);

  const saved = member ? toValues(member) : null;
  const current = values ?? saved ?? EMPTY_VALUES;

  const academicRequired = member
    ? requiresAcademicProfile(member.membershipStatusCode)
    : false;
  const errors = attempted ? validateMemberEdit(current, academicRequired) : {};
  const dirty = saved !== null && !sameValues(current, saved);

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  /** 이미 기수를 물어본 연도. 디바운스와 blur가 같은 값을 두 번 묻는 것을 막는다 */
  const suggestedYearRef = useRef("");

  /*
   * 저장·입력이 **실행되는 시점**에 읽을 최신값. 콜백 자체는 의존성 없이 한 번만 만들어 둔다
   * (features/role의 역할 편집기와 같은 방식이다).
   */
  const contextRef = useRef({ current, academicRequired, dirty, memberId });
  useEffect(() => {
    contextRef.current = { current, academicRequired, dirty, memberId };
  });

  const set = useCallback((patch: Partial<MemberEditValues>) => {
    /*
     * 첫 입력만 서버 값 위에 얹는다(그 뒤로는 갱신 함수의 v가 최신이라 같은 틱에 이어지는
     * 입력도 서로를 덮지 않는다). 폼은 조회가 끝난 뒤에만 그려지므로 이때 서버 값은 이미 있다.
     */
    setValues((v) => ({ ...(v ?? contextRef.current.current), ...patch }));
    /* 서버가 거절한 사유는 값을 고치는 순간 낡은 문장이 된다 */
    setSaveErrorMessage("");

    if (patch.clubJoinYear !== undefined) {
      setYearTouched(true);
      setGenerationSuggestError("");
    }
    if (patch.generationNumber !== undefined) {
      /*
       * 사람이 기수를 직접 적었다 — '자동으로 채웠다'는 안내는 더 이상 사실이 아니고, 다시
       * 비웠다면 같은 연도로 한 번 더 물어볼 수 있어야 하므로 물어본 기록도 지운다.
       */
      setGenerationAutoFilled(false);
      suggestedYearRef.current = "";
    }
  }, []);

  /**
   * 동아리 가입 연도로 기수를 채운다 — **제안이지 결정이 아니다.**
   *
   * `연도 − 1982`를 여기서 계산하지 않는다. 판정 규칙이 두 벌이 되는 것이 이 저장소가 실제로
   * 겪은 버그의 모양이라(#112), 기준은 서버 하나로 둔다(`fetchGenerationNumber`).
   *
   * **이미 배정된 기수는 덮어쓰지 않는다.** 운영진이 넣어 둔 기수는 사실이고, 이관 회원 중에는
   * 계산식과 맞지 않는 기수를 가진 사람이 있다(명부의 기수가 정본이다). 연도를 뒤늦게 채우다
   * 그 값이 조용히 바뀌면 무엇이 사실인지 알 수 없게 된다(BR-M43).
   */
  const suggestGeneration = useCallback(() => {
    const { current: form } = contextRef.current;
    const year = form.clubJoinYear.trim();
    if (!FOUR_DIGIT_YEAR.test(year)) return;
    if (!generationUnassigned(form.generationNumber)) return;
    /* 디바운스와 blur가 잇달아 불러도 같은 연도를 두 번 묻지 않는다 */
    if (suggestedYearRef.current === year) return;
    suggestedYearRef.current = year;

    void (async () => {
      try {
        const generationNumber = await fetchGenerationNumber(Number(year));
        if (!aliveRef.current) return;
        /* 응답을 기다리는 사이에 사람이 기수를 적었다면 그쪽이 사실이다 */
        if (!generationUnassigned(contextRef.current.current.generationNumber)) return;
        setValues((v) => ({
          ...(v ?? contextRef.current.current),
          generationNumber: String(generationNumber),
        }));
        setGenerationAutoFilled(true);
        setGenerationSuggestError("");
      } catch {
        if (!aliveRef.current) return;
        /* 같은 연도로 다시 시도할 수 있어야 한다 */
        suggestedYearRef.current = "";
        setGenerationSuggestError(
          "기수를 자동으로 채우지 못했습니다 — 기수를 직접 입력해주세요",
        );
      }
    })();
  }, []);

  /*
   * 타이핑이 멎으면 채운다. 글자마다 부르면 "2"·"20"·"202"까지 서버에 묻게 되고, 그중 앞선
   * 응답이 늦게 도착해 엉뚱한 기수가 남을 수 있다.
   */
  const yearInput = current.clubJoinYear;
  useEffect(() => {
    if (!yearTouched) return;
    const timer = setTimeout(suggestGeneration, GENERATION_SUGGEST_DELAY_MS);
    return () => clearTimeout(timer);
  }, [yearInput, yearTouched, suggestGeneration]);

  /* 다시 불러오면 초안을 버린다 — 새로 받은 서버 값이 폼의 초기값이어야 한다 */
  const reload = useCallback(() => {
    setValues(null);
    setAttempted(false);
    setSaveErrorMessage("");
    setGenerationAutoFilled(false);
    setGenerationSuggestError("");
    setYearTouched(false);
    suggestedYearRef.current = "";
    reloadDetail();
  }, [reloadDetail]);

  // 같은 틱에 두 번 눌린 저장은 그 사이에 렌더가 없어 saving 이 아직 갱신되지 않는다
  const busyRef = useRef(false);

  const save = useCallback(async (): Promise<MemberDetail | null> => {
    const context = contextRef.current;
    if (busyRef.current) return null;

    setAttempted(true);
    if (hasErrors(validateMemberEdit(context.current, context.academicRequired))) {
      return null;
    }
    if (!context.dirty) {
      setSaveErrorMessage("변경된 내용이 없습니다");
      return null;
    }

    busyRef.current = true;
    setSaving(true);
    setSaveErrorMessage("");

    try {
      /* 여덟 필드를 통째로 보낸다 — 빠뜨린 필드는 서버에서 비워진다 (파일 첫 주석) */
      const next = await updateMember(context.memberId, toUpdateInput(context.current));
      if (aliveRef.current) {
        setValues(toValues(next));
        setGenerationAutoFilled(false);
      }
      return next;
    } catch (error: unknown) {
      /* 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다 */
      syncSessionOnForbidden(error);
      if (aliveRef.current) setSaveErrorMessage(toMemberSaveErrorMessage(error));
      return null;
    } finally {
      busyRef.current = false;
      if (aliveRef.current) setSaving(false);
    }
  }, []);

  return {
    status,
    errorMessage,
    reload,
    member,
    values: current,
    set,
    errors,
    academicRequired,
    suggestGeneration,
    generationAutoFilled,
    generationSuggestError,
    dirty,
    saving,
    saveErrorMessage,
    save,
  };
}

/* ── 본인 경로 ─────────────────────────────────────────────── */

export interface MyProfileEdit {
  /** 세션의 회원. AuthGate가 ready일 때만 화면이 열리므로 사실상 항상 있다 */
  member: MemberProfile | null;
  /** 수정 모드인가 — 평소에는 읽기 화면이다 */
  editing: boolean;
  /** 수정 시작. 폼을 세션 값으로 되채운다 */
  start: () => void;
  /** 고치던 값을 버리고 읽기 화면으로 */
  cancel: () => void;

  values: MemberEditValues;
  set: (patch: Partial<MemberEditValues>) => void;
  errors: MemberEditFieldErrors;
  academicRequired: boolean;

  dirty: boolean;
  saving: boolean;
  saveErrorMessage: string;
  /** 성공하면 서버가 준 프로필 — 세션 스토어는 이 훅이 이미 갱신한 뒤다 */
  save: () => Promise<MemberProfile | null>;
}

/**
 * 본인의 프로필 수정 (PATCH /v1/members/me).
 *
 * ── 서버를 다시 조회하지 않는다 ─────────────────────────────────
 * 폼의 초기값은 세션 스토어의 회원이다. 세션은 이 사용자 본인의 최신 프로필이라 별도 조회가
 * 없어도 되고, 무엇보다 본인 조회 API가 따로 없다(회원 단건은 `MEMBER_MANAGE`가 필요해 일반
 * 회원은 자기 자신도 못 읽는다).
 *
 * ── 저장 뒤 세션을 갈아 끼운다 ──────────────────────────────────
 * 서버가 세션의 member와 같은 모양을 돌려주므로 그대로 스토어에 넣는다 — 사이드바 이름이 그
 * 자리에서 바뀐다. 다시 조회하면 왕복 한 번 동안 옛 이름이 남는다.
 *
 * 기수·이메일은 요청에 자리가 없어 보내지 않지만 폼 값에는 채워 둔다 — 화면이 읽기 전용으로
 * 보여 주는 값이고, 검증·비교 규칙을 운영진 경로와 하나로 쓰기 위해서다.
 */
export function useMyProfileEdit(): MyProfileEdit {
  const member = useSessionStore((s) => s.member);
  const applyMyProfile = useSessionStore((s) => s.applyMyProfile);

  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<MemberEditValues | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState("");

  const saved = member ? toValues(member) : null;
  const current = values ?? saved ?? EMPTY_VALUES;

  const academicRequired = member
    ? requiresAcademicProfile(member.membershipStatusCode)
    : false;
  const errors = attempted ? validateMemberEdit(current, academicRequired) : {};
  const dirty = saved !== null && !sameValues(current, saved);

  const start = useCallback(() => {
    setValues(null);
    setAttempted(false);
    setSaveErrorMessage("");
    setEditing(true);
  }, []);

  const cancel = useCallback(() => {
    setValues(null);
    setAttempted(false);
    setSaveErrorMessage("");
    setEditing(false);
  }, []);

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const contextRef = useRef({ current, academicRequired, dirty });
  useEffect(() => {
    contextRef.current = { current, academicRequired, dirty };
  });

  /* 첫 입력만 세션 값 위에 얹는다 — 근거는 운영진 경로의 같은 자리 주석 */
  const set = useCallback((patch: Partial<MemberEditValues>) => {
    setValues((v) => ({ ...(v ?? contextRef.current.current), ...patch }));
    setSaveErrorMessage("");
  }, []);

  const busyRef = useRef(false);

  const save = useCallback(async (): Promise<MemberProfile | null> => {
    const context = contextRef.current;
    if (busyRef.current) return null;

    setAttempted(true);
    if (hasErrors(validateMemberEdit(context.current, context.academicRequired))) {
      return null;
    }
    if (!context.dirty) {
      setSaveErrorMessage("변경된 내용이 없습니다");
      return null;
    }

    busyRef.current = true;
    setSaving(true);
    setSaveErrorMessage("");

    try {
      const profile = await updateMyProfile(toSelfUpdateInput(context.current));
      /* 세션이 정본이다 — 응답을 그대로 넣어 사이드바까지 한 번에 맞춘다 */
      applyMyProfile(profile);
      if (aliveRef.current) {
        setValues(null);
        setAttempted(false);
        setEditing(false);
      }
      return profile;
    } catch (error: unknown) {
      syncSessionOnForbidden(error);
      if (aliveRef.current) setSaveErrorMessage(toMyProfileSaveErrorMessage(error));
      return null;
    } finally {
      busyRef.current = false;
      if (aliveRef.current) setSaving(false);
    }
  }, [applyMyProfile]);

  return {
    member,
    editing,
    start,
    cancel,
    values: current,
    set,
    errors,
    academicRequired,
    dirty,
    saving,
    saveErrorMessage,
    save,
  };
}
