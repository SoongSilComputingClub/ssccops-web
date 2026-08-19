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
  setMemberLinkDraft,
  useSignup,
  validateSignup,
  type SignupFieldErrors,
  type SignupFormValues,
  type SignupStatusCode,
} from "@/features/auth";
import { FIELD_LABEL } from "@/shared/config/labels";
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
  /**
   * 학번 중복(409)으로 막혔는가 — 오류 한 줄이 아니라 **연결 경로 안내**를 띄우는 상태다 (#58).
   *
   * 이 자리에 서는 사람은 거의 언제나 CSV로 이관된 본인이다(features/auth/model/signup-form.ts).
   * 학번 칸 밑에 빨간 글씨만 놓으면 남은 선택지가 "학번을 지우고 가입"뿐인 것처럼 보이고,
   * 그렇게 하면 명부에 같은 사람이 두 줄이 된다 — 정확히 막으려던 일이다.
   */
  const [duplicatedStudentNumber, setDuplicatedStudentNumber] = useState(false);

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
    /* 학번을 고쳤다면 그 판정은 낡았다 — 안내를 남겨 두면 다른 학번을 두고 하는 말이 된다 */
    if (patch.studentNumber !== undefined) setDuplicatedStudentNumber(false);
  };

  /**
   * 연결 화면으로. 지금 폼에 친 세 값을 그대로 들려 보낸다 (#58).
   *
   * 연결 폼이 요구하는 것이 정확히 학번·회원명·전화번호라, 여기까지 적은 사람에게 같은 값을
   * 다시 치게 할 이유가 없다. 값이 아직 비어 있어도 그대로 넘긴다 — 비면 빈 폼일 뿐이다.
   */
  const goToLink = () => {
    setMemberLinkDraft({
      studentNumber: f.studentNumber,
      name: f.name,
      phoneNumber: f.phoneNumber,
    });
    router.push(withNextParam(ROUTES.signupLink, next, ROUTES.dashboard));
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
    setDuplicatedStudentNumber(false);

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
      case "student-number-duplicated":
        /*
         * 막다른 오류가 아니라 갈림길이다 — 이 학번의 회원이 이미 명부에 있다는 뜻이므로,
         * 학번 칸을 붉히는 대신 연결 경로를 편다(아래 안내 카드).
         */
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
  };

  return (
    <div className="w-full max-w-[640px] px-4 py-14 lg:px-6">
      <h1 className="text-[28px] font-medium tracking-[-.4px]">회원 가입</h1>
      <p className="mt-2 text-[14.5px] text-n400">
        소셜 계정 <span className="font-semibold text-ink">{provider}</span> 로
        인증되었습니다. 등급 임시회원으로 등록되며 바로 이용할 수 있습니다.
      </p>
      {/*
       * 폼 링크를 열었다가 여기까지 온 경우에는 가입이 목적이 아니므로, 이 화면이 종착지가
       * 아니라 한 단계라는 것을 알려 준다. 폼 제목은 특정하지 않는다 — 로그인 화면 쪽 주석
       * 참고(공개 폼 메타 조회를 따로 뚫어야 해서 값에 비해 비싸다).
       */}
      {next.startsWith("/f/") && (
        <div className="mt-3 rounded-[12px] border border-accent/28 bg-accent/8 px-[14px] py-3 text-[13.5px] leading-[1.6] text-n400">
          가입을 마치면 열려던 폼으로 돌아가 이어서 응답할 수 있습니다.
        </div>
      )}

      {/*
       * 연결 경로의 상시 진입점 (#58).
       *
       * 학번 중복(409)으로 막힌 뒤에만 보여 주면, 학번을 아예 넣지 않고 가입해 버리는 사람은
       * 이 길이 있다는 것을 끝내 모른 채 명부에 두 번째 줄을 만든다. 그래서 **누르기 전부터**
       * 보인다. 기본 동작은 어디까지나 새 가입이므로 눈에 덜 띄는 한 줄로 둔다.
       */}
      <div className="mt-3 flex items-center justify-between gap-3 rounded-[12px] border border-line bg-surface px-[14px] py-[10px]">
        <div className="text-[13.5px] leading-[1.6] text-n400">
          이미 SSCC 회원이신가요? 명부에 등록돼 있다면 기존 회원 정보에 연결하세요.
        </div>
        <Button variant="ghost" size="sm" disabled={pending} onClick={goToLink}>
          기존 회원 정보와 연결하기
        </Button>
      </div>

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

          <Field label={FIELD_LABEL.memberName} required error={errors.name}>
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
          <Field
            label={FIELD_LABEL.studentNumber}
            required={isEnrolled}
            error={errors.studentNumber}
          >
            <TextField
              value={f.studentNumber}
              onChange={(e) => set({ studentNumber: e.target.value })}
              invalid={!!errors.studentNumber}
              placeholder={isEnrolled ? "필수 · 숫자만" : "선택 · 기억나는 경우"}
            />
          </Field>
          <Field
            label={FIELD_LABEL.departmentName}
            required={isEnrolled}
            error={errors.departmentName}
          >
            <TextField
              value={f.departmentName}
              onChange={(e) => set({ departmentName: e.target.value })}
              invalid={!!errors.departmentName}
              placeholder={isEnrolled ? "필수" : "선택"}
            />
          </Field>
          {isEnrolled && (
            <Field label={FIELD_LABEL.academicYear} required error={errors.academicYear}>
              <TextField
                value={f.academicYear}
                onChange={(e) => set({ academicYear: e.target.value })}
                invalid={!!errors.academicYear}
                inputMode="numeric"
                placeholder="필수 · 1~4"
              />
            </Field>
          )}
          <Field label={FIELD_LABEL.generationNumber} error={errors.generationNumber}>
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
            ? "재학 회원은 기수를 제외한 모든 항목이 필수입니다. 기수는 운영진이 배정합니다."
            : "졸업 회원은 회원명 · 전화번호만 필수입니다. 학번과 기수는 기억나지 않으면 비워두세요."}
        </div>
      </Card>

      {/*
       * 학번 중복 409 — 오류가 아니라 갈림길로 그린다 (#58).
       *
       * 붉은 오류 상자를 쓰지 않는 것은 의도한 것이다. 여기 선 사람은 잘못 입력한 것이 아니라
       * **이미 명부에 있는** 사람이며, 해야 할 일은 값을 고치는 것이 아니라 화면을 옮기는
       * 것이다. 학번을 지우고 가입하면 통과한다는 사실은 알려주지 않는다 — 그 길의 끝이 같은
       * 사람의 두 번째 회원 행이다.
       */}
      {duplicatedStudentNumber && (
        <div className="mt-3 rounded-[12px] border border-accent/40 bg-accent/8 px-[14px] py-3">
          <div className="text-[14.5px] font-semibold text-ink">
            이 학번은 이미 명부에 등록돼 있습니다
          </div>
          <div className="mt-1 text-[13.5px] leading-[1.7] text-n400">
            본인 학번이 맞다면 이미 SSCC 명부에 등록된 회원일 가능성이 높습니다. 새로 가입하는
            대신 <span className="font-semibold text-ink">기존 회원 정보에 이 계정을 연결</span>
            하세요 — 기수 · 등급 · 역할이 그대로 유지됩니다. 연결에는 학번 · 회원명 · 전화번호가
            모두 필요하며, 명부의 값과 다르면 연결되지 않습니다.
          </div>
          <div className="mt-[10px] flex gap-2">
            <Button size="sm" disabled={pending} onClick={goToLink}>
              기존 회원 정보와 연결하기
            </Button>
          </div>
          <div className="mt-[10px] text-[12.5px] leading-[1.6] text-n500">
            명부에 전화번호가 없거나 연결되지 않는다면 운영진에게 문의해주세요.
          </div>
        </div>
      )}

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
