import { ResponseDetailPage } from "@/views/response-detail";

export default async function Page({
  params,
}: PageProps<"/forms/[formId]/responses/[responseId]">) {
  const { formId, responseId } = await params;
  return <ResponseDetailPage formKey={formId} responseId={responseId} />;
}
