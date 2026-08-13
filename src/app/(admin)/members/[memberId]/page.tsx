import { MemberDetailPage } from "@/views/member-detail";

export default async function Page({
  params,
}: PageProps<"/members/[memberId]">) {
  const { memberId } = await params;
  return <MemberDetailPage memberKey={memberId} />;
}
