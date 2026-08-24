"use client";

import { useRef, useState } from "react";
import { signUp, type SignupStatusCode } from "@/entities/member";
import { signupUrl } from "@/shared/config/routes";
import { Card, Chip, Field, TextField } from "@/shared/ui";
import {
  EMPTY_SIGNUP_VALUES,
  buildSignupRequest,
  hasErrors,
  requiresAcademicInfo,
  toSignupFailure,
  validateSignup,
  type SignupField,
  type SignupFieldErrors,
  type SignupFormValues,
} from "../model/signup-form";

/*
 * 간편 가입 — **신청 흐름 안에 임베드된다** (wave2 §8-4).
 *
 * 화면을 옮기지 않는 것이 이 컴포넌트의 요점이다. 가입 화면으로 리다이렉트하면 돌아올 곳을
 * 쿼리로 나르고, 돌아온 뒤 다시 신청서를 불러오는 왕복이 두 번 더 생긴다 — 4단계 중 이탈이
 * 가장 큰 구간이 바로 여기다. 가입이 끝나면 `onSignedUp`으로 알리고, 부모가 같은 자리에서
 * 신청서 작성으로 넘긴다.
 *
 * 등급은 요청에 없다 — **서버가 임시회원(TEMP)으로 고정한다.** 클라이언트가 보낸 등급을 믿고
 * 저장하면 스스로 등급을 올릴 수 있다.
 */
export function SignupStep({
  authUserEmail,
  authUserName,
  onSignedUp,
}: {
  /** 구글 계정 이메일 — 무엇으로 가입하는지 보여 주기만 한다(서버가 토큰에서 다시 읽는다) */
  authUserEmail: string | null;
  /** 구글 계정 이름 — 이름 칸의 초깃값. 틀리면 고칠 수 있다 */
  authUserName: string | null;
  onSignedUp: () => void;
}) {
  const [statusCode, setStatusCode] = useState<SignupStatusCode>("ENROLLED");
  const [values, setValues] = useState<SignupFormValues>({
    ...EMPTY_SIGNUP_VALUES,
    name: authUserName ?? "",
  });
  /*
   * 제출을 한 번이라도 눌렀는지. 누르기 전부터 붉은 글씨를 띄우면 아직 입력하지도 않은 칸을
   * 나무라는 꼴이 된다. 누른 뒤에는 매 렌더에서 다시 계산하므로 고치는 즉시 사라지고,
   * 재학↔졸업을 바꿔 필수 항목이 달라진 것도 그대로 반영된다.
   */
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<SignupFieldErrors>({});
  const [statusError, setStatusError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicatedStudentNumber, setDuplicatedStudentNumber] = useState(false);
  const [pending, setPending] = useState(false);
  /*
   * `pending`만으로는 같은 tick에 들어온 두 번째 클릭을 막지 못한다(setState는 다음 렌더에서야
   * 반영된다). 회원 생성은 되돌릴 수 없으므로 ref로 한 번 더 잠근다.
   */
  const inflight = useRef(false);

  const academic = requiresAcademicInfo(statusCode);
  const errors: SignupFieldErrors = {
    ...(attempted ? validateSignup(values, statusCode) : {}),
    ...serverErrors,
  };

  const set = (patch: Partial<SignupFormValues>) => {
    setValues((prev) => ({ ...prev, ...patch }));
    setServerErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(patch) as SignupField[]) delete next[key];
      return next;
    });
    setFormError(null);
    // 학번을 고쳤다면 앞의 판정은 낡았다 — 남겨 두면 다른 학번을 두고 하는 말이 된다
    if (patch.studentNumber !== undefined) setDuplicatedStudentNumber(false);
  };

  const submit = async () => {
    setAttempted(true);
    setStatusError(null);
    setFormError(null);
    setServerErrors({});
    setDuplicatedStudentNumber(false);

    if (hasErrors(validateSignup(values, statusCode))) return;
    if (inflight.current) return;

    inflight.current = true;
    setPending(true);

    try {
      await signUp(buildSignupRequest(values, statusCode));
      // 성공하면 잠금을 풀지 않는다 — 다음 단계로 넘어가는 사이에 버튼이 살아나면 한 번 더 나간다
      onSignedUp();
      return;
    } catch (error) {
      const failure = toSignupFailure(error);
      if (failure.kind === "already-signed-up") {
        onSignedUp();
        return;
      }

      inflight.current = false;
      setPending(false);

      switch (failure.kind) {
        case "student-number-duplicated":
          setDuplicatedStudentNumber(true);
          return;
        case "field":
          setServerErrors({ [failure.field]: failure.message });
          return;
        case "status":
          setStatusError(failure.message);
          return;
        default:
          setFormError(failure.message);
      }
    }
  };

  return (
    <div className="flex flex-col gap-[12px]">
      <Card className="flex flex-col gap-[14px]">
        <div className="flex flex-col gap-[4px]">
          <h2 className="text-[17px] font-semibold">신청 전 회원 정보를 남겨 주세요</h2>
          <p className="text-[13.5px] leading-[1.7] text-n500">
            행사 신청은 동아리 회원만 할 수 있습니다. 아래 정보만 남기면 바로 신청서로
            이어집니다 — 다른 화면으로 이동하지 않습니다.
          </p>
        </div>

        {authUserEmail && (
          <div>
            <div className="mb-[6px] text-[13.5px] text-n400">이메일</div>
            {/* 이메일에는 띄어쓰기가 없다 — 그냥 두면 긴 학교 계정이 상자 밖으로 밀려 나간다 */}
            <div className="rounded-[12px] bg-bg px-[11px] py-[9px] text-[15px] break-words text-n300">
              {authUserEmail}
            </div>
            <div className="mt-1 text-[12.5px] text-n500">
              구글 계정에서 자동으로 가져왔습니다
            </div>
          </div>
        )}

        <div>
          <div className="mb-[6px] text-[13.5px] text-n400">
            재학 여부<span className="ml-[2px] text-accent">*</span>
          </div>
          <div className="flex gap-[7px]">
            {(
              [
                ["ENROLLED", "재학"],
                ["GRADUATED", "졸업"],
              ] as const
            ).map(([code, label]) => (
              <Chip
                key={code}
                active={statusCode === code}
                disabled={pending}
                onClick={() => {
                  setStatusCode(code);
                  setStatusError(null);
                  setFormError(null);
                }}
              >
                {label}
              </Chip>
            ))}
          </div>
          {statusError && (
            <div className="mt-[6px] text-[12.5px] text-danger">{statusError}</div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
          <Field label="이름" required error={errors.name}>
            <TextField
              value={values.name}
              onChange={(e) => set({ name: e.target.value })}
              invalid={!!errors.name}
              disabled={pending}
              placeholder="필수"
            />
          </Field>
          <Field label="전화번호" required error={errors.phoneNumber}>
            <TextField
              value={values.phoneNumber}
              onChange={(e) => set({ phoneNumber: e.target.value })}
              invalid={!!errors.phoneNumber}
              disabled={pending}
              inputMode="tel"
              placeholder="필수 · 010-1234-5678"
            />
          </Field>
          <Field label="학번" required={academic} error={errors.studentNumber}>
            <TextField
              value={values.studentNumber}
              onChange={(e) => set({ studentNumber: e.target.value })}
              invalid={!!errors.studentNumber}
              disabled={pending}
              inputMode="numeric"
              placeholder={academic ? "필수 · 숫자만" : "선택 · 기억나는 경우"}
            />
          </Field>
          <Field label="학과" required={academic} error={errors.departmentName}>
            <TextField
              value={values.departmentName}
              onChange={(e) => set({ departmentName: e.target.value })}
              invalid={!!errors.departmentName}
              disabled={pending}
              placeholder={academic ? "필수" : "선택"}
            />
          </Field>
          {/* 학년은 재학 회원에게만 뜻이 있다 — 졸업이면 칸 자체를 세우지 않는다 */}
          {academic && (
            <Field label="학년" required error={errors.academicYear}>
              <TextField
                value={values.academicYear}
                onChange={(e) => set({ academicYear: e.target.value })}
                invalid={!!errors.academicYear}
                disabled={pending}
                inputMode="numeric"
                placeholder="필수 · 1~4"
              />
            </Field>
          )}
        </div>

        <p className="text-[12.5px] leading-[1.7] text-n500">
          {academic
            ? "재학 회원은 위 항목이 모두 필요합니다. 기수는 운영진이 배정합니다."
            : "졸업 회원은 이름과 전화번호만 필요합니다. 학번·학과는 기억나지 않으면 비워 두세요."}
        </p>
      </Card>

      {/*
       * 학번 중복 — **오류가 아니라 갈림길이다.**
       *
       * 여기 선 사람은 잘못 입력한 것이 아니라 이미 명부에 있는 사람이고, 해야 할 일은 값을
       * 고치는 것이 아니라 기존 회원 정보에 계정을 연결하는 것이다. 그 연결 화면은 어드민에만
       * 있으므로 오리진이 설정돼 있으면 링크로 열어 주고, 없으면 문의 안내만 남긴다.
       * **학번을 지우면 통과한다는 사실은 알려주지 않는다** — 그 길의 끝이 같은 사람의 두 번째
       * 회원 줄이다.
       */}
      {duplicatedStudentNumber && <StudentNumberDuplicatedNotice />}

      {formError && (
        <div className="rounded-[12px] bg-surface px-[14px] py-[11px] text-[13.5px] text-danger shadow-[0_0_0_1px_#f04452]">
          {formError}
        </div>
      )}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={pending}
        className="rounded-xl bg-accent px-[16px] py-[13px] text-[15px] font-semibold text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "가입 처리 중…" : "가입하고 신청서 작성"}
      </button>
    </div>
  );
}

function StudentNumberDuplicatedNotice() {
  const signup = signupUrl();

  return (
    <Card className="flex flex-col gap-[8px]">
      <div className="text-[14.5px] font-semibold">이 학번은 이미 명부에 등록돼 있습니다</div>
      <p className="text-[13.5px] leading-[1.7] text-n400">
        본인 학번이 맞다면 이미 등록된 회원일 가능성이 높습니다. 새로 가입하는 대신 기존 회원
        정보에 이 계정을 연결하면 기수·등급·역할이 그대로 유지됩니다. 연결에는 학번·이름·
        전화번호가 모두 필요합니다.
      </p>
      {signup ? (
        <a
          href={signup}
          className="self-start rounded-xl bg-accent px-[14px] py-[10px] text-[14px] font-semibold text-white transition-colors hover:bg-accent-strong"
        >
          기존 회원 정보와 연결하기
        </a>
      ) : (
        <p className="text-[12.5px] leading-[1.7] text-n500">
          연결 화면 주소가 아직 설정되지 않았습니다 — 운영진에게 문의해 주세요.
        </p>
      )}
    </Card>
  );
}
