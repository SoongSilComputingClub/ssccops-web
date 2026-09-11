import { ResponseListPage } from "@/views/response-list";

export default async function Page({
  params,
}: Readonly<PageProps<"/forms/[formId]/responses">>) {
  const { formId } = await params;
  return <ResponseListPage formId={Number(formId)} />;
}
