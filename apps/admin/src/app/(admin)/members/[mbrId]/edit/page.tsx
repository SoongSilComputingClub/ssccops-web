import { MemberEditPage } from "@/views/member-edit";

export default async function Page({
  params,
}: Readonly<PageProps<"/members/[mbrId]/edit">>) {
  const { mbrId } = await params;
  return <MemberEditPage mbrId={Number(mbrId)} />;
}
