import { OperationCreatePage } from "@/views/operation-create";

export default async function Page({
  searchParams,
}: PageProps<"/operations/new">) {
  const { parent } = await searchParams;
  return (
    <OperationCreatePage parent={typeof parent === "string" ? parent : undefined} />
  );
}
