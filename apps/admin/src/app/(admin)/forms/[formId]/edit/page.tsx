import { FormEditPage } from "@/views/form-edit";

export default async function Page({
  params,
}: Readonly<PageProps<"/forms/[formId]/edit">>) {
  const { formId } = await params;
  return <FormEditPage formId={Number(formId)} />;
}
