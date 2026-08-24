import { FormEditPage } from "@/views/form-edit";

export default async function Page({
  params,
}: PageProps<"/forms/[formId]/edit">) {
  const { formId } = await params;
  return <FormEditPage formId={Number(formId)} />;
}
