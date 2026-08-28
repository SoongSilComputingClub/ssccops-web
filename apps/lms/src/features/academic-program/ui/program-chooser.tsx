import Link from "next/link";
import {
  acdmActvSttsBadge,
  type AcademicProgramSummary,
} from "@/entities/academic-program";
import { ROUTES } from "@/shared/config/routes";
import { Badge, EmptyState, Notice } from "@/shared/ui";

/*
 * 활동 선택 목록 (#190).
 *
 * 회차 기록·출석부·팀원 관리를 활동 특정 없이 열었고 스터디장이 **여러 활동**을 맡은 경우,
 * 이 목록에서 활동을 고르면 그 화면이 `?programId=`가 붙은 주소로 다시 열린다. 활동을 하나만
 * 맡았으면 화면이 자동으로 그 활동을 쓰므로 이 컴포넌트는 나오지 않는다(`resolveProgram`).
 *
 * `hrefFor`를 받는 것은 화면마다 목적지가 다르기 때문이다 — 출석부는 `/studio/roster`,
 * 팀원 관리는 `/studio/members`로 각자 잇는다.
 */
export function ProgramChooser({
  programs,
  hrefFor,
  prompt,
}: {
  programs: AcademicProgramSummary[];
  hrefFor: (academicProgramId: number) => string;
  /** 목록 위에 서는 한 줄 안내 — "어느 활동의 출석부를 볼지 고르세요" 류 */
  prompt: string;
}) {
  return (
    <div className="flex flex-col gap-[12px]">
      <p className="text-[14px] text-n400">{prompt}</p>
      <div className="flex flex-col gap-[10px]">
        {programs.map((program) => {
          const badge = acdmActvSttsBadge(program.sttsCd);
          return (
            <Link
              key={program.academicProgramId}
              href={hrefFor(program.academicProgramId)}
              className="flex items-center gap-[10px] rounded-2xl bg-surface p-[16px] shadow-[0_0_0_1px_#e5e8eb] transition-shadow hover:shadow-[0_0_0_1px_#3182f6]"
            >
              <Badge tone={badge.tone}>{badge.label}</Badge>
              <Badge tone="grey">{program.typeCd}</Badge>
              <span className="min-w-0 flex-1 text-[15px] font-medium">
                {program.title || "-"}
              </span>
              <span className="flex-none text-[13px] text-n500">열기 →</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** 맡은 활동이 하나도 없을 때 — 세 화면이 같은 문구를 쓴다(#117 "같은 상황에는 같은 문구") */
export function NoProgramNotice() {
  return (
    <EmptyState
      title="맡고 있는 스터디·프로젝트가 없습니다"
      description="기획안이 승인되어 활동이 만들어지고 스터디장·팀장으로 지정되면 이 화면을 쓸 수 있습니다."
    />
  );
}

/** 미가입 안내 — 세 화면 공용(#117) */
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

/** 내 활동 목록으로 돌아가는 안내 — 결정에 실패했을 때의 마지막 갈래 */
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
