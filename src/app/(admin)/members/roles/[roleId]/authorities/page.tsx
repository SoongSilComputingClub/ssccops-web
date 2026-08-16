import { RoleAuthoritiesPage } from "@/views/role-authorities";

export default async function Page({
  params,
}: PageProps<"/members/roles/[roleId]/authorities">) {
  const { roleId } = await params;
  return <RoleAuthoritiesPage roleId={Number(roleId)} />;
}
