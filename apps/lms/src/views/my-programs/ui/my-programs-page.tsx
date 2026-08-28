import Link from "next/link";
import {
  acdmActvSttsBadge,
  type AcademicProgramSummary,
} from "@/entities/academic-program";
import { loadMyPrograms } from "@/features/academic-program";
import { LoginGate } from "@/features/auth";
import { signupUrl, studioProgramDetailUrl } from "@/shared/config/routes";
import { formatYmd } from "@/shared/lib/date";
import { Badge, EmptyState, Notice } from "@/shared/ui";

/*
 * 내 활동 목록 (`/studio/programs` · #188 · SSR).
 *
 * ── 무엇을 하는 화면인가 ────────────────────────────────────
 * 스터디장/팀장이 자기가 맡은 활동을 한자리에서 훑고, 카드에서 활동 상세로 들어간다.
 * 그전까지는 상단 바의 "내 활동"이 대시보드(`/studio`)로 걸려 있어 두 메뉴가 같은 화면을
 * 열었다 — 대시보드는 진행 중 활동 **하나만** 보여 주므로 다른 활동으로 가는 길이 없었다.
 *
 * ── 왜 SSR인가 ────────────────────────────────────────────
 * 이 앱은 조회 화면을 서버 컴포넌트로 그린다(AGENTS.md · 대시보드·팀원 관리와 같은 규약).
 * 목록은 카드를 눌러 이동만 하므로 클라이언트 훅이 없다.
 *
 * ── 리다이렉트를 하지 않는다 ──────────────────────────────
 * 미로그인·미가입 모두 이 화면 안에서 안내한다(www 규약).
 */

export async function MyProgramsPage() {
  const result = await loadMyPrograms();

  return (
    <div className="flex flex-col gap-[16px]">
      <header className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-medium tracking-[-.3px] lg:text-[24px]">
          내 활동
        </h1>
        <p className="text-[13.5px] text-n500">
          내가 스터디장·팀장으로 맡고 있는 스터디·프로젝트입니다
        </p>
      </header>

      <Body result={result} />
    </div>
  );
}

function Body({ result }: { result: Awaited<ReturnType<typeof loadMyPrograms>> }) {
  if (result.outcome === "unauthenticated") {
    return (
      <LoginGate
        title="로그인이 필요합니다"
        description="내 활동은 로그인한 회원만 볼 수 있습니다 — 구글 계정으로 로그인해 주세요"
      />
    );
  }

  if (result.outcome === "signup-required") {
    const signup = signupUrl();
    return (
      <Notice
        title="회원 가입을 마쳐야 학술 활동 화면을 볼 수 있습니다"
        description="로그인은 되었지만 아직 동아리 회원으로 등록되지 않았습니다."
      >
        {signup && (
          <a
            href={signup}
            className="rounded-xl bg-accent px-[16px] py-[12px] text-[15px] font-semibold text-white hover:bg-accent-strong"
          >
            회원 가입하기
          </a>
        )}
      </Notice>
    );
  }

  if (result.outcome === "error") {
    return (
      <EmptyState title="내 활동을 불러오지 못했습니다" description={result.message} />
    );
  }

  if (result.programs.length === 0) {
    return (
      <EmptyState
        title="맡고 있는 스터디·프로젝트가 없습니다"
        description="기획안이 승인되어 활동이 만들어지고 스터디장·팀장으로 지정되면 이 화면에 나타납니다."
      />
    );
  }

  return (
    <div className="flex flex-col gap-[10px]">
      {result.programs.map((program) => (
        <ProgramCard key={program.academicProgramId} program={program} />
      ))}
    </div>
  );
}

function ProgramCard({ program }: { program: AcademicProgramSummary }) {
  const badge = acdmActvSttsBadge(program.sttsCd);
  const progress = Math.max(0, Math.min(100, Math.round(program.progressRatio)));

  return (
    <Link
      href={studioProgramDetailUrl(program.academicProgramId)}
      className="flex flex-col gap-[10px] rounded-2xl bg-surface p-[16px] shadow-[0_0_0_1px_#e5e8eb] transition-shadow hover:shadow-[0_0_0_1px_#3182f6] lg:p-[18px]"
    >
      <div className="flex flex-wrap items-center gap-x-[8px] gap-y-[4px]">
        <Badge tone={badge.tone}>{badge.label}</Badge>
        <Badge tone="grey">{program.typeCd}</Badge>
        <span className="text-[15px] font-semibold">{program.title || "-"}</span>
      </div>

      <div className="text-[13px] text-n500">
        {formatYmd(program.eventBeginAt)} ~ {formatYmd(program.eventEndAt)}
        {program.leaderName ? ` · 스터디장 ${program.leaderName}` : ""}
      </div>

      {/* 진행 중·수료 활동만 진행 바를 그린다 — 승인 직후(APPROVED)엔 회차가 없어 늘 0% */}
      {program.sttsCd !== "APPROVED" && (
        <div className="flex items-center gap-[10px]">
          <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="w-[38px] text-right text-[13px] text-n500">
            {progress}%
          </span>
        </div>
      )}
    </Link>
  );
}
