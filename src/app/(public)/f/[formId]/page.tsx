import { PublicFormPage } from "@/views/public-form";

export default async function Page({ params }: PageProps<"/f/[formId]">) {
  const { formId } = await params;
  return <PublicFormPage formId={Number(formId)} />;
}
