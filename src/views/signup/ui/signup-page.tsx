"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMbrStore } from "@/entities/member";
import { useSessionStore } from "@/entities/session";
import { TODAY } from "@/shared/config/constants";
import { ROUTES } from "@/shared/config/routes";
import { Button, Card, Chip, Field, TextField, flash } from "@/shared/ui";

export function SignupPage() {
  const router = useRouter();
  const addMbr = useMbrStore((s) => s.addMbr);
  /*
   * 인증 정보의 출처를 zustand의 pendingAuthUser에서 서버 세션으로 옮겼다 —
   * 새로고침하면 사라지는 값에 기대던 탓에 가입 도중 새로고침하면 로그인으로 튕겼다.
   * 이 화면은 SignupGate가 "인증됨 + 미가입"일 때만 열어 주므로 authUser는 항상 채워져 있다.
   */
  const authUser = useSessionStore((s) => s.authUser);
  const setPending = useSessionStore((s) => s.setPending);
  const logout = useSessionStore((s) => s.logout);

  /** 재학/졸업은 회원_상태_코드로 그대로 표현한다 (별도 구분 컬럼 없음) */
  const [mbrSttsCd, setMbrSttsCd] = useState<"ENROLLED" | "GRADUATED">("ENROLLED");
  const [f, setF] = useState({
    mbrNm: authUser?.name ?? "",
    stdntNo: "",
    scsbjtNm: "",
    scyrNo: "",
    telno: "",
    genNo: "",
  });
  const set = (patch: Partial<typeof f>) => setF((v) => ({ ...v, ...patch }));

  if (!authUser) return null;

  const provider = authUser.provider?.toUpperCase() ?? "GOOGLE";
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
      eml: authUser.email ?? "",
      mbrGrdCd: "TEMP",
      mbrSttsCd,
      joinYmd: TODAY,
      authUserId: authUser.id,
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
              {authUser.email}
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
        {/* 인증은 이미 끝난 상태라 그냥 /login으로 보내면 가드가 다시 이 화면으로 되돌린다 — 로그아웃해야 한다 */}
        <Button
          variant="ghost"
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
        <Button className="flex-1 py-3" onClick={submit}>
          회원 가입
        </Button>
      </div>
    </div>
  );
}
