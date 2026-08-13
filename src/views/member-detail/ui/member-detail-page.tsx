"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  cohortText,
  gradeTone,
  isGraduate,
  statusTone,
  useMemberStore,
} from "@/entities/member";
import { GradeStatusSheet, RoleSheet, useMemberActions } from "@/features/member";
import { ROUTES } from "@/shared/config/routes";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageBody,
  PageHeader,
  Pill,
  SectionLabel,
} from "@/shared/ui";

export function MemberDetailPage({ memberKey }: { memberKey: string }) {
  const router = useRouter();
  const member = useMemberStore((s) => s.members.find((m) => m.key === memberKey));
  const history = useMemberStore((s) => s.history);
  const { endRole } = useMemberActions();
  const [sheet, setSheet] = useState<"grade" | "status" | null>(null);
  const [roleSheet, setRoleSheet] = useState(false);

  if (!member) {
    return (
      <>
        <PageHeader title="회원 상세" showBack />
        <PageBody>
          <EmptyState message="회원을 찾을 수 없습니다." />
        </PageBody>
      </>
    );
  }

  const myHistory = history.filter((h) => h.member === member.name).slice(0, 3);

  return (
    <>
      <PageHeader title="회원 상세" subtitle={member.id} showBack />
      <PageBody>
        <div className="grid grid-cols-[1.15fr_1fr] items-start gap-4">
          <div className="flex flex-col gap-4">
            <Card>
              <div className="flex items-center gap-[10px]">
                <div className="text-[26px] font-medium">{member.name}</div>
                <Badge tone={gradeTone(member.grade)}>{member.grade}</Badge>
                <Badge tone={statusTone(member.status)}>{member.status}</Badge>
                <div className="flex-1" />
                <Button onClick={() => router.push(ROUTES.memberEdit(member.key))}>
                  회원정보 수정
                </Button>
              </div>
              <div className="mt-1 text-[13.5px] text-n500">
                {member.id} · 가입 {member.joined}
              </div>
              <div className="my-4 h-px bg-gradient-to-r from-transparent via-line to-transparent" />
              <div className="grid grid-cols-[84px_1fr_84px_1fr] gap-y-[9px] text-[15px]">
                <div className="text-[14px] text-n500">학생번호</div>
                <div>{member.sid || "학번 미확인"}</div>
                <div className="text-[14px] text-n500">기수</div>
                <div>{cohortText(member)}</div>
                <div className="text-[14px] text-n500">학과</div>
                <div>{member.dept || "학과 미입력"}</div>
                {isGraduate(member) ? (
                  <>
                    <div className="text-[14px] text-n500">졸업연도</div>
                    <div>{member.gradYear ? `${member.gradYear}년` : "졸업"}</div>
                  </>
                ) : (
                  <>
                    <div className="text-[14px] text-n500">학년</div>
                    <div>{member.year ? `${member.year}학년` : "학년 미입력"}</div>
                  </>
                )}
                <div className="text-[14px] text-n500">연락처</div>
                <div>{member.phone || "미입력"}</div>
                <div className="text-[14px] text-n500">이메일</div>
                <div>{member.email || "미입력"}</div>
              </div>
            </Card>

            <Card>
              <SectionLabel className="mb-3">등급 · 상태</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                {(["grade", "status"] as const).map((kind) => (
                  <div
                    key={kind}
                    onClick={() => setSheet(kind)}
                    className="cursor-pointer rounded-[12px] border border-line p-[14px] transition-colors hover:border-accent"
                  >
                    <div className="text-[13px] text-n500">
                      {kind === "grade" ? "회원등급" : "회원상태"}
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <div className="text-[19px] font-medium">{member[kind]}</div>
                      <div className="flex-1" />
                      <div className="text-[14px] text-accent">변경 ›</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <Card>
              <div className="mb-3 flex items-center">
                <SectionLabel>현재 역할</SectionLabel>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => setRoleSheet(true)}
                  className="cursor-pointer text-[14px] text-accent"
                >
                  + 역할 추가
                </button>
              </div>
              {member.roles.length === 0 ? (
                <EmptyState message="부여된 역할이 없습니다." padding="sm" />
              ) : (
                <div className="flex flex-col gap-[9px]">
                  {member.roles.map((r, i) => (
                    <div key={i} className="rounded-[12px] border border-line p-3">
                      <div className="flex items-center gap-2">
                        <div className="text-[16px] font-medium">{r.name}</div>
                        {r.primary && <Pill tone="blue">대표</Pill>}
                        <div className="flex-1" />
                        {!r.to && (
                          <button
                            type="button"
                            onClick={() => endRole(member, r.name)}
                            className="cursor-pointer text-[13.5px] text-n400 hover:text-danger"
                          >
                            종료
                          </button>
                        )}
                      </div>
                      <div className="mt-1 text-[13.5px] text-n500">
                        {r.from} ~ {r.to || "진행중"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <SectionLabel className="mb-3">최근 변경이력</SectionLabel>
              {myHistory.length === 0 ? (
                <div className="text-[14.5px] text-n500">변경 이력이 없습니다</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {myHistory.map((h, i) => (
                    <div key={i} className="flex items-start gap-[10px]">
                      <div className="mt-[7px] size-[5px] flex-none rounded-full bg-accent" />
                      <div className="min-w-0">
                        <div className="text-[14.5px]">
                          {h.type} · {h.from} → {h.to}
                        </div>
                        <div className="mt-[2px] text-[12.5px] text-n500">
                          {h.at} · {h.by}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        <GradeStatusSheet member={member} kind={sheet} onClose={() => setSheet(null)} />
        <RoleSheet member={member} open={roleSheet} onClose={() => setRoleSheet(false)} />
      </PageBody>
    </>
  );
}
