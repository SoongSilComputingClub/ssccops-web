import { MemberEditPage } from "@/views/member-edit";

export default async function Page({
  params,
}: PageProps<"/members/[memberId]/edit">) {
  const { memberId } = await params;
  return <MemberEditPage memberKey={memberId} />;
}
