import type { ReactNode } from "react";
import type { AcademicProgramMember } from "@/entities/academic-program";
/*
 * 배럴이 아니라 표시 모듈에서 직접 가져온다 — 이 줄은 클라이언트 컴포넌트(`MembersManager` · #742)가
 * 그리고, 배럴은 서버 전용 조회(`next/headers`)를 품는다(값을 가져가면 클라 번들로 끌려온다).
 */
import { memberRoleBadge, ptcpSttsBadge } from "@/entities/academic-program/model/display";
import { formatYmd } from "@/shared/lib/date";
import { Badge } from "@/shared/ui";

/*
 * 팀원 한 줄 (#131 · 동작 칸 #742).
 *
 * 데스크톱(lg 이상)에서는 표의 한 행, lg 미만에서는 카드로 그린다 — 이 앱의 반응형 경계는
 * `lg` 하나다(AGENTS.md). 열이 넷뿐이라 카드에서도 다 보여 준다(숨기는 열 없음).
 *
 * 동작(`actions`)은 부르는 쪽이 정해 넘긴다 — 무엇을 누를 수 있는지는 상태와 서버 `isEditable`에
 * 달려 있고 그 판단은 `MembersManager` 한 곳에 둔다. 넘기지 않으면(`undefined`) 동작 칸이 없다.
 *
 * 이름이 비어 있으면 "-"로 그린다 — 이 자리(뷰)가 표시 규칙을 정한다. 변환기(`toMember`)는
 * 빈 문자열을 그대로 두어 "값이 없다"와 "서버가 -를 줬다"를 섞지 않는다.
 * 합류일도 값이 없으면 그 칸을 비운다("미정" 같은 문구를 만들어 넣지 않는다).
 */

export function MemberRowDesktop({
  member,
  actions,
}: Readonly<{ member: AcademicProgramMember; actions?: ReactNode }>) {
  const role = memberRoleBadge(member.isLeader);
  const status = ptcpSttsBadge(member.ptcpSttsCd);
  const joined = formatYmd(member.joinedAt);

  return (
    <tr className="border-t border-line">
      <td className="px-[12px] py-[13px] text-[14.5px] font-medium text-ink">
        {member.memberName || "-"}
      </td>
      <td className="px-[12px] py-[13px]">
        <Badge tone={role.tone}>{role.label}</Badge>
      </td>
      <td className="px-[12px] py-[13px] text-[14px] text-n400">{joined || "—"}</td>
      <td className="px-[12px] py-[13px]">
        <Badge tone={status.tone}>{status.label}</Badge>
      </td>
      {actions !== undefined && (
        <td className="px-[12px] py-[10px]">
          <div className="flex justify-end gap-[6px]">{actions}</div>
        </td>
      )}
    </tr>
  );
}

export function MemberCardMobile({
  member,
  actions,
}: Readonly<{ member: AcademicProgramMember; actions?: ReactNode }>) {
  const role = memberRoleBadge(member.isLeader);
  const status = ptcpSttsBadge(member.ptcpSttsCd);
  const joined = formatYmd(member.joinedAt);

  return (
    <div className="flex flex-col gap-[8px] border-t border-line px-[4px] py-[14px] first:border-t-0">
      <div className="flex items-center justify-between gap-[8px]">
        <span className="text-[15px] font-medium text-ink">{member.memberName || "-"}</span>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <div className="flex items-center gap-[8px] text-[13px] text-n500">
        <Badge tone={role.tone}>{role.label}</Badge>
        {joined && <span>합류 {joined}</span>}
      </div>
      {actions !== undefined && <div className="flex flex-wrap gap-[6px]">{actions}</div>}
    </div>
  );
}
