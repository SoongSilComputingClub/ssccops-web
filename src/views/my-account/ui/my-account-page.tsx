"use client";

import { mbrGrdTone, mbrSttsTone } from "@/entities/member";
import { representativeRole, useSessionStore } from "@/entities/session";
import {
  Badge,
  Card,
  KeyValueGrid,
  PageBody,
  PageHeader,
  SectionLabel,
} from "@/shared/ui";

/**
 * 내 계정 — 서버 세션(GET /v1/auth/session)의 회원 정보를 그대로 보여준다.
 *
 * 예전에는 목 회원 스토어에서 세션 mbrId로 찾아 화면에서 바로 수정까지 했는데, 그 수정은
 * 새로고침하면 사라지는 목 조작이었다. 프로필 수정 API가 생기기 전까지는 조회만 연다 —
 * 저장되지 않는 입력창을 열어 두는 편이 더 오해를 부른다.
 */
export function MyAccountPage() {
  const member = useSessionStore((s) => s.member);

  // AuthGate가 ready일 때만 이 화면이 열리므로 member는 사실상 항상 있다
  if (!member) return null;

  const genText = member.generationNumber ? `${member.generationNumber}기` : "미배정";
  const role = representativeRole(member);

  return (
    <>
      <PageHeader title="내 계정" subtitle="프로필" />
      <PageBody>
        <Card className="mb-4">
          <div className="flex items-center gap-[10px]">
            <div className="text-[25px] font-medium">{member.name}</div>
            <Badge tone={mbrGrdTone(member.membershipGradeCode)}>
              {member.membershipGradeName}
            </Badge>
            <Badge tone={mbrSttsTone(member.membershipStatusCode)}>
              {member.membershipStatusName}
            </Badge>
            <div className="flex-1" />
            <div className="text-[14px] text-n500">
              회원 #{member.memberId} · {genText} ·{" "}
              {member.departmentName || "학과 미입력"}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-[1.15fr_1fr] items-start gap-4">
          <Card>
            <SectionLabel className="mb-3">회원 정보</SectionLabel>
            <KeyValueGrid
              items={[
                { k: "회원_명", v: member.name },
                { k: "학생_번호", v: member.studentNumber || "미입력" },
                {
                  k: "학년_번호",
                  v: member.academicYear ? `${member.academicYear}학년` : "미입력",
                },
                { k: "학과_명", v: member.departmentName || "미입력" },
                { k: "전화번호", v: member.phoneNumber || "미입력" },
                { k: "이메일", v: member.email || "미입력" },
              ]}
            />
            <div className="mt-4 text-[13px] text-n500">
              프로필 수정은 회원 API 연동 이후에 열립니다.
            </div>
          </Card>

          <Card>
            <SectionLabel className="mb-3">운영진만 변경할 수 있는 항목</SectionLabel>
            <KeyValueGrid
              items={[
                {
                  k: "기수_번호",
                  v: genText === "미배정" ? "미배정 · 운영진이 배정합니다" : genText,
                },
                {
                  k: "회원_등급",
                  v: (
                    <Badge tone={mbrGrdTone(member.membershipGradeCode)}>
                      {member.membershipGradeName}
                    </Badge>
                  ),
                },
                {
                  k: "회원_상태",
                  v: (
                    <Badge tone={mbrSttsTone(member.membershipStatusCode)}>
                      {member.membershipStatusName}
                    </Badge>
                  ),
                },
                { k: "현재_역할", v: role ? role.roleName : "없음" },
                { k: "가입_일자", v: member.joinDate },
              ]}
            />
          </Card>
        </div>
      </PageBody>
    </>
  );
}
