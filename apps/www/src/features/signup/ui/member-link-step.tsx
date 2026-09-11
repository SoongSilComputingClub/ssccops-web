"use client";

import { useRef, useState } from "react";
import { linkExistingMember } from "@/entities/member";
import { Card, Field, TextField } from "@/shared/ui";
import {
  buildMemberLinkRequest,
  hasMemberLinkErrors,
  toMemberLinkFailure,
  validateMemberLink,
  type MemberLinkFieldErrors,
  type MemberLinkFormValues,
} from "../model/link-form";

/*
 * 기존 회원 정보와 연결 — **신청 흐름 안에서 끝낸다** (#364 · 상위 ssccops#264).
 *
 * ── 왜 어드민으로 넘기지 않는가 ────────────────────────────────
 * 여기 선 사람은 잘못 입력한 것이 아니라 **이미 명부에 있는 사람**이고, 해야 할 일은 값을
 * 고치는 것이 아니라 기존 회원 정보에 계정을 연결하는 것이다. 그 연결 화면이 어드민에만 있어
 * 지금까지는 버튼이 `{어드민}/signup`으로 넘겼는데, 그러면 어드민에서 다시 로그인하고 연결한
 * 뒤 신청서로 돌아오려고 또 이동해야 했다 — 바로 위 가입 카드가 "다른 화면으로 이동하지
 * 않습니다"라고 적어 놓고 명부에 있는 사람만 그 약속에서 빼던 자리다. 서버는 연결에 권한을
 * 요구하지 않고(`MemberLinkController`) 이 화면은 이미 구글 로그인을 마쳤으므로, 필요한 것은
 * 폼 하나였다.
 *
 * `NEXT_PUBLIC_ADMIN_ORIGIN`에 기대지 않는다 — 연결을 여기서 끝내므로 그 값이 비어 있어도
 * 화면이 성립한다(예전에는 값이 없으면 문의 안내만 남고 갈 곳이 없었다).
 * **어드민의 연결 화면(`/signup/link`)은 그대로 둔다** — 신청 흐름 밖에서 연결할 길이고,
 * 운영진에게 그 주소를 안내한 상태다.
 *
 * ── 어드민에서 함께 옮겨 온 보안 판단 ──────────────────────────
 * **항목별 오류를 그리지 않는다.** 학번·이름·전화번호 셋 중 무엇이 틀렸는지 알려주면 이
 * 화면이 곧 명부 조회 도구가 된다 — 학번 하나만 바꿔 가며 두드리면 남의 이름·연락처를 맞혀
 * 볼 수 있다. 서버도 같은 이유로 어느 값이 맞았는지 돌려주지 않는다(VR-M23). 그래서 세 값이
 * 모두 필요하다는 사실은 **누르기 전에** 알리고, 실패한 뒤에는 좁혀 주지 않는다.
 * 근거는 `../model/link-form.ts`와 어드민의 같은 이름 파일에 있다.
 */
export function MemberLinkStep({
  initialValues,
  onLinked,
}: Readonly<{
  /**
   * 가입 폼에서 방금 친 값 — **첫 렌더의 초깃값으로만 쓴다.**
   *
   * 여기까지 온 사람은 이미 학번·이름·전화번호를 위 카드에 적었고 연결이 요구하는 것도 정확히
   * 그 셋이라, 다시 치게 할 이유가 없다. 다만 이 폼에서 고친 값을 위 카드가 덮어써서는 안
   * 되므로 `useState` 초기화 함수 안에서만 읽는다. 위 카드에서 학번을 고치면 중복 판정이
   * 사라져 이 컴포넌트가 통째로 내려가고, 다시 걸리면 그때 값으로 새로 선다.
   */
  initialValues: MemberLinkFormValues;
  /** 연결이 끝났다 — 부모가 같은 자리에서 신청서로 잇는다(가입 성공과 같은 신호다) */
  onLinked: () => void;
}>) {
  const [values, setValues] = useState<MemberLinkFormValues>(() => initialValues);
  /* 누르기 전부터 붉은 글씨를 띄우지 않는다 — 가입 폼과 같은 규칙이다 */
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
  const [pending, setPending] = useState(false);
  /*
   * `pending`만으로는 같은 tick에 들어온 두 번째 클릭을 막지 못한다(setState는 다음 렌더에서야
   * 반영된다). 실패한 시도는 서버의 횟수 제한을 깎으므로 ref로 한 번 더 잠근다.
   */
  const inflight = useRef(false);

  const errors: MemberLinkFieldErrors = attempted ? validateMemberLink(values) : {};

  const set = (patch: Partial<MemberLinkFormValues>) => {
    setValues((prev) => ({ ...prev, ...patch }));
    setFormError(null);
  };

  const link = async () => {
    setAttempted(true);
    setFormError(null);

    if (hasMemberLinkErrors(validateMemberLink(values))) return;
    if (inflight.current) return;

    inflight.current = true;
    setPending(true);

    try {
      /*
       * 응답은 세션의 `member` 블록과 같은 모양이라 **연결 직후 세션을 다시 조회하지 않는다**
       * (서버가 그렇게 맞춰 둔 계약이고 가입 경로가 이미 그 위에서 돈다). 가입과 마찬가지로
       * 이 화면은 응답 값을 쓰지 않는다 — 다음 단계인 신청서가 필요한 것을 스스로 부른다.
       */
      await linkExistingMember(buildMemberLinkRequest(values));
      // 성공하면 잠금을 풀지 않는다 — 넘어가는 사이에 버튼이 살아나면 한 번 더 나간다
      onLinked();
      return;
    } catch (error) {
      const failure = toMemberLinkFailure(error);
      /*
       * 이미 가입(또는 연결)이 끝난 계정이다. **실패가 아니라 이미 끝난 일**이므로 오류로
       * 그리지 않고 원래 하려던 신청서로 잇는다 — 이 화면이 그 사실을 말하는 방법은 문구가
       * 아니라 다음 단계 자체다. 가입 폼이 `ALREADY_SIGNED_UP`에 하는 일과 같다.
       */
      if (failure.kind === "already-linked") {
        onLinked();
        return;
      }

      inflight.current = false;
      setPending(false);

      if (failure.kind === "locked") setLocked(true);
      // 어느 칸이 틀렸는지는 붙이지 않는다 — 서버도 알려주지 않는다(link-form.ts)
      setFormError(failure.message);
    }
  };

  const disabled = pending || locked;

  return (
    <Card className="flex flex-col gap-[14px]">
      <div className="flex flex-col gap-[4px]">
        <h2 className="text-[15px] font-semibold">이 학번은 이미 명부에 등록돼 있습니다</h2>
        <p className="text-[13.5px] leading-[1.7] text-n400">
          본인 학번이 맞다면 이미 등록된 회원입니다. 새로 가입하는 대신 아래에서 기존 회원
          정보에 이 계정을 연결하면 기수·등급·역할이 그대로 유지되고, 연결한 자리에서 바로
          신청서로 이어집니다.
        </p>
      </div>

      {/*
       * 세 값이 모두 필요하다는 것과, 연락처가 명부에 없으면 여기서는 길이 없다는 것을 **누르기
       * 전에** 알린다. 실패한 뒤에는 무엇이 틀렸는지 알려줄 수 없으므로(VR-M23) 이 안내가
       * 사용자가 상황을 이해할 수 있는 유일한 지점이다.
       */}
      <div className="rounded-[12px] border border-accent/30 bg-accent-soft px-[14px] py-[11px] text-[13px] leading-[1.7] text-n400">
        <div className="font-semibold text-ink">연결에는 세 가지가 모두 필요합니다</div>
        <div className="mt-[2px]">
          학번 · 이름 · 전화번호가 <span className="font-semibold text-ink">명부의 값과 모두
          일치</span>해야 연결됩니다. 하나라도 다르면 연결되지 않으며 어느 항목이 달랐는지는
          알려드리지 않습니다.
        </div>
        <div className="mt-[2px]">
          명부에 전화번호가 없는 회원은 이 화면으로 연결할 수 없습니다 — 운영진에게 문의해주세요.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
        <Field label="학번" required error={errors.studentNumber}>
          <TextField
            value={values.studentNumber}
            onChange={(e) => set({ studentNumber: e.target.value })}
            invalid={!!errors.studentNumber}
            disabled={disabled}
            inputMode="numeric"
            placeholder="필수 · 명부에 등록된 학번"
          />
        </Field>
        <Field label="이름" required error={errors.name}>
          <TextField
            value={values.name}
            onChange={(e) => set({ name: e.target.value })}
            invalid={!!errors.name}
            disabled={disabled}
            placeholder="필수 · 명부에 등록된 이름"
          />
        </Field>
        <Field label="전화번호" required error={errors.phoneNumber}>
          <TextField
            value={values.phoneNumber}
            onChange={(e) => set({ phoneNumber: e.target.value })}
            invalid={!!errors.phoneNumber}
            disabled={disabled}
            inputMode="tel"
            placeholder="필수 · 010-1234-5678 또는 01012345678"
          />
        </Field>
      </div>

      {/* 화면이 값을 손대지 않는 이유는 link-form.ts 상단 주석에 있다 */}
      <p className="text-[12.5px] leading-[1.7] text-n500">
        전화번호는 하이픈(-)이 있어도 없어도 됩니다 — 숫자만 비교합니다.
      </p>

      {formError && (
        <div className="rounded-[12px] border border-danger/35 bg-danger/10 px-[14px] py-[10px] text-[13.5px] leading-[1.6] text-danger">
          {formError}
          {locked && (
            <div className="mt-[2px] text-[12.5px]">
              잠시 후 이 화면을 새로고침한 뒤 다시 시도해주세요.
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => void link()}
        disabled={disabled}
        className="rounded-xl bg-accent px-[16px] py-[13px] text-[15px] font-semibold text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "연결 확인 중…" : "연결하고 신청서 작성"}
      </button>
    </Card>
  );
}
