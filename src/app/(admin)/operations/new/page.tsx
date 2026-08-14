import { OperationCreatePage } from "@/views/operation-create";

export default async function Page({
  searchParams,
}: PageProps<"/operations/new">) {
  const { workId } = await searchParams;
  return (
    <OperationCreatePage
      workId={typeof workId === "string" ? Number(workId) : undefined}
    />
  );
}
