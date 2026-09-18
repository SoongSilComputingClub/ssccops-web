import { ContentPostEditPage } from "@/views/content-post-edit";

export default async function Page({
  params,
}: Readonly<PageProps<"/content/posts/[postId]/edit">>) {
  const { postId } = await params;
  return <ContentPostEditPage postId={Number(postId)} />;
}
