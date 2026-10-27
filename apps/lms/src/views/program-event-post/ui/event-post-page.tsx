import Link from "next/link";
import { acdmActvTypeNm } from "@/entities/academic-program";
import { receiptStatusBadge } from "@/entities/form";
import { BackToProgramsNotice, ProgramSignupNotice } from "@/features/academic-program";
import { loadEventPost } from "@/features/academic-program/model/load-event-post";
import { LoginGate } from "@/features/auth";
import { studioProgramDetailUrl } from "@/shared/config/routes";
import { Badge } from "@/shared/ui";
import { EventPostEditor } from "./event-post-editor";

/*
 * 소개 글 편집 (`/studio/programs/{id}/event-post` · #819 · ADR-0069 · 서버 #699).
 *
 * 공개 웹사이트의 프로그램 상세가 보여 주는 행사 게시물을 리더가 고친다 — 제목·본문·대표 이미지·
 * 장소 넷만. 지원서 문항 편집(`views/recruitment-form`)과 같은 뼈대다: SSR 셸이 조회를 끝낸 뒤에만
 * 클라이언트 편집기를 마운트해 `useState` 초깃값이 곧 서버 값이고, 잠기면 감추지 않고 읽기
 * 전용으로 그린다.
 *
 * 잠금과 그 이유는 서버 `isEditable`·`lockReason` 그대로다 — 접수 상태나 프로그램 상태로 화면이
 * 다시 계산하지 않는다(ADR-0069).
 */

export async function ProgramEventPostPage({
  academicProgramId,
}: Readonly<{ academicProgramId: number | null }>) {
  if (academicProgramId == null) {
    return (
      <BackToProgramsNotice
        title="어떤 프로그램의 소개 글인지 알 수 없습니다"
        description="내 프로그램에서 프로그램을 골라주세요."
      />
    );
  }

  const load = await loadEventPost(academicProgramId);

  if (load.outcome === "unauthenticated") {
    return (
      <LoginGate
        title="로그인이 필요합니다"
        description="소개 글은 로그인한 회원만 볼 수 있습니다 — 구글 계정으로 로그인해주세요"
      />
    );
  }
  if (load.outcome === "signup-required") return <ProgramSignupNotice />;
  if (load.outcome === "error") {
    return (
      <BackToProgramsNotice title="소개 글을 불러오지 못했습니다" description={load.message} />
    );
  }

  const { post, program } = load;
  const badge = receiptStatusBadge(post.receiptStatus);

  return (
    <div className="flex flex-col gap-[16px]">
      <Link
        href={studioProgramDetailUrl(academicProgramId)}
        className="-my-1 inline-flex min-h-6 items-center self-start py-1 text-[13.5px] text-n300 hover:text-accent"
      >
        ← 프로그램 상세
      </Link>

      <header className="rounded-[14px] border border-line bg-surface p-[16px]">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={badge.tone}>{badge.label}</Badge>
          {program && <Badge tone="outline">{acdmActvTypeNm(program.typeCd)}</Badge>}
        </div>
        <h1 className="mt-3 break-words text-[22px] font-medium tracking-[-.3px] lg:text-[24px]">
          {program?.title || post.eventTtl || "-"}
        </h1>
        <p className="mt-[2px] text-[13.5px] text-n500">공개 웹사이트에 보이는 프로그램 소개</p>
      </header>

      <EventPostEditor academicProgramId={academicProgramId} initialPost={post} />
    </div>
  );
}
