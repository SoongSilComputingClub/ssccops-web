import { ProposalReviewDetailPage } from "@/views/proposal-review";

export default async function Page({
  params,
}: Readonly<PageProps<"/proposals/review/[formRspnsId]">>) {
  const { formRspnsId } = await params;
  return <ProposalReviewDetailPage formRspnsId={Number(formRspnsId)} />;
}
