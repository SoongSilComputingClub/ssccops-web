import { memberRoleBadge, ptcpSttsBadge, type AcademicProgramMember } from "@/entities/academic-program";
import { formatYmd } from "@/shared/lib/date";
import { Badge } from "@/shared/ui";

/*
 * 팀원 한 줄 (#131).
 *
 * 데스크톱(lg 이상)에서는 표의 한 행, lg 미만에서는 카드로 그린다 — 이 앱의 반응형 경계는
 * `lg` 하나다(AGENTS.md). 열이 넷뿐이라 카드에서도 다 보여 준다(숨기는 열 없음).
 *
 * 이름이 비어 있으면 "-"로 그린다 — 이 자리(뷰)가 표시 규칙을 정한다. 변환기(`toMember`)는
 * 빈 문자열을 그대로 두어 "값이 없다"와 "서버가 -를 줬다"를 섞지 않는다.
 * 합류일도 값이 없으면 그 칸을 비운다("미정" 같은 문구를 만들어 넣지 않는다).
 */

export function MemberRowDesktop({ member }: { member: AcademicProgramMember }) {
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
    </tr>
  );
}

export function MemberCardMobile({ member }: { member: AcademicProgramMember }) {
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
    </div>
  );
}
