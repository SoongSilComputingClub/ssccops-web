import { ContentPageEditPage } from "@/views/content-page-edit";

export default async function Page({
  params,
}: Readonly<PageProps<"/content/pages/[pageId]/edit">>) {
  const { pageId } = await params;
  return <ContentPageEditPage pageId={Number(pageId)} />;
}
