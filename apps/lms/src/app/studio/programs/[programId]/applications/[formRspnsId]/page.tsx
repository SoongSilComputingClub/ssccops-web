import type { Metadata } from "next";
import { RecruitmentApplicationPage } from "@/views/recruitment-application";

/**
 * /studio/programs/{programId}/applications/{formRspnsId} — 지원서 한 건(읽기 전용) (#826 · ssccops#625).
 *
 * 두 번호가 다 숫자여야 한다. 아니면 null로 넘겨 뷰가 안내를 그린다. 다른 프로그램의 응답 번호는
 * 서버가 404로 끊는다(폼 번호는 주소에 없다 — 서버가 프로그램으로 폼을 찾는다).
 */
export const metadata: Metadata = {
  title: "지원서",
};

function toId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export default async function Page({
  params,
}: Readonly<PageProps<"/studio/programs/[programId]/applications/[formRspnsId]">>) {
  const { programId, formRspnsId } = await params;
  return (
    <RecruitmentApplicationPage
      academicProgramId={toId(programId)}
      formRspnsId={toId(formRspnsId)}
    />
  );
}
