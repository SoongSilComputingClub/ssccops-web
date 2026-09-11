import { FormTemplateEditPage } from "@/views/form-template-edit";

export default async function Page({
  params,
}: Readonly<PageProps<"/forms/templates/[formTmplId]/edit">>) {
  const { formTmplId } = await params;
  return <FormTemplateEditPage formTmplId={Number(formTmplId)} />;
}
