import { ResponseListPage } from "@/views/response-list";

export default async function Page({
  params,
}: PageProps<"/forms/[formId]/responses">) {
  const { formId } = await params;
  return <ResponseListPage formKey={formId} />;
}
