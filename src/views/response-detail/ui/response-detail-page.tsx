"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStore } from "@/entities/form";
import { cohortText, isGraduate, useMemberStore } from "@/entities/member";
import { RESPONSE_STATUS, useResponseStore } from "@/entities/response";
import { ResponseStatusSheet } from "@/features/form";
import { ROUTES } from "@/shared/config/routes";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  KeyValueGrid,
  PageBody,
  PageHeader,
  SectionLabel,
  flash,
} from "@/shared/ui";

export function ResponseDetailPage({
  formKey,
  responseId,
}: {
  formKey: string;
  responseId: string;
}) {
  const router = useRouter();
  const form = useFormStore((s) => s.forms.find((f) => f.key === formKey));
  const responses = useResponseStore((s) =>
    s.responses.filter((r) => r.form === formKey),
  );
  const members = useMemberStore((s) => s.members);
  const [sheetOpen, setSheetOpen] = useState(false);

  const idx = responses.findIndex((r) => r.id === responseId);
  const response = responses[idx];

  if (!form || !response) {
    return (
      <>
        <PageHeader title="응답 상세" showBack />
        <PageBody>
          <EmptyState message="응답을 찾을 수 없습니다." />
        </PageBody>
      </>
    );
  }

  const member = response.member
    ? members.find((m) => m.key === response.member)
    : undefined;
  const rs = RESPONSE_STATUS[response.status];
  const name = member?.name ?? response.guest?.name ?? "비회원 응답";

  const go = (dir: -1 | 1) => {
    const next = responses[Math.min(responses.length - 1, Math.max(0, idx + dir))];
    if (next && next.id !== response.id)
      router.replace(ROUTES.responseDetail(formKey, next.id));
  };

  return (
    <>
      <PageHeader
        title="응답 상세"
        subtitle={`${idx + 1} / ${responses.length}`}
        showBack
      />
      <PageBody>
        <div className="grid grid-cols-[1fr_1.2fr] items-start gap-4">
          <Card>
            <div className="flex items-center gap-2">
              <div className="text-[23px] font-medium">{name}</div>
              <div className="flex-1" />
              <Badge tone={rs.tone}>{rs.label}</Badge>
            </div>
            <div className="mt-1 text-[13px] text-n500">
              회원 도메인에서 조회 · 응답에 중복 저장하지 않음
            </div>
            <KeyValueGrid
              className="mt-4"
              items={[
                { k: "회원_ID", v: member?.id ?? "비회원" },
                { k: "학생번호", v: member?.sid ?? response.guest?.sid ?? "-" },
                { k: "기수", v: member ? cohortText(member) : "-" },
                { k: "학과", v: member?.dept ?? response.guest?.dept ?? "-" },
                member && isGraduate(member)
                  ? { k: "졸업연도", v: member.gradYear ?? "졸업" }
                  : { k: "학년", v: member ? `${member.year}학년` : "-" },
                { k: "연락처", v: member?.phone ?? response.guest?.phone ?? "-" },
                { k: "회원등급", v: member?.grade ?? "임시회원" },
                { k: "회원상태", v: member?.status ?? "검토" },
              ]}
            />
            <button
              type="button"
              onClick={() => {
                if (member) router.push(ROUTES.memberDetail(member.key));
                else flash("비회원 응답입니다");
              }}
              className="mt-4 cursor-pointer text-[14px] text-accent"
            >
              회원 상세로 이동 ›
            </button>
          </Card>

          <Card>
            <SectionLabel className="mb-3">응답 내용</SectionLabel>
            <div className="flex flex-col gap-3">
              {form.questions.map((q) => (
                <div key={q.qid}>
                  <div className="text-[13.5px] text-n500">{q.label}</div>
                  <div className="mt-[2px] text-[16px]">
                    {response.answers[q.qid] || (
                      <span className="text-n500">(응답 없음)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" disabled={idx === 0} onClick={() => go(-1)}>
            이전
          </Button>
          <Button onClick={() => setSheetOpen(true)}>응답 상태 변경</Button>
          <Button
            variant="ghost"
            disabled={idx >= responses.length - 1}
            onClick={() => go(1)}
          >
            다음
          </Button>
        </div>

        <ResponseStatusSheet
          responseId={sheetOpen ? response.id : null}
          current={response.status}
          onClose={() => setSheetOpen(false)}
        />
      </PageBody>
    </>
  );
}
