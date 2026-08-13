import { Sidebar } from "./_shell/sidebar";

export default function AdminLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
