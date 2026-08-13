"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMemberStore } from "@/entities/member";
import { useSessionStore } from "@/entities/session";
import { TODAY } from "@/shared/config/constants";
import { ROUTES } from "@/shared/config/routes";
import { Button, Card, Chip, Field, TextField, flash } from "@/shared/ui";

const PROVIDER = "NAVER";
const EMAIL = "yujin_2026@naver.com";

export function SignupPage() {
  const router = useRouter();
  const addMember = useMemberStore((s) => s.addMember);
  const addHistory = useMemberStore((s) => s.addHistory);
  const setPending = useSessionStore((s) => s.setPending);

  const [kind, setKind] = useState<"재학생" | "졸업생">("재학생");
  const [f, setF] = useState({
    name: "",
    sid: "",
    dept: "",
    year: "",
    phone: "",
    cohort: "",
    gradYear: "",
  });
  const set = (patch: Partial<typeof f>) => setF((v) => ({ ...v, ...patch }));

  const submit = () => {
    const missing: string[] = [];
    if (!f.name.trim()) missing.push("회원명");
    if (kind === "재학생") {
      if (!f.sid.trim()) missing.push("학생번호");
      if (!f.dept.trim()) missing.push("학과명");
      if (!f.year.trim()) missing.push("학년번호");
      if (!f.phone.trim()) missing.push("연락처번호");
    } else {
      if (!f.gradYear.trim()) missing.push("졸업연도");
      if (!f.phone.trim()) missing.push("연락처번호");
    }
    if (missing.length > 0) {
      flash(`${missing.join(" · ")} 을(를) 입력하세요`);
      return;
    }
    const key = addMember({
      name: f.name.trim(),
      sid: f.sid.trim(),
      cohort: f.cohort.trim() || "미배정",
      dept: f.dept.trim(),
      year: f.year.trim(),
      phone: f.phone.trim(),
      email: EMAIL,
      grade: "임시회원",
      status: kind === "졸업생" ? "졸업" : "재학",
      joined: TODAY,
      roles: [],
      kind,
      provider: PROVIDER,
      ...(kind === "졸업생" ? { gradYear: f.gradYear.trim() } : {}),
    });
    addHistory({
      type: "기본정보",
      member: f.name.trim(),
      from: "-",
      to: `소셜 가입 · ${PROVIDER}`,
      reason: "회원 가입",
      by: "시스템",
      at: `${TODAY} 12:00`,
    });
    setPending(key);
    flash("회원 가입이 완료되었습니다");
    router.push(ROUTES.signupComplete);
  };

  return (
    <div className="w-[640px] px-6 py-14">
      <h1 className="text-[28px] font-medium tracking-[-.4px]">회원 가입</h1>
      <p className="mt-2 text-[14.5px] text-n400">
        소셜 계정 <span className="font-semibold text-ink">{PROVIDER}</span> 로
        인증되었습니다. 등급 임시회원으로 등록되며 바로 이용할 수 있습니다.
      </p>

      <div className="mt-5 flex gap-[7px]">
        {(["재학생", "졸업생"] as const).map((k) => (
          <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
            {k}
          </Chip>
        ))}
      </div>

      <Card className="mt-4">
        <div className="grid grid-cols-2 gap-[14px]">
          <div className="col-span-2">
            <div className="mb-[6px] text-[13.5px] text-n400">이메일주소</div>
            <div className="rounded-[12px] bg-bg px-[11px] py-[9px] text-[15.5px] text-n300">
              {EMAIL}
            </div>
            <div className="mt-1 text-[12.5px] text-n500">
              {PROVIDER} 계정에서 자동으로 가져왔습니다
            </div>
          </div>

          <Field label="회원명" required>
            <TextField value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="필수" />
          </Field>
          {kind === "재학생" ? (
            <>
              <Field label="학생번호" required>
                <TextField value={f.sid} onChange={(e) => set({ sid: e.target.value })} placeholder="필수" />
              </Field>
              <Field label="학과명" required>
                <TextField value={f.dept} onChange={(e) => set({ dept: e.target.value })} placeholder="필수" />
              </Field>
              <Field label="학년번호" required>
                <TextField value={f.year} onChange={(e) => set({ year: e.target.value })} placeholder="필수" />
              </Field>
              <Field label="연락처번호" required>
                <TextField value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="필수" />
              </Field>
              <Field label="기수번호">
                <TextField value={f.cohort} onChange={(e) => set({ cohort: e.target.value })} placeholder="선택 · 운영진이 배정" />
              </Field>
            </>
          ) : (
            <>
              <Field label="졸업연도" required>
                <TextField value={f.gradYear} onChange={(e) => set({ gradYear: e.target.value })} placeholder="필수 · 예: 2021" />
              </Field>
              <Field label="연락처번호" required>
                <TextField value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="필수" />
              </Field>
              <Field label="학생번호">
                <TextField value={f.sid} onChange={(e) => set({ sid: e.target.value })} placeholder="선택 · 기억나는 경우" />
              </Field>
              <Field label="학과명">
                <TextField value={f.dept} onChange={(e) => set({ dept: e.target.value })} placeholder="선택" />
              </Field>
              <Field label="기수번호">
                <TextField value={f.cohort} onChange={(e) => set({ cohort: e.target.value })} placeholder="선택 · 모르면 비워두세요" />
              </Field>
            </>
          )}
        </div>
        <div className="mt-4 text-[13px] text-n500">
          {kind === "재학생"
            ? "재학생은 기수번호를 제외한 모든 항목이 필수입니다. 기수는 운영진이 배정합니다."
            : "졸업생은 회원명 · 졸업연도 · 연락처번호만 필수입니다. 학번과 기수는 기억나지 않으면 비워두세요."}
        </div>
      </Card>

      <div className="mt-4 flex gap-2">
        <Button variant="ghost" onClick={() => router.push(ROUTES.login)}>
          로그인으로 돌아가기
        </Button>
        <Button className="flex-1 py-3" onClick={submit}>
          회원 가입
        </Button>
      </div>
    </div>
  );
}
