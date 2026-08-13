import { FormDetailPage } from "@/views/form-detail";

export default async function Page({ params }: PageProps<"/forms/[formId]">) {
  const { formId } = await params;
  return <FormDetailPage formKey={formId} />;
}
