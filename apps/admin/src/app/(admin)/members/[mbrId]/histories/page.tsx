import { MemberHistoryPage } from "@/views/member-history";

export default async function Page({ params }: PageProps<"/members/[mbrId]/histories">) {
  const { mbrId } = await params;
  return <MemberHistoryPage mbrId={Number(mbrId)} />;
}
