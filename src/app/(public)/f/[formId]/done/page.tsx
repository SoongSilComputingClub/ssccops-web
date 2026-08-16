import { PublicFormDonePage } from "@/views/public-form";

export default async function Page({ params }: PageProps<"/f/[formId]/done">) {
  const { formId } = await params;
  return <PublicFormDonePage formId={Number(formId)} />;
}
