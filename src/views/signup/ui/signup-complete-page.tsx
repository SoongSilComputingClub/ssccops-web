"use client";

import { useRouter } from "next/navigation";
import { genNoText, mbrGrdNm, mbrSttsNm, useMbrStore } from "@/entities/member";
import { useSessionStore } from "@/entities/session";
import { ROUTES } from "@/shared/config/routes";
import { Badge, Button, Card } from "@/shared/ui";

export function SignupCompletePage() {
  const router = useRouter();
  const pendingMbrId = useSessionStore((s) => s.pendingMbrId);
  const login = useSessionStore((s) => s.login);
  const logout = useSessionStore((s) => s.logout);
  const setPendingAuthUser = useSessionStore((s) => s.setPendingAuthUser);
  const mbr = useMbrStore((s) =>
    s.mbrs.find((m) => m.mbrId === pendingMbrId) ?? s.mbrs.at(-1),
  );

  if (!mbr) return null;

  const genText = genNoText(mbr);
  const rows: [string, string][] = [
    ["회원_명", mbr.mbrNm],
    ["학생_번호", mbr.stdntNo || "미입력"],
    ["학년_번호", mbr.scyrNo ? `${mbr.scyrNo}학년` : "미입력"],
    ["학과_명", mbr.scsbjtNm || "미입력"],
    ["기수_번호", genText === "미배정" ? "미배정 (운영진 배정)" : genText],
    ["전화번호", mbr.telno || "미입력"],
    ["이메일", mbr.eml ?? "미입력"],
    ["회원_등급", mbrGrdNm(mbr.mbrGrdCd)],
    ["회원_상태", mbrSttsNm(mbr.mbrSttsCd)],
  ];

  return (
    <div className="w-[480px] px-4">
      <Badge tone="grey">{mbrGrdNm(mbr.mbrGrdCd)}</Badge>
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
            login(mbr.mbrId);
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
