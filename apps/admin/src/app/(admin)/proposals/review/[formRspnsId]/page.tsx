import { ProposalReviewDetailPage } from "@/views/proposal-review";

export default async function Page({
  params,
}: PageProps<"/proposals/review/[formRspnsId]">) {
  const { formRspnsId } = await params;
  return <ProposalReviewDetailPage formRspnsId={Number(formRspnsId)} />;
}
