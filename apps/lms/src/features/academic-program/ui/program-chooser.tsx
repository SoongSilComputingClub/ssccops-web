import Link from "next/link";
import { ROUTES } from "@/shared/config/routes";
import { EmptyState, Notice } from "@/shared/ui";

/*
 * 학술 화면(내 활동·회차 기록·출석부·팀원 관리)이 공유하는 안내 블록 (#190 · #192).
 *
 * 활동 선택은 상단 드롭다운(`ProgramSwitcher`)이 맡는다 — 여기 있는 것은 활동을 그릴 수
 * 없는 갈래들(맡은 활동 없음 · 미가입 · 결정 실패)의 공용 문구다. 세 화면이 같은 상황에
 * 같은 문구를 쓰게 한다(#117).
 */

/** 맡은 활동이 하나도 없을 때 */
export function NoProgramNotice() {
  return (
    <EmptyState
      title="맡고 있는 스터디·프로젝트가 없습니다"
      description="기획안이 승인되어 활동이 만들어지고 스터디장·팀장으로 지정되면 이 화면을 쓸 수 있습니다."
    />
  );
}

/** 미가입 안내 */
export function ProgramSignupNotice({ signupHref }: { signupHref: string | null }) {
  return (
    <Notice
      title="회원 가입을 마쳐야 학술 활동 화면을 볼 수 있습니다"
      description="로그인은 되었지만 아직 동아리 회원으로 등록되지 않았습니다."
    >
      {signupHref && (
        <a
          href={signupHref}
          className="rounded-xl bg-accent px-[16px] py-[12px] text-[15px] font-semibold text-white hover:bg-accent-strong"
        >
          회원 가입하기
        </a>
      )}
    </Notice>
  );
}

/** 활동 목록 조회 자체가 실패했을 때 — 내 활동으로 되돌린다 */
export function BackToProgramsNotice({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Notice title={title} description={description}>
      <Link
        href={ROUTES.studioPrograms}
        className="rounded-xl bg-accent px-[16px] py-[12px] text-[15px] font-semibold text-white hover:bg-accent-strong"
      >
        내 활동으로
      </Link>
    </Notice>
  );
}
