import { FormDetailPage } from "@/views/form-detail";

export default async function Page({ params }: Readonly<PageProps<"/forms/[formId]">>) {
  const { formId } = await params;
  return <FormDetailPage formId={Number(formId)} />;
}
