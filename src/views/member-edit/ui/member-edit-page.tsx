"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMbrStore, type Mbr } from "@/entities/member";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import type { MbrGrdCd, MbrSttsCd } from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import { TODAY } from "@/shared/config/constants";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  PageBody,
  PageHeader,
  SectionLabel,
  TextField,
  flash,
} from "@/shared/ui";

type Draft = Omit<Mbr, "mbrId" | "crtDt" | "mdfcnDt">;

const EMPTY_DRAFT: Draft = {
  stdntNo: "",
  genNo: 0,
  mbrNm: "",
  scsbjtNm: "",
  scyrNo: null,
  telno: "",
  eml: "",
  mbrGrdCd: "ASSOC",
  mbrSttsCd: "ENROLLED",
  joinYmd: TODAY,
  authUserId: null,
};

/** 숫자 입력값 → 번호N5 (빈 값은 null) */
function toNo(v: string): number | null {
  const n = Number(v.replace(/[^0-9]/g, ""));
  return v.trim() === "" || Number.isNaN(n) ? null : n;
}

/*
 * 회원 등록·수정 (#52 · 서버 #76).
 *
 * 등록·수정은 조회보다 더 강한 동작이라 화면 자체를 열지 않는다 — 여기서 "동작만 잠근다" 를
 * 따르면 남의 개인정보가 채워진 폼을 보여 준 채 저장만 막는 꼴이 된다. 근거는 views/member-list
 * 의 NO_MEMBER_MANAGE 주석.
 */
const NO_MEMBER_MANAGE =
  "회원 관리(MEMBER_MANAGE) 권한이 없어 회원 정보를 수정할 수 없습니다 — 운영진에게 요청해주세요";

export function MemberEditPage({ mbrId }: { mbrId?: number }) {
  const canManage = useCan(CAPABILITY.MEMBER_MANAGE);

  /* 훅을 조건부로 부를 수 없으므로 본문을 별도 컴포넌트로 뺀다 (views/role-authorities 와 같다) */
  if (!canManage) {
    return (
      <>
        <PageHeader title={mbrId ? "회원 수정" : "회원 등록"} showBack />
        <PageBody>
          <EmptyState message={NO_MEMBER_MANAGE} />
        </PageBody>
      </>
    );
  }

  return <MemberEditForm mbrId={mbrId} />;
}

function MemberEditForm({ mbrId }: { mbrId?: number }) {
  const router = useRouter();
  const { mbrs, mbrGrds, mbrSttss, updateMbr, addMbr } = useMbrStore();
  const existing = mbrId ? mbrs.find((m) => m.mbrId === mbrId) : undefined;
  const [draft, setDraft] = useState<Draft>(existing ?? EMPTY_DRAFT);
  const [error, setError] = useState(false);

  if (mbrId && !existing) {
    return (
      <>
        <PageHeader title="회원 수정" showBack />
        <PageBody>
          <EmptyState message="회원을 찾을 수 없습니다." />
        </PageBody>
      </>
    );
  }

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const save = () => {
    if (!draft.mbrNm || !draft.stdntNo) {
      setError(true);
      flash("필수값을 확인하세요");
      return;
    }
    if (existing) {
      updateMbr(existing.mbrId, { ...draft, mdfcnDt: `${TODAY}T10:00:00` });
      flash("저장되었습니다");
      router.replace(ROUTES.memberDetail(existing.mbrId));
      return;
    }
    const newMbrId = addMbr(draft);
    flash("저장되었습니다");
    router.replace(ROUTES.memberDetail(newMbrId));
  };

  return (
    <>
      <PageHeader
        title={existing ? "회원 수정" : "회원 등록"}
        subtitle="기본정보 · 등급 · 상태"
        showBack
      />
      <PageBody>
        <div className="grid grid-cols-[1.15fr_1fr] items-start gap-4">
          <Card>
            <SectionLabel className="mb-3">기본정보</SectionLabel>
            <div className="mb-3 text-[13.5px] text-n500">
              회원 ID {existing ? existing.mbrId : "(자동 채번)"}
            </div>
            <div className="grid grid-cols-2 gap-[14px]">
              <Field label="회원_명" required>
                <TextField
                  value={draft.mbrNm}
                  onChange={(e) => set({ mbrNm: e.target.value })}
                  placeholder="필수"
                />
              </Field>
              <Field label="학생_번호" required>
                <TextField
                  value={draft.stdntNo}
                  onChange={(e) => set({ stdntNo: e.target.value })}
                  placeholder="예: 202011234"
                />
              </Field>
              <Field label="기수_번호">
                <TextField
                  value={draft.genNo ? String(draft.genNo) : ""}
                  onChange={(e) => set({ genNo: toNo(e.target.value) ?? 0 })}
                  placeholder="선택 · 미입력 시 미배정"
                />
              </Field>
              <Field label="학과_명">
                <TextField
                  value={draft.scsbjtNm ?? ""}
                  onChange={(e) => set({ scsbjtNm: e.target.value })}
                />
              </Field>
              <Field label="학년_번호">
                <TextField
                  value={draft.scyrNo === null ? "" : String(draft.scyrNo)}
                  onChange={(e) => set({ scyrNo: toNo(e.target.value) })}
                  placeholder="1~4"
                />
              </Field>
              <Field label="전화번호">
                <TextField
                  value={draft.telno ?? ""}
                  onChange={(e) => set({ telno: e.target.value })}
                  placeholder="010-0000-0000"
                />
              </Field>
              <Field label="이메일">
                <TextField
                  value={draft.eml ?? ""}
                  onChange={(e) => set({ eml: e.target.value })}
                />
              </Field>
              <Field label="가입_일자">
                <TextField
                  value={draft.joinYmd}
                  onChange={(e) => set({ joinYmd: e.target.value })}
                  placeholder="YYYY-MM-DD"
                />
              </Field>
            </div>
            {error && (
              <div className="mt-4 rounded-[10px] border border-danger/28 bg-danger/8 px-3 py-[10px] text-[14px] text-danger">
                회원_명 · 학생_번호는 필수입니다.
              </div>
            )}
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <SectionLabel className="mb-3">등급 · 상태</SectionLabel>
              <div className="mb-2 text-[13.5px] text-n400">회원등급</div>
              <div className="mb-4 flex flex-wrap gap-[7px]">
                {mbrGrds.map((g) => (
                  <Chip
                    key={g.mbrGrdCd}
                    active={draft.mbrGrdCd === g.mbrGrdCd}
                    onClick={() => set({ mbrGrdCd: g.mbrGrdCd as MbrGrdCd })}
                  >
                    {g.mbrGrdNm}
                  </Chip>
                ))}
              </div>
              <div className="mb-2 text-[13.5px] text-n400">회원상태</div>
              <div className="flex flex-wrap gap-[7px]">
                {mbrSttss.map((s) => (
                  <Chip
                    key={s.mbrSttsCd}
                    active={draft.mbrSttsCd === s.mbrSttsCd}
                    onClick={() => set({ mbrSttsCd: s.mbrSttsCd as MbrSttsCd })}
                  >
                    {s.mbrSttsNm}
                  </Chip>
                ))}
              </div>
            </Card>
            <Button block className="py-[13px]" onClick={save}>
              저장
            </Button>
          </div>
        </div>
      </PageBody>
    </>
  );
}
