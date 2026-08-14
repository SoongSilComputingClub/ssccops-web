"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSessionStore } from "@/entities/session";
import {
  EMPTY_SIGNUP_VALUES,
  buildSignupRequest,
  fetchAuthSession,
  hasErrors,
  requiresAcademicInfo,
  useSignup,
  validateSignup,
  type SignupFieldErrors,
  type SignupFormValues,
  type SignupStatusCode,
} from "@/features/auth";
import { ROUTES } from "@/shared/config/routes";
import { safeNextPath, withNextParam } from "@/shared/lib/next-path";
import { Button, Card, Chip, Field, TextField, flash } from "@/shared/ui";

export function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  /*
   * 가입을 마친 뒤 돌아갈 곳. 공개 폼 링크로 들어온 사람은 가입이 목적이 아니라 그 폼에
   * 응답하러 온 것이므로, 이 값을 완료 화면까지 그대로 이어 넘긴다. 쿼리스트링으로 나르면
   * 가입 도중 새로고침해도 살아남는다 — 스토어에 담으면 그 순간 사라진다.
   */
  const next = safeNextPath(searchParams.get("next"), ROUTES.dashboard);
  /*
   * 인증 정보의 출처는 서버 세션이다 — 새로고침하면 사라지는 zustand 값(pendingAuthUser)에
   * 기대던 탓에 가입 도중 새로고침하면 로그인으로 튕겼다. 이 화면은 SignupGate가
   * "인증됨 + 미가입"일 때만 열어 주므로 authUser는 항상 채워져 있다.
   */
  const authUser = useSessionStore((s) => s.authUser);
  const setSession = useSessionStore((s) => s.setSession);
  const setSignupResult = useSessionStore((s) => s.setSignupResult);
  const logout = useSessionStore((s) => s.logout);
  const { pending, submit } = useSignup();

  /** 재학/졸업은 회원_상태_코드로 그대로 표현한다 (별도 구분 컬럼 없음) */
  const [statusCode, setStatusCode] = useState<SignupStatusCode>("ENROLLED");
  const [f, setF] = useState<SignupFormValues>({
    ...EMPTY_SIGNUP_VALUES,
    name: authUser?.name ?? "",
  });
  /*
   * 제출을 한 번이라도 눌렀는지. 누르기 전부터 빨간 글씨를 띄우면 아직 입력하지도 않은 칸을
   * 나무라는 꼴이 된다. 누른 뒤에는 매 렌더에서 다시 계산하므로, 고치는 즉시 에러가 사라지고
   * 재학↔졸업을 바꾸면 필수 항목이 달라진 것도 그대로 반영된다.
   */
  const [attempted, setAttempted] = useState(false);
  /** 서버만 알 수 있는 실패(학번 중복 등) — 해당 칸을 고치면 지운다 */
  const [serverErrors, setServerErrors] = useState<SignupFieldErrors>({});
  const [statusError, setStatusError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const errors: SignupFieldErrors = {
    ...(attempted ? validateSignup(f, statusCode) : {}),
    ...serverErrors,
  };

  const set = (patch: Partial<SignupFormValues>) => {
    setF((v) => ({ ...v, ...patch }));
    setServerErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(patch) as (keyof SignupFormValues)[]) delete next[key];
      return next;
    });
    setFormError(null);
  };

  const selectStatus = (code: SignupStatusCode) => {
    setStatusCode(code);
    setStatusError(null);
    setFormError(null);
  };

  if (!authUser) return null;

  const provider = authUser.provider?.toUpperCase() ?? "GOOGLE";
  const isEnrolled = requiresAcademicInfo(statusCode);

  const signUp = async () => {
    setAttempted(true);
    setStatusError(null);
    setFormError(null);
    setServerErrors({});

    if (hasErrors(validateSignup(f, statusCode))) return;

    const outcome = await submit(buildSignupRequest(f, statusCode));

    if (outcome.ok) {
      setSignupResult(outcome.member);
      router.replace(withNextParam(ROUTES.signupComplete, next, ROUTES.dashboard));
      return;
    }

    const { failure } = outcome;
    switch (failure.kind) {
      case "already-signed-up":
        /*
         * 중복 제출·뒤로가기로 이미 가입된 계정이 다시 제출한 경우다. 실패로 보여 줄 게
         * 아니라 서버 세션을 다시 받아 서비스로 들여보낸다 — 서버가 정본이다.
         */
        flash("이미 가입이 완료된 계정입니다");
        fetchAuthSession()
          .then((session) => setSession(session))
          .catch(() => undefined)
          // 이 갈래에는 완료 화면이 없으니 바로 원래 가려던 곳(없으면 대시보드)으로 보낸다
          .finally(() => router.replace(next));
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
  };

  return (
    <div className="w-[640px] px-6 py-14">
      <h1 className="text-[28px] font-medium tracking-[-.4px]">회원 가입</h1>
      <p className="mt-2 text-[14.5px] text-n400">
        소셜 계정 <span className="font-semibold text-ink">{provider}</span> 로
        인증되었습니다. 등급 임시회원으로 등록되며 바로 이용할 수 있습니다.
      </p>

      <div className="mt-5 flex gap-[7px]">
        {(
          [
            ["ENROLLED", "재학"],
            ["GRADUATED", "졸업"],
          ] as const
        ).map(([cd, label]) => (
          <Chip key={cd} active={statusCode === cd} onClick={() => selectStatus(cd)}>
            {label}
          </Chip>
        ))}
      </div>
      {statusError && <div className="mt-[6px] text-[12.5px] text-danger">{statusError}</div>}

      <Card className="mt-4">
        <div className="grid grid-cols-2 gap-[14px]">
          <div className="col-span-2">
            <div className="mb-[6px] text-[13.5px] text-n400">이메일</div>
            <div className="rounded-[12px] bg-bg px-[11px] py-[9px] text-[15.5px] text-n300">
              {authUser.email}
            </div>
            <div className="mt-1 text-[12.5px] text-n500">
              {provider} 계정에서 자동으로 가져왔습니다
            </div>
          </div>

          <Field label="회원_명" required error={errors.name}>
            <TextField
              value={f.name}
              onChange={(e) => set({ name: e.target.value })}
              invalid={!!errors.name}
              placeholder="필수"
            />
          </Field>
          <Field label="전화번호" required error={errors.phoneNumber}>
            <TextField
              value={f.phoneNumber}
              onChange={(e) => set({ phoneNumber: e.target.value })}
              invalid={!!errors.phoneNumber}
              placeholder="필수 · 010-1234-5678"
            />
          </Field>
          <Field label="학생_번호" required={isEnrolled} error={errors.studentNumber}>
            <TextField
              value={f.studentNumber}
              onChange={(e) => set({ studentNumber: e.target.value })}
              invalid={!!errors.studentNumber}
              placeholder={isEnrolled ? "필수 · 숫자만" : "선택 · 기억나는 경우"}
            />
          </Field>
          <Field label="학과_명" required={isEnrolled} error={errors.departmentName}>
            <TextField
              value={f.departmentName}
              onChange={(e) => set({ departmentName: e.target.value })}
              invalid={!!errors.departmentName}
              placeholder={isEnrolled ? "필수" : "선택"}
            />
          </Field>
          {isEnrolled && (
            <Field label="학년_번호" required error={errors.academicYear}>
              <TextField
                value={f.academicYear}
                onChange={(e) => set({ academicYear: e.target.value })}
                invalid={!!errors.academicYear}
                inputMode="numeric"
                placeholder="필수 · 1~4"
              />
            </Field>
          )}
          <Field label="기수_번호" error={errors.generationNumber}>
            <TextField
              value={f.generationNumber}
              onChange={(e) => set({ generationNumber: e.target.value })}
              invalid={!!errors.generationNumber}
              inputMode="numeric"
              placeholder="선택 · 운영진이 배정"
            />
          </Field>
        </div>
        <div className="mt-4 text-[13px] text-n500">
          {isEnrolled
            ? "재학 회원은 기수_번호를 제외한 모든 항목이 필수입니다. 기수는 운영진이 배정합니다."
            : "졸업 회원은 회원_명 · 전화번호만 필수입니다. 학번과 기수는 기억나지 않으면 비워두세요."}
        </div>
      </Card>

      {formError && (
        <div className="mt-3 rounded-[12px] border border-danger/28 bg-danger/8 px-[14px] py-3 text-[14px] text-danger">
          {formError}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {/* 인증은 이미 끝난 상태라 그냥 /login으로 보내면 가드가 다시 이 화면으로 되돌린다 — 로그아웃해야 한다 */}
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => {
            void logout().then((ok) => {
              if (!ok) {
                flash("로그아웃에 실패했습니다. 잠시 후 다시 시도해주세요");
                return;
              }
              window.location.replace(ROUTES.login);
            });
          }}
        >
          로그아웃
        </Button>
        {/* 회원 생성은 되돌릴 수 없다 — 응답이 올 때까지 버튼을 잠가 연타로 두 번 나가지 않게 한다 */}
        <Button className="flex-1 py-3" disabled={pending} onClick={() => void signUp()}>
          {pending ? "가입 처리 중…" : "회원 가입"}
        </Button>
      </div>
    </div>
  );
}
