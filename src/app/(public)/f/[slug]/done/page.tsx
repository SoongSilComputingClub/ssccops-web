import { PublicFormDonePage } from "@/views/public-form";

export default async function Page({ params }: PageProps<"/f/[slug]/done">) {
  const { slug } = await params;
  return <PublicFormDonePage slug={slug} />;
}
