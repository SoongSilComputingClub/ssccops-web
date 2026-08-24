import { ResponseDetailPage } from "@/views/response-detail";

export default async function Page({
  params,
}: PageProps<"/forms/[formId]/responses/[formRspnsId]">) {
  const { formId, formRspnsId } = await params;
  return (
    <ResponseDetailPage formId={Number(formId)} formRspnsId={Number(formRspnsId)} />
  );
}
