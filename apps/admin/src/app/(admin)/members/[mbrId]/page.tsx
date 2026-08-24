import { MemberDetailPage } from "@/views/member-detail";

export default async function Page({ params }: PageProps<"/members/[mbrId]">) {
  const { mbrId } = await params;
  return <MemberDetailPage mbrId={Number(mbrId)} />;
}
