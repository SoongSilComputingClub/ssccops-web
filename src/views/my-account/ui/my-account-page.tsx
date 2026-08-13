"use client";

import { useState } from "react";
import {
  cohortText,
  gradeTone,
  isGraduate,
  statusTone,
  useMemberStore,
  type Member,
  type SocialLink,
} from "@/entities/member";
import { useSessionStore } from "@/entities/session";
import { PROVIDERS, TODAY } from "@/shared/config/constants";
import {
  Badge,
  Button,
  Card,
  Field,
  KeyValueGrid,
  PageBody,
  PageHeader,
  Pill,
  SectionLabel,
  Segmented,
  TextField,
  flash,
} from "@/shared/ui";

const EDITABLE = [
  { key: "name", label: "회원명", ph: "필수" },
  { key: "sid", label: "학생번호", ph: "선택" },
  { key: "dept", label: "학과명", ph: "" },
  { key: "phone", label: "연락처번호", ph: "" },
] as const;

type EditableKey = (typeof EDITABLE)[number]["key"] | "year" | "gradYear";

function ProfileTab({ member }: { member: Member }) {
  const updateMember = useMemberStore((s) => s.updateMember);
  const addHistory = useMemberStore((s) => s.addHistory);
  const [draft, setDraft] = useState<Partial<Record<EditableKey, string>>>({});

  const value = (key: EditableKey) => draft[key] ?? (member[key] as string) ?? "";
  const dirty = Object.entries(draft).some(
    ([k, v]) => v !== undefined && v !== ((member[k as EditableKey] as string) ?? ""),
  );

  const save = () => {
    if (!value("name").trim()) {
      flash("회원명은 비울 수 없습니다");
      return;
    }
    const changed = Object.entries(draft).filter(
      ([k, v]) => v !== undefined && v !== ((member[k as EditableKey] as string) ?? ""),
    );
    changed.forEach(([k, v]) => {
      const labels: Record<string, string> = {
        name: "회원명",
        sid: "학생번호",
        dept: "학과명",
        year: "학년번호",
        gradYear: "졸업연도",
        phone: "연락처번호",
      };
      addHistory({
        type: "기본정보",
        member: member.name,
        from: `${(member[k as EditableKey] as string) || "미입력"} (${labels[k]})`,
        to: v as string,
        reason: "내 정보 수정(본인)",
        by: member.name,
        at: `${TODAY} 10:00`,
      });
    });
    updateMember(member.key, Object.fromEntries(changed));
    setDraft({});
    flash(`${changed.length}건을 저장했습니다`);
  };

  return (
    <div className="grid grid-cols-[1.15fr_1fr] items-start gap-4">
      <Card>
        <SectionLabel className="mb-3">내가 수정할 수 있는 항목</SectionLabel>
        <div className="grid grid-cols-2 gap-[14px]">
          {EDITABLE.map((f) => (
            <Field key={f.key} label={f.label}>
              <TextField
                value={value(f.key)}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                placeholder={f.ph}
              />
            </Field>
          ))}
          {isGraduate(member) ? (
            <Field label="졸업연도">
              <TextField
                value={value("gradYear")}
                onChange={(e) => setDraft((d) => ({ ...d, gradYear: e.target.value }))}
                placeholder="예: 2021"
              />
            </Field>
          ) : (
            <Field label="학년번호">
              <TextField
                value={value("year")}
                onChange={(e) => setDraft((d) => ({ ...d, year: e.target.value }))}
              />
            </Field>
          )}
        </div>
        {dirty && (
          <div className="mt-4 flex gap-2">
            <Button variant="ghost" onClick={() => setDraft({})}>
              되돌리기
            </Button>
            <Button onClick={save}>저장</Button>
          </div>
        )}
      </Card>

      <Card>
        <SectionLabel className="mb-3">운영진만 변경할 수 있는 항목</SectionLabel>
        <KeyValueGrid
          items={[
            {
              k: "기수",
              v:
                cohortText(member) === "미배정"
                  ? "미배정 · 운영진이 배정합니다"
                  : cohortText(member),
            },
            { k: "이메일", v: member.email || "미입력" },
            { k: "회원등급", v: <Badge tone={gradeTone(member.grade)}>{member.grade}</Badge> },
            { k: "회원상태", v: <Badge tone={statusTone(member.status)}>{member.status}</Badge> },
          ]}
        />
      </Card>
    </div>
  );
}

function LinksTab({ member }: { member: Member }) {
  const links = useMemberStore((s) => s.links[member.key] ?? []);
  const setLinks = useMemberStore((s) => s.setLinks);

  const handleOf = (p: string) => {
    const local = (member.email.split("@")[0] || member.name).toLowerCase();
    if (p === "GOOGLE") return `${local}@gmail.com`;
    if (p === "NAVER") return `${local}@naver.com`;
    if (p === "KAKAO") return `${local}@kakao.com`;
    return `${local}-dev`;
  };

  const unlink = (link: SocialLink) => {
    if (links.length <= 1) {
      flash("마지막 로그인 수단은 해제할 수 없습니다");
      return;
    }
    if (link.primary) {
      flash("대표 계정은 해제할 수 없습니다. 먼저 대표를 변경하세요");
      return;
    }
    setLinks(member.key, links.filter((l) => l.p !== link.p));
    flash(`${link.p} 연결을 해제했습니다`);
  };

  const connect = (p: string) => {
    setLinks(member.key, [
      ...links,
      { p, account: handleOf(p), linked: TODAY, last: "-", primary: links.length === 0 },
    ]);
    flash(`${p} 계정을 연결했습니다`);
  };

  const setPrimary = (p: string) => {
    setLinks(
      member.key,
      links.map((l) => ({ ...l, primary: l.p === p })),
    );
    flash(`${p} 을(를) 대표 계정으로 지정했습니다`);
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-[14px]">
        {PROVIDERS.map((p) => {
          const link = links.find((l) => l.p === p);
          return (
            <Card key={p}>
              <div className="flex items-center gap-2">
                <Badge tone={link ? "blue" : "grey"}>{p}</Badge>
                {link?.primary && <Pill tone="blue">대표</Pill>}
                <div className="flex-1" />
                {link ? (
                  <button
                    type="button"
                    onClick={() => unlink(link)}
                    className="cursor-pointer text-[13.5px] text-n400 hover:text-danger"
                  >
                    연결 해제
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => connect(p)}
                    className="cursor-pointer text-[13.5px] text-accent"
                  >
                    연결
                  </button>
                )}
              </div>
              <div className="mt-2 font-mono text-[14px]">
                {link ? link.account : <span className="text-n500">연결되지 않음</span>}
              </div>
              <div className="mt-1 text-[13px] text-n500">
                {link
                  ? `연결 ${link.linked} · 최근 로그인 ${link.last}`
                  : "이 계정으로도 로그인할 수 있습니다"}
              </div>
              {link && !link.primary && (
                <button
                  type="button"
                  onClick={() => setPrimary(p)}
                  className="mt-2 cursor-pointer text-left text-[13.5px] text-accent"
                >
                  대표 계정으로 지정
                </button>
              )}
            </Card>
          );
        })}
      </div>
      <div className="mt-3 text-[13.5px] text-n500">
        대표 계정은 로그인 식별에 사용되며, 최소 한 개의 소셜 계정은 연결되어 있어야
        합니다.
      </div>
    </>
  );
}

export function MyAccountPage() {
  const memberKey = useSessionStore((s) => s.memberKey);
  const member = useMemberStore((s) => s.members.find((m) => m.key === memberKey));
  const [tab, setTab] = useState<"프로필" | "연결된 계정">("프로필");

  if (!member) return null;

  return (
    <>
      <PageHeader title="내 계정" subtitle="프로필 · 연결된 소셜 계정" />
      <PageBody>
        <Card className="mb-4">
          <div className="flex items-center gap-[10px]">
            <div className="text-[25px] font-medium">{member.name}</div>
            <Badge tone={gradeTone(member.grade)}>{member.grade}</Badge>
            <Badge tone={statusTone(member.status)}>{member.status}</Badge>
            <div className="flex-1" />
            <div className="text-[14px] text-n500">
              {member.id} · {cohortText(member)} · {member.dept || "학과 미입력"}
            </div>
          </div>
        </Card>

        <Segmented
          options={["프로필", "연결된 계정"] as const}
          value={tab}
          onChange={setTab}
          className="mb-4 w-[320px]"
        />

        {tab === "프로필" ? <ProfileTab member={member} /> : <LinksTab member={member} />}
      </PageBody>
    </>
  );
}
