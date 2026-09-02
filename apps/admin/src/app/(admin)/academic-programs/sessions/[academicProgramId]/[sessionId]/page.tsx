import { SessionDetailPage } from "@/views/session-detail";

export default async function Page({
  params,
}: PageProps<"/academic-programs/sessions/[academicProgramId]/[sessionId]">) {
  const { academicProgramId, sessionId } = await params;
  return (
    <SessionDetailPage
      academicProgramId={Number(academicProgramId)}
      sessionId={Number(sessionId)}
    />
  );
}
