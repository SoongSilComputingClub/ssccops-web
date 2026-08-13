import { TaskDetailPage } from "@/views/task-detail";

export default async function Page({
  params,
}: PageProps<"/operations/sub-works/[taskId]">) {
  const { taskId } = await params;
  return <TaskDetailPage taskId={taskId} />;
}
