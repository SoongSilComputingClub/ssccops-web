"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSessionStore } from "@/entities/session";
import {
  buildMemberLinkRequest,
  fetchAuthSession,
  hasMemberLinkErrors,
  takeMemberLinkDraft,
  useMemberLink,
  validateMemberLink,
  type MemberLinkFieldErrors,
  type MemberLinkFormValues,
} from "@/features/auth";
import { FIELD_LABEL } from "@/shared/config/labels";
import { ROUTES } from "@/shared/config/routes";
import { safeNextPath, withNextParam } from "@/shared/lib/next-path";
import { Button, Card, Field, TextField, flash } from "@/shared/ui";

/**
 * 입력란 글자 크기 — 좁은 화면에서만 16px로 올린다.
 *
 * 이유와 `!`가 필요한 사정은 가입 화면(signup-page.tsx)의 같은 상수 주석에 있다. 여기는
 * 세 칸을 **명부와 한 글자도 다르지 않게** 쳐야 하는 화면이라, 첫 칸에서 화면이 확대된 채
 * 나머지를 채우면 오타를 확인할 길이 없는데 서버는 어느 칸이 틀렸는지 알려주지 않는다.
 */
const INPUT_TEXT = "text-[16px]! lg:text-[15.5px]!";

/**
 * 기존 회원 정보와 연결 (#58 · POST /v1/members/link · 서버 #86).
 *
 * ── 이 화면이 있는 이유 ────────────────────────────────────
 * CSV로 이관된 회원은 명부에 이미 한 줄이 있다. 그 사람이 처음 로그인해 가입 폼에 자기 학번을
 * 넣으면 서버가 409 `STUDENT_NUMBER_DUPLICATED`로 끊는데, 그 화면에서 할 수 있는 일이 "학번을
 * 지우고 가입"뿐이면 **같은 사람이 두 줄이 되고 이관된 줄은 로그인 없는 유령으로 남는다.**
 * 여기가 그 유일한 출구다.
 *
 * ── 가입 화면과 일부러 갈라 놓았다 ──────────────────────────
 * 주소도 화면도 따로다(ROUTES.signupLink 주석). 여기서 하는 일은 회원을 만드는 것이 아니라
 * **이미 있는 회원이 나임을 증명하는 것**이고, 그래서 받는 값도 학적 정보가 아니라 명부와
 * 대조할 세 가지(학번·회원명·전화번호)뿐이다.
 */
export function MemberLinkPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  /* 연결을 마친 뒤 돌아갈 곳 — 규칙과 이유는 가입 화면과 같다 */
  const next = safeNextPath(searchParams.get("next"), ROUTES.dashboard);

  const authUser = useSessionStore((s) => s.authUser);
  const setSession = useSessionStore((s) => s.setSession);
  const setLinkResult = useSessionStore((s) => s.setLinkResult);
  const logout = useSessionStore((s) => s.logout);
  const { pending, submit } = useMemberLink();

  /*
   * 가입 폼에서 학번 중복으로 막혀 넘어온 경우 그때 친 값을 그대로 이어받는다(한 번 읽으면
   * 비워진다 — link-form.ts). 초기값으로만 쓰므로 useState 초기화 함수 안에서 집어 간다:
   * 렌더 본문에서 부르면 리렌더마다 다시 읽어 그 사이 사용자가 고친 값을 덮어쓴다.
   */
  const [f, setF] = useState<MemberLinkFormValues>(() => takeMemberLinkDraft());
  const [attempted, setAttempted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  /**
   * 429로 잠겼는가.
   *
   * 문구만 띄우고 입력을 열어 두면 사용자는 계속 두드리고, 서버는 그때마다 시도를 한 번 더
   * 세어 잠금이 길어지기만 한다. 되살리는 것은 새로고침뿐이다 — 남은 대기 시간을 화면이
   * 모르기 때문에(link-form.ts) 타이머로 스스로 풀어 주면 아직 잠긴 채로 열어 주게 된다.
   */
  const [locked, setLocked] = useState(false);

  const errors: MemberLinkFieldErrors = attempted ? validateMemberLink(f) : {};

  const set = (patch: Partial<MemberLinkFormValues>) => {
    setF((v) => ({ ...v, ...patch }));
    setFormError(null);
  };

  if (!authUser) return null;

  const link = async () => {
    setAttempted(true);
    setFormError(null);

    if (hasMemberLinkErrors(validateMemberLink(f))) return;

    const outcome = await submit(buildMemberLinkRequest(f));

    if (outcome.ok) {
      /*
       * 서버가 준 회원 정보를 그대로 세션에 담는다 — 이관된 등급·기수·역할이 여기 실려 있고,
       * 완료 화면이 그것을 보여 준다. 세션을 다시 조회하지 않는 것은 가입 경로와 같은 계약이다.
       */
      setLinkResult(outcome.member);
      router.replace(withNextParam(ROUTES.signupComplete, next, ROUTES.dashboard));
      return;
    }

    const { failure } = outcome;
    switch (failure.kind) {
      case "already-signed-up":
        /*
         * 이미 가입(또는 연결)이 끝난 계정이다. 실패로 보여 줄 것이 아니라 서버 세션을 다시
         * 받아 서비스로 들여보낸다 — 서버가 정본이다(가입 화면이 같은 판단을 한다).
         */
        flash("이미 연결이 완료된 계정입니다");
        fetchAuthSession()
          .then((session) => setSession(session))
          .catch(() => undefined)
          .finally(() => router.replace(next));
        return;
      case "locked":
        setLocked(true);
        setFormError(failure.message);
        return;
      default:
        // 어느 칸이 틀렸는지는 붙이지 않는다 — 서버도 알려주지 않는다 (link-form.ts)
        setFormError(failure.message);
    }
  };

  return (
    <div className="w-full max-w-[560px] px-4 py-14 lg:px-6">
      <h1 className="text-[28px] font-medium tracking-[-.4px]">기존 회원 정보와 연결</h1>
      <p className="mt-2 text-[14.5px] leading-[1.6] text-n400">
        이미 SSCC 명부에 등록된 회원이라면, 새로 가입하는 대신 그 회원 정보에 지금 로그인한
        계정(<span className="font-semibold text-ink">{authUser.email}</span>)을 연결합니다.
        기수 · 등급 · 역할이 그대로 유지됩니다.
      </p>

      {/*
       * 세 값이 모두 필요하다는 것과, 연락처가 명부에 없으면 여기서는 길이 없다는 것을 **누르기
       * 전에** 알린다. 실패한 뒤에는 무엇이 틀렸는지 알려줄 수 없으므로(VR-M23) 이 안내가
       * 사용자가 상황을 이해할 수 있는 유일한 지점이다.
       */}
      <div className="mt-4 rounded-[12px] border border-accent/28 bg-accent/8 px-[14px] py-3 text-[13.5px] leading-[1.7] text-n400">
        <div className="font-semibold text-ink">연결에는 세 가지가 모두 필요합니다</div>
        <div className="mt-1">
          학번 · 회원명 · 전화번호가 <span className="font-semibold text-ink">명부의 값과 모두
          일치</span>해야 연결됩니다. 하나라도 다르면 연결되지 않으며, 어느 항목이 달랐는지는
          알려드리지 않습니다.
        </div>
        <div className="mt-1">
          명부에 전화번호가 없는 회원은 이 화면으로 연결할 수 없습니다 — 운영진에게 문의해주세요.
        </div>
      </div>

      <Card className="mt-4">
        <div className="grid gap-[14px]">
          <Field label={FIELD_LABEL.studentNumber} required error={errors.studentNumber}>
            <TextField
              className={INPUT_TEXT}
              value={f.studentNumber}
              onChange={(e) => set({ studentNumber: e.target.value })}
              invalid={!!errors.studentNumber}
              disabled={locked}
              placeholder="필수 · 명부에 등록된 학번"
            />
          </Field>
          <Field label={FIELD_LABEL.memberName} required error={errors.name}>
            <TextField
              className={INPUT_TEXT}
              value={f.name}
              onChange={(e) => set({ name: e.target.value })}
              invalid={!!errors.name}
              disabled={locked}
              placeholder="필수 · 명부에 등록된 이름"
            />
          </Field>
          <Field label="전화번호" required error={errors.phoneNumber}>
            <TextField
              className={INPUT_TEXT}
              value={f.phoneNumber}
              onChange={(e) => set({ phoneNumber: e.target.value })}
              invalid={!!errors.phoneNumber}
              disabled={locked}
              placeholder="필수 · 010-1234-5678 또는 01012345678"
            />
          </Field>
        </div>
        {/* 화면이 값을 손대지 않는 이유는 link-form.ts 상단 주석에 있다 */}
        <div className="mt-4 text-[13px] leading-[1.7] text-n500">
          전화번호는 하이픈(-)이 있어도 없어도 됩니다 — 숫자만 비교합니다.
        </div>
      </Card>

      {formError && (
        <div className="mt-3 rounded-[12px] border border-danger/28 bg-danger/8 px-[14px] py-3 text-[14px] leading-[1.6] text-danger">
          {formError}
          {locked && (
            <div className="mt-1 text-[13px]">
              잠시 후 이 화면을 새로고침한 뒤 다시 시도해주세요.
            </div>
          )}
        </div>
      )}

      {/* 두 버튼 다 whitespace-nowrap이라 좁은 화면에서 합이 넘치면 잘린다 — 넘치면 줄을 바꾼다 */}
      <div className="mt-4 flex flex-wrap gap-2">
        {/* 여기서 되돌아가는 곳은 로그인이 아니라 가입 화면이다 — 인증은 이미 끝나 있다 */}
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => router.replace(withNextParam(ROUTES.signup, next, ROUTES.dashboard))}
        >
          새로 가입하기
        </Button>
        <Button className="flex-1 py-3" disabled={pending || locked} onClick={() => void link()}>
          {pending ? "연결 확인 중…" : "기존 회원 정보와 연결"}
        </Button>
      </div>

      <div className="mt-3 text-center">
        <button
          type="button"
          className="cursor-pointer text-[13px] text-n500 underline-offset-2 hover:underline"
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
          다른 계정으로 로그인
        </button>
      </div>
    </div>
  );
}
