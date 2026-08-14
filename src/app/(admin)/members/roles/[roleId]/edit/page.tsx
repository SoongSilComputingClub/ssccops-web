import { RoleEditPage } from "@/views/role-edit";

export default async function Page({
  params,
}: PageProps<"/members/roles/[roleId]/edit">) {
  const { roleId } = await params;
  return <RoleEditPage roleId={Number(roleId)} />;
}
