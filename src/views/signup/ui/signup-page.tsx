"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMbrStore } from "@/entities/member";
import { useSessionStore } from "@/entities/session";
import { TODAY } from "@/shared/config/constants";
import { ROUTES } from "@/shared/config/routes";
import { Button, Card, Chip, Field, TextField, flash } from "@/shared/ui";

export function SignupPage() {
  const router = useRouter();
  const addMbr = useMbrStore((s) => s.addMbr);
  const pendingAuthUser = useSessionStore((s) => s.pendingAuthUser);
  const setPending = useSessionStore((s) => s.setPending);

  /** 재학/졸업은 회원_상태_코드로 그대로 표현한다 (별도 구분 컬럼 없음) */
  const [mbrSttsCd, setMbrSttsCd] = useState<"ENROLLED" | "GRADUATED">("ENROLLED");
  const [f, setF] = useState({
    mbrNm: pendingAuthUser?.name ?? "",
    stdntNo: "",
    scsbjtNm: "",
    scyrNo: "",
    telno: "",
    genNo: "",
  });
  const set = (patch: Partial<typeof f>) => setF((v) => ({ ...v, ...patch }));

  useEffect(() => {
    if (!pendingAuthUser) router.replace(ROUTES.login);
  }, [pendingAuthUser, router]);

  if (!pendingAuthUser) return null;

  const provider = pendingAuthUser.provider?.toUpperCase() ?? "GOOGLE";
  const isEnrolled = mbrSttsCd === "ENROLLED";

  const submit = () => {
    const missing: string[] = [];
    if (!f.mbrNm.trim()) missing.push("회원_명");
    if (!f.telno.trim()) missing.push("전화번호");
    if (isEnrolled) {
      if (!f.stdntNo.trim()) missing.push("학생_번호");
      if (!f.scsbjtNm.trim()) missing.push("학과_명");
      if (!f.scyrNo.trim()) missing.push("학년_번호");
    }
    if (missing.length > 0) {
      flash(`${missing.join(" · ")} 을(를) 입력하세요`);
      return;
    }
    const mbrId = addMbr({
      stdntNo: f.stdntNo.trim(),
      genNo: Number(f.genNo.trim()) || 0,
      mbrNm: f.mbrNm.trim(),
      scsbjtNm: f.scsbjtNm.trim() || null,
      scyrNo: Number(f.scyrNo.trim()) || null,
      telno: f.telno.trim(),
      eml: pendingAuthUser.email,
      mbrGrdCd: "TEMP",
      mbrSttsCd,
      joinYmd: TODAY,
      authUserId: pendingAuthUser.id,
    });
    setPending(mbrId);
    flash("회원 가입이 완료되었습니다");
    router.push(ROUTES.signupComplete);
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
          <Chip key={cd} active={mbrSttsCd === cd} onClick={() => setMbrSttsCd(cd)}>
            {label}
          </Chip>
        ))}
      </div>

      <Card className="mt-4">
        <div className="grid grid-cols-2 gap-[14px]">
          <div className="col-span-2">
            <div className="mb-[6px] text-[13.5px] text-n400">이메일</div>
            <div className="rounded-[12px] bg-bg px-[11px] py-[9px] text-[15.5px] text-n300">
              {pendingAuthUser.email}
            </div>
            <div className="mt-1 text-[12.5px] text-n500">
              {provider} 계정에서 자동으로 가져왔습니다
            </div>
          </div>

          <Field label="회원_명" required>
            <TextField
              value={f.mbrNm}
              onChange={(e) => set({ mbrNm: e.target.value })}
              placeholder="필수"
            />
          </Field>
          <Field label="전화번호" required>
            <TextField
              value={f.telno}
              onChange={(e) => set({ telno: e.target.value })}
              placeholder="필수"
            />
          </Field>
          <Field label="학생_번호" required={isEnrolled}>
            <TextField
              value={f.stdntNo}
              onChange={(e) => set({ stdntNo: e.target.value })}
              placeholder={isEnrolled ? "필수" : "선택 · 기억나는 경우"}
            />
          </Field>
          <Field label="학과_명" required={isEnrolled}>
            <TextField
              value={f.scsbjtNm}
              onChange={(e) => set({ scsbjtNm: e.target.value })}
              placeholder={isEnrolled ? "필수" : "선택"}
            />
          </Field>
          {isEnrolled && (
            <Field label="학년_번호" required>
              <TextField
                value={f.scyrNo}
                onChange={(e) => set({ scyrNo: e.target.value })}
                placeholder="필수 · 1~4"
              />
            </Field>
          )}
          <Field label="기수_번호">
            <TextField
              value={f.genNo}
              onChange={(e) => set({ genNo: e.target.value })}
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
