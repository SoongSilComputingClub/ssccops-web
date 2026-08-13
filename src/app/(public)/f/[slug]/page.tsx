import { PublicFormPage } from "@/views/public-form";

export default async function Page({ params }: PageProps<"/f/[slug]">) {
  const { slug } = await params;
  return <PublicFormPage slug={slug} />;
}
