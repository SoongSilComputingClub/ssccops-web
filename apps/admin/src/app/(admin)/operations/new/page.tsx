import { OperationCreatePage } from "@/views/operation-create";
import type { OperTypeCd } from "@/shared/config/codes";

const FIXED_KINDS: OperTypeCd[] = ["WORK", "MEETING"];

export default async function Page({
  searchParams,
}: PageProps<"/operations/new">) {
  const { workId, kind } = await searchParams;
  const fixedKind = FIXED_KINDS.find((cd) => cd === kind);
  return (
    <OperationCreatePage
      workId={typeof workId === "string" ? Number(workId) : undefined}
      kind={fixedKind}
    />
  );
}
