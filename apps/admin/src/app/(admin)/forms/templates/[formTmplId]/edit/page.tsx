import { FormTemplateEditPage } from "@/views/form-template-edit";

export default async function Page({
  params,
}: PageProps<"/forms/templates/[formTmplId]/edit">) {
  const { formTmplId } = await params;
  return <FormTemplateEditPage formTmplId={Number(formTmplId)} />;
}
