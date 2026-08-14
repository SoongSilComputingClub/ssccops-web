"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { mbrGrdTone } from "@/entities/member";
import { useSessionStore } from "@/entities/session";
import { ROUTES } from "@/shared/config/routes";
import { safeNextPath } from "@/shared/lib/next-path";
import { Badge, Button, Card, flash } from "@/shared/ui";

/**
 * 가입 완료 — 서버가 가입 응답으로 내려준 회원 정보를 그대로 보여준다.
 *
 * 예전에는 목 회원 목록에서 `find(...) ?? mbrs.at(-1)`로 찾아, 식별자가 유실되면 남의 정보
 * (목록의 마지막 회원)를 가입 완료 화면에 렌더링했다. 이제 방금 가입한 회원이 없으면
 * 아무것도 짐작하지 않고 대시보드로 비켜 준다 — 새로고침 뒤라면 서버 세션이 정본이므로
 * AuthGate가 가입 여부에 맞는 화면(대시보드 또는 /signup)으로 다시 보내 준다.
 */
export function SignupCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const signupResult = useSessionStore((s) => s.signupResult);
  const applySignupResult = useSessionStore((s) => s.applySignupResult);
  const logout = useSessionStore((s) => s.logout);

  /*
   * 이 화면을 떠날 곳. 공개 폼 링크(/f/{formId})로 들어와 가입까지 온 사람은 여기가
   * 종착지가 아니라 경유지다 — 원래 열려던 폼으로 돌려보내야 흐름이 닫힌다.
   * next가 없으면(직접 /signup으로 온 일반 가입) 예전대로 대시보드다.
   */
  const destination = safeNextPath(searchParams.get("next"), ROUTES.dashboard);

  useEffect(() => {
    if (!signupResult) router.replace(destination);
  }, [signupResult, router, destination]);

  if (!signupResult) return null;

  const member = signupResult;
  const genText = member.generationNumber ? `${member.generationNumber}기` : "미배정";
  const rows: [string, string][] = [
    ["회원_명", member.name],
    ["학생_번호", member.studentNumber || "미입력"],
    ["학년_번호", member.academicYear ? `${member.academicYear}학년` : "미입력"],
    ["학과_명", member.departmentName || "미입력"],
    ["기수_번호", genText === "미배정" ? "미배정 (운영진 배정)" : genText],
    ["전화번호", member.phoneNumber || "미입력"],
    ["이메일", member.email || "미입력"],
    // 등급·상태 명칭은 서버가 준 것을 쓴다 — 기준정보에서 이름을 바꿔도 화면이 따라간다
    ["회원_등급", member.membershipGradeName],
    ["회원_상태", member.membershipStatusName],
  ];

  return (
    <div className="w-[480px] px-4">
      <Badge tone={mbrGrdTone(member.membershipGradeCode)}>{member.membershipGradeName}</Badge>
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
        {/*
         * 기본 목적지는 회원 목록이 아니라 대시보드다. 임시회원에게 첫 화면으로 회원 명부를
         * 여는 것은 로그인 기본 진입(ROUTES.dashboard)과도 어긋나고, 방금 가입한 사람이
         * 가장 먼저 볼 것은 남의 명부가 아니라 자기 할 일이다.
         *
         * 다만 ?next= 로 들어왔다면 그쪽이 우선이다 — 폼에 응답하러 온 사람에게 대시보드는
         * 자기 할 일이 아니라 중간에 끼어든 화면이다.
         */}
        <Button
          className="flex-1"
          onClick={() => {
            applySignupResult();
            router.replace(destination);
          }}
        >
          {destination.startsWith("/f/")
            ? "폼으로 돌아가기"
            : destination === ROUTES.dashboard
              ? "시작하기"
              : "돌아가서 이어하기"}
        </Button>
      </div>
    </div>
  );
}
