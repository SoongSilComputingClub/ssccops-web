"use client";

import { useRouter } from "next/navigation";
import { cohortText, isGraduate, useMemberStore } from "@/entities/member";
import { useSessionStore } from "@/entities/session";
import { ROUTES } from "@/shared/config/routes";
import { Badge, Button, Card } from "@/shared/ui";

export function SignupCompletePage() {
  const router = useRouter();
  const pendingKey = useSessionStore((s) => s.pendingKey);
  const login = useSessionStore((s) => s.login);
  const logout = useSessionStore((s) => s.logout);
  const setPendingAuthUser = useSessionStore((s) => s.setPendingAuthUser);
  const member = useMemberStore((s) =>
    s.members.find((m) => m.key === (pendingKey ?? "m7")),
  );

  if (!member) return null;

  const rows: [string, string][] = [
    ["회원명", member.name],
    ["구분", member.kind ?? "재학생"],
    ["학생번호", member.sid || "미입력"],
    isGraduate(member)
      ? ["졸업연도", member.gradYear || "미입력"]
      : ["학년", member.year ? `${member.year}학년` : "미입력"],
    ["학과", member.dept || "미입력"],
    [
      "기수",
      cohortText(member) === "미배정" ? "미배정 (운영진 배정)" : cohortText(member),
    ],
    ["연락처", member.phone || "미입력"],
    ["이메일", member.email],
    ["회원등급", member.grade],
    ["회원상태", member.status],
  ];

  return (
    <div className="w-[480px] px-4">
      <Badge tone="grey">임시회원</Badge>
      <h1 className="mt-3 text-[27px] font-medium tracking-[-.4px]">
        회원 가입이 완료되었습니다
      </h1>
      <p className="mt-2 text-[14.5px] leading-[1.6] text-n400">
        임시회원 등급으로 등록되었습니다. 폼 지원과 조회는 지금 바로 가능하며, 활동
        이력이 쌓이면 운영진이 준회원으로 승급합니다.
      </p>
      <Card className="mt-5">
        <div className="grid grid-cols-[90px_1fr] gap-y-[9px] text-[15px]">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <div className="text-[14px] text-n500">{k}</div>
              <div>{v}</div>
            </div>
          ))}
        </div>
      </Card>
      <div className="mt-4 flex gap-2">
        <Button
          variant="ghost"
          onClick={() => {
            void logout().then(() => router.push(ROUTES.login));
          }}
        >
          로그아웃
        </Button>
        <Button
          className="flex-1"
          onClick={() => {
            login(member.key);
            setPendingAuthUser(null);
            router.push(ROUTES.members);
          }}
        >
          시작하기
        </Button>
      </div>
    </div>
  );
}
