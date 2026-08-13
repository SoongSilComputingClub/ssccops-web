"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMemberStore, type Member } from "@/entities/member";
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

type Draft = Omit<Member, "id" | "key">;

const EMPTY_DRAFT: Draft = {
  name: "",
  sid: "",
  cohort: "",
  dept: "",
  year: "",
  phone: "",
  email: "",
  grade: "준회원",
  status: "재학",
  joined: TODAY,
  roles: [],
};

export function MemberEditPage({ memberKey }: { memberKey?: string }) {
  const router = useRouter();
  const { members, grades, statuses, updateMember, addMember, addHistory } =
    useMemberStore();
  const existing = memberKey ? members.find((m) => m.key === memberKey) : undefined;
  const [draft, setDraft] = useState<Draft>(existing ?? EMPTY_DRAFT);
  const [error, setError] = useState(false);

  if (memberKey && !existing) {
    return (
      <>
        <PageHeader title="회원 수정" showBack />
        <PageBody>
          <EmptyState message="회원을 찾을 수 없습니다." />
        </PageBody>
      </>
    );
  }

  const isGrad = draft.kind === "졸업생" || draft.status === "졸업";
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const save = () => {
    if (!draft.name || !draft.sid) {
      setError(true);
      flash("필수값을 확인하세요");
      return;
    }
    if (existing) {
      updateMember(existing.key, draft);
      flash("저장되었습니다");
      router.replace(ROUTES.memberDetail(existing.key));
      return;
    }
    const key = addMember(draft);
    addHistory({
      type: "기본정보",
      member: draft.name,
      from: "-",
      to: "신규 등록",
      reason: "직접 등록",
      by: "김도현",
      at: `${TODAY} 09:00`,
    });
    flash("저장되었습니다");
    router.replace(ROUTES.memberDetail(key));
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
              회원번호 {existing ? existing.id : "(자동 채번)"}
            </div>
            <div className="grid grid-cols-2 gap-[14px]">
              <Field label="회원명" required>
                <TextField
                  value={draft.name}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder="필수"
                />
              </Field>
              <Field label="학생번호" required>
                <TextField
                  value={draft.sid}
                  onChange={(e) => set({ sid: e.target.value })}
                  placeholder="예: 202011234"
                />
              </Field>
              <Field label="기수번호">
                <TextField
                  value={draft.cohort}
                  onChange={(e) => set({ cohort: e.target.value })}
                  placeholder="선택 · 미입력 시 미배정"
                />
              </Field>
              <Field label="학과명">
                <TextField
                  value={draft.dept}
                  onChange={(e) => set({ dept: e.target.value })}
                />
              </Field>
              {isGrad ? (
                <Field label="졸업연도">
                  <TextField
                    value={draft.gradYear ?? ""}
                    onChange={(e) => set({ gradYear: e.target.value })}
                    placeholder="예: 2021"
                  />
                </Field>
              ) : (
                <Field label="학년번호">
                  <TextField
                    value={draft.year}
                    onChange={(e) => set({ year: e.target.value })}
                    placeholder="1~4"
                  />
                </Field>
              )}
              <Field label="연락처번호">
                <TextField
                  value={draft.phone}
                  onChange={(e) => set({ phone: e.target.value })}
                  placeholder="010-0000-0000"
                />
              </Field>
              <Field label="이메일주소">
                <TextField
                  value={draft.email}
                  onChange={(e) => set({ email: e.target.value })}
                />
              </Field>
              <Field label="가입일자">
                <TextField
                  value={draft.joined}
                  onChange={(e) => set({ joined: e.target.value })}
                  placeholder="YYYY-MM-DD"
                />
              </Field>
            </div>
            {error && (
              <div className="mt-4 rounded-[10px] border border-danger/28 bg-danger/8 px-3 py-[10px] text-[14px] text-danger">
                회원명 · 학생번호는 필수입니다.
              </div>
            )}
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <SectionLabel className="mb-3">등급 · 상태</SectionLabel>
              <div className="mb-2 text-[13.5px] text-n400">회원등급</div>
              <div className="mb-4 flex flex-wrap gap-[7px]">
                {grades
                  .filter((g) => g.on)
                  .map((g) => (
                    <Chip
                      key={g.name}
                      active={draft.grade === g.name}
                      onClick={() => set({ grade: g.name })}
                    >
                      {g.name}
                    </Chip>
                  ))}
              </div>
              <div className="mb-2 text-[13.5px] text-n400">회원상태</div>
              <div className="flex flex-wrap gap-[7px]">
                {statuses
                  .filter((s) => s.on)
                  .map((s) => (
                    <Chip
                      key={s.name}
                      active={draft.status === s.name}
                      onClick={() => set({ status: s.name })}
                    >
                      {s.name}
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
